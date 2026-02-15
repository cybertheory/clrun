import * as path from 'path';
import * as fs from 'fs';
import { fork } from 'child_process';
import { resolveProjectRoot, ensureClrunDirs } from '../utils/paths';
import { success, fail, sessionHints } from '../utils/output';
import { acquireLock } from '../runtime/lock-manager';
import { recoverSessions } from '../runtime/crash-recovery';
import { generateTerminalId, readSession } from '../pty/pty-manager';
import { initQueue } from '../queue/queue-engine';
import { tailBuffer } from '../buffer/buffer-manager';
import { installSkills } from '../skills/skill-installer';
import { logEvent } from '../ledger/ledger';

export async function runCommand(command: string): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const cwd = process.cwd();

  // Ensure directories exist
  ensureClrunDirs(projectRoot);

  // Acquire or attach to runtime
  acquireLock(projectRoot);

  // Run crash recovery
  recoverSessions(projectRoot);

  // Install skills on first init
  installSkills(projectRoot);

  // Generate terminal ID
  const terminalId = generateTerminalId();

  // Initialize queue
  initQueue(terminalId, projectRoot);

  // Find the worker script
  const workerScript = path.join(__dirname, '..', 'worker.js');
  const workerScriptTs = path.join(__dirname, '..', 'worker.ts');
  const script = fs.existsSync(workerScript) ? workerScript : workerScriptTs;

  // Spawn detached worker process
  try {
    const child = fork(script, [terminalId, command, cwd, projectRoot], {
      detached: true,
      stdio: 'ignore',
      execArgv: script.endsWith('.ts') ? ['--import', 'tsx'] : [],
    });

    child.unref();

    logEvent('session.created', projectRoot, terminalId, {
      command,
      cwd,
      worker_pid: child.pid,
    });

    // ── Wait for initial output (up to 5s) ──────────────────────────────
    const maxWait = 5000;
    const poll = 150;
    let elapsed = 0;
    let outputLines: string[] = [];
    let sessionStatus = 'running';
    let exitCode: number | null = null;

    while (elapsed < maxWait) {
      await new Promise((r) => setTimeout(r, poll));
      elapsed += poll;

      outputLines = tailBuffer(terminalId, 50, projectRoot);

      // Check if the process already exited (fast commands like echo)
      const sess = readSession(terminalId, projectRoot);
      if (sess) {
        sessionStatus = sess.status;
        exitCode = sess.last_exit_code;
      }

      if (sess && sess.status === 'exited') {
        // Grab final output
        outputLines = tailBuffer(terminalId, 50, projectRoot);
        break;
      }

      if (outputLines.length > 0) {
        // Got some output — wait a bit more for it to settle
        await new Promise((r) => setTimeout(r, 300));
        outputLines = tailBuffer(terminalId, 50, projectRoot);

        // Re-check status
        const updated = readSession(terminalId, projectRoot);
        if (updated) {
          sessionStatus = updated.status;
          exitCode = updated.last_exit_code;
        }
        break;
      }
    }

    // ── Build response ──────────────────────────────────────────────────
    const output = outputLines.length > 0
      ? outputLines.map((l) => l.replace(/\r$/, '')).join('\n')
      : null;

    const response: Record<string, unknown> = {
      terminal_id: terminalId,
      command,
      cwd,
      status: sessionStatus,
    };

    if (exitCode !== null) {
      response.exit_code = exitCode;
    }

    if (output) {
      response.output = output;
    }

    // Only show interaction hints if session is still running
    if (sessionStatus === 'running') {
      response.hints = sessionHints(terminalId);
    }

    success(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    fail(`Failed to spawn session: ${message}`);
  }
}
