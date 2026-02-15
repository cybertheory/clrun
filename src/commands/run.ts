import * as path from 'path';
import * as fs from 'fs';
import { fork } from 'child_process';
import { resolveProjectRoot, ensureClrunDirs } from '../utils/paths';
import { success, fail, sessionHints, cleanOutput } from '../utils/output';
import { acquireLock } from '../runtime/lock-manager';
import { recoverSessions } from '../runtime/crash-recovery';
import { generateTerminalId, readSession } from '../pty/pty-manager';
import { initQueue } from '../queue/queue-engine';
import { getBufferSize, readBufferSince } from '../buffer/buffer-manager';
import { installSkills } from '../skills/skill-installer';
import { logEvent } from '../ledger/ledger';
import { validateCommand, checkOutputQuality } from '../utils/validate';

export async function runCommand(command: string): Promise<void> {
  const projectRoot = resolveProjectRoot();
  // Use the caller's actual working directory so the terminal starts
  // where the agent (or user) currently is.
  const cwd = process.cwd();

  // ── Validate command ──────────────────────────────────────────────────
  const cmdCheck = validateCommand(command);

  if (!command.trim()) {
    fail({
      error: 'No command provided.',
      hints: {
        example: "clrun echo 'hello world'",
        interactive: "clrun 'python3 script.py'",
        usage: 'clrun <command>',
      },
    });
  }

  // Ensure directories exist
  ensureClrunDirs(projectRoot);
  acquireLock(projectRoot);
  recoverSessions(projectRoot);
  installSkills(projectRoot);

  const terminalId = generateTerminalId();
  initQueue(terminalId, projectRoot);

  // Find the worker script
  const workerScript = path.join(__dirname, '..', 'worker.js');
  const workerScriptTs = path.join(__dirname, '..', 'worker.ts');
  const script = fs.existsSync(workerScript) ? workerScript : workerScriptTs;

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

    // ── Wait for initial output (up to 5s) ────────────────────────────
    const bufferStart = getBufferSize(terminalId, projectRoot);
    const maxWait = 5000;
    const poll = 150;
    let elapsed = 0;
    let sessionStatus = 'running';
    let exitCode: number | null = null;

    while (elapsed < maxWait) {
      await new Promise((r) => setTimeout(r, poll));
      elapsed += poll;

      const currentSize = getBufferSize(terminalId, projectRoot);
      const hasNewOutput = currentSize > bufferStart;

      const sess = readSession(terminalId, projectRoot);
      if (sess) {
        sessionStatus = sess.status;
        exitCode = sess.last_exit_code;
      }

      if (sess && sess.status === 'exited') {
        break;
      }

      if (hasNewOutput) {
        await new Promise((r) => setTimeout(r, 300));
        const updated = readSession(terminalId, projectRoot);
        if (updated) {
          sessionStatus = updated.status;
          exitCode = updated.last_exit_code;
        }
        break;
      }
    }

    // ── Build response with assertions ────────────────────────────────
    const newLines = readBufferSince(terminalId, bufferStart, projectRoot);
    const rawOutput = cleanOutput(newLines, command);
    const { output, warnings: outputWarnings } = checkOutputQuality(rawOutput, 'run response');

    const allWarnings = [...cmdCheck.warnings, ...outputWarnings];

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

    if (allWarnings.length > 0) {
      response.warnings = allWarnings;
    }

    // Contextual hints based on outcome
    if (sessionStatus === 'running') {
      response.hints = {
        ...sessionHints(terminalId),
        note: 'Session is running. Use single quotes for shell variables: clrun <id> \'echo $VAR\'',
      };
    } else if (sessionStatus === 'exited' && exitCode !== 0) {
      response.hints = {
        read_full_output: `clrun tail ${terminalId} --lines 100`,
        start_new: 'clrun <command>',
        note: `Command exited with code ${exitCode}. Check output for errors.`,
      };
    }

    success(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    fail({
      error: `Failed to spawn session: ${message}`,
      hints: {
        check_node_pty: 'Ensure node-pty is installed: npm install node-pty',
        check_permissions: 'Run: chmod +x node_modules/node-pty/prebuilds/*/spawn-helper',
      },
    });
  }
}
