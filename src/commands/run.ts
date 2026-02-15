import * as path from 'path';
import { fork } from 'child_process';
import { resolveProjectRoot, ensureClrunDirs } from '../utils/paths';
import { success, fail } from '../utils/output';
import { acquireLock } from '../runtime/lock-manager';
import { recoverSessions } from '../runtime/crash-recovery';
import { generateTerminalId } from '../pty/pty-manager';
import { initQueue } from '../queue/queue-engine';
import { installSkills } from '../skills/skill-installer';
import { logEvent } from '../ledger/ledger';

export async function runCommand(command: string): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const cwd = process.cwd();

  // Ensure directories exist
  ensureClrunDirs(projectRoot);

  // Acquire or attach to runtime
  const lock = acquireLock(projectRoot);

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
  // In development with tsx, use the .ts version
  const workerScriptTs = path.join(__dirname, '..', 'worker.ts');
  const fs = require('fs');
  const script = fs.existsSync(workerScript) ? workerScript : workerScriptTs;

  // Spawn detached worker process
  try {
    const child = fork(script, [terminalId, command, cwd, projectRoot], {
      detached: true,
      stdio: 'ignore',
      // When running via tsx, we need to use the same Node options
      execArgv: script.endsWith('.ts') ? ['--import', 'tsx'] : [],
    });

    child.unref();

    const workerPid = child.pid;

    logEvent('session.created', projectRoot, terminalId, {
      command,
      cwd,
      worker_pid: workerPid,
    });

    // Give the worker a moment to initialize the session file
    await new Promise((resolve) => setTimeout(resolve, 300));

    success({
      terminal_id: terminalId,
      command,
      cwd,
      status: 'running',
      worker_pid: workerPid,
      runtime: lock.message,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    fail(`Failed to spawn worker: ${message}`);
  }
}
