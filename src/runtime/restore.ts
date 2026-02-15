import * as path from 'path';
import * as fs from 'fs';
import { fork } from 'child_process';
import { readSession } from '../pty/pty-manager';
import { tailBuffer } from '../buffer/buffer-manager';
import { logEvent } from '../ledger/ledger';

/**
 * Restore a suspended session by spawning a new worker with --restore.
 * Waits for the worker to initialize and returns when ready.
 */
export async function restoreSession(
  terminalId: string,
  projectRoot: string
): Promise<void> {
  const session = readSession(terminalId, projectRoot);
  if (!session || session.status !== 'suspended') {
    throw new Error(`Session ${terminalId} is not suspended`);
  }

  // Prefer saved cwd, fall back to the session's original cwd.
  const restoredCwd = session.saved_state?.cwd ?? session.cwd;

  // Find the worker script
  const workerScript = path.join(__dirname, '..', 'worker.js');
  const workerScriptTs = path.join(__dirname, '..', 'worker.ts');
  const script = fs.existsSync(workerScript) ? workerScript : workerScriptTs;

  const child = fork(
    script,
    [terminalId, session.command, restoredCwd, projectRoot, '--restore'],
    {
      detached: true,
      stdio: 'ignore',
      execArgv: script.endsWith('.ts') ? ['--import', 'tsx'] : [],
    }
  );

  child.unref();

  logEvent('session.restored', projectRoot, terminalId, {
    worker_pid: child.pid,
    restored_cwd: restoredCwd,
  });

  // Wait for the worker to come up and the session to become running
  const maxWait = 3000;
  const poll = 100;
  let elapsed = 0;

  while (elapsed < maxWait) {
    await new Promise((r) => setTimeout(r, poll));
    elapsed += poll;

    const updated = readSession(terminalId, projectRoot);
    if (updated && updated.status === 'running' && updated.worker_pid !== session.worker_pid) {
      return; // Worker is up
    }
  }
}
