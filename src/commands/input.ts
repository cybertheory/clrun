import { resolveProjectRoot } from '../utils/paths';
import { success, fail, sessionHints } from '../utils/output';
import { readSession, isPtyAlive } from '../pty/pty-manager';
import { enqueueInput, enqueueOverride, pendingCount } from '../queue/queue-engine';
import { tailBuffer } from '../buffer/buffer-manager';
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

  if (session!.status !== 'running') {
    fail(`Session is not running (status: ${session!.status})`);
  }

  if (!isPtyAlive(session!.worker_pid)) {
    fail(`Session worker is not alive (PID: ${session!.worker_pid})`);
  }

  if (options.override) {
    const { entry, cancelled } = enqueueOverride(terminalId, input, projectRoot);

    logEvent('input.override', projectRoot, terminalId, {
      queue_id: entry.queue_id,
      input,
      cancelled_count: cancelled,
    });

    try { process.kill(session!.worker_pid, 'SIGUSR1'); } catch {}

    // Wait briefly for the input to be processed and output to appear
    await new Promise((r) => setTimeout(r, 400));
    const outputLines = tailBuffer(terminalId, 20, projectRoot);
    const output = outputLines.length > 0
      ? outputLines.map((l) => l.replace(/\r$/, '')).join('\n')
      : null;

    success({
      terminal_id: terminalId,
      input,
      mode: 'override',
      cancelled_count: cancelled,
      ...(output && { output }),
      hints: {
        view_output: `clrun tail ${terminalId} --lines 50`,
        send_more: `clrun input ${terminalId} "<next response>"`,
        check_status: `clrun status`,
      },
    });
  } else {
    const priority = options.priority ?? 0;
    const entry = enqueueInput(terminalId, input, priority, projectRoot);

    logEvent('input.queued', projectRoot, terminalId, {
      queue_id: entry.queue_id,
      input,
      priority,
    });

    try { process.kill(session!.worker_pid, 'SIGUSR1'); } catch {}

    // Wait briefly for the input to be processed and output to appear
    await new Promise((r) => setTimeout(r, 400));
    const outputLines = tailBuffer(terminalId, 20, projectRoot);
    const output = outputLines.length > 0
      ? outputLines.map((l) => l.replace(/\r$/, '')).join('\n')
      : null;

    success({
      terminal_id: terminalId,
      input,
      priority,
      mode: 'normal',
      queue_pending: pendingCount(terminalId, projectRoot),
      ...(output && { output }),
      hints: {
        view_output: `clrun tail ${terminalId} --lines 50`,
        send_more: `clrun input ${terminalId} "<next response>"`,
        override: `clrun input ${terminalId} "<text>" --override`,
        check_status: `clrun status`,
      },
    });
  }
}
