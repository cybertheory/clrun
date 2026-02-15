import { resolveProjectRoot } from '../utils/paths';
import { success, fail } from '../utils/output';
import { readSession, isPtyAlive } from '../pty/pty-manager';
import { enqueueInput, enqueueOverride, pendingCount } from '../queue/queue-engine';
import { logEvent } from '../ledger/ledger';

export async function inputCommand(
  terminalId: string,
  input: string,
  options: { priority?: number; override?: boolean }
): Promise<void> {
  const projectRoot = resolveProjectRoot();

  // Verify session exists
  const session = readSession(terminalId, projectRoot);
  if (!session) {
    fail(`Session not found: ${terminalId}`);
  }

  // Verify session is running
  if (session!.status !== 'running') {
    fail(`Session is not running (status: ${session!.status})`);
  }

  // Verify worker is alive
  if (!isPtyAlive(session!.worker_pid)) {
    fail(`Session worker is not alive (PID: ${session!.worker_pid})`);
  }

  if (options.override) {
    // Override mode
    const { entry, cancelled } = enqueueOverride(terminalId, input, projectRoot);

    logEvent('input.override', projectRoot, terminalId, {
      queue_id: entry.queue_id,
      input,
      cancelled_count: cancelled,
    });

    // Signal worker for immediate processing
    try {
      process.kill(session!.worker_pid, 'SIGUSR1');
    } catch {
      // Worker may have exited
    }

    success({
      queue_id: entry.queue_id,
      terminal_id: terminalId,
      input,
      priority: entry.priority,
      mode: 'override',
      status: entry.status,
      cancelled_count: cancelled,
      created_at: entry.created_at,
    });
  } else {
    // Normal mode
    const priority = options.priority ?? 0;
    const entry = enqueueInput(terminalId, input, priority, projectRoot);

    logEvent('input.queued', projectRoot, terminalId, {
      queue_id: entry.queue_id,
      input,
      priority,
    });

    // Signal worker for immediate processing
    try {
      process.kill(session!.worker_pid, 'SIGUSR1');
    } catch {
      // Worker may have exited
    }

    success({
      queue_id: entry.queue_id,
      terminal_id: terminalId,
      input,
      priority,
      mode: 'normal',
      status: entry.status,
      queue_length: pendingCount(terminalId, projectRoot),
      created_at: entry.created_at,
    });
  }
}
