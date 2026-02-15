import { resolveProjectRoot } from '../utils/paths';
import { success, fail, cleanOutput } from '../utils/output';
import { readSession, isPtyAlive } from '../pty/pty-manager';
import { enqueueInput, enqueueOverride, pendingCount } from '../queue/queue-engine';
import { getBufferSize, readBufferSince } from '../buffer/buffer-manager';
import { restoreSession } from '../runtime/restore';
import { logEvent } from '../ledger/ledger';
import {
  validateInput,
  checkOutputQuality,
  sessionNotFoundError,
  sessionNotRunningError,
} from '../utils/validate';

export async function inputCommand(
  terminalId: string,
  input: string,
  options: { priority?: number; override?: boolean }
): Promise<void> {
  const projectRoot = resolveProjectRoot();

  // ── Validate input ────────────────────────────────────────────────────
  const inputCheck = validateInput(input);

  // ── Verify session exists ─────────────────────────────────────────────
  let session = readSession(terminalId, projectRoot);
  if (!session) {
    fail(sessionNotFoundError(terminalId));
  }

  // ── Transparent restore for suspended sessions ────────────────────────
  if (session!.status === 'suspended') {
    const bufferBefore = getBufferSize(terminalId, projectRoot);

    if (options.override) {
      enqueueOverride(terminalId, input, projectRoot);
    } else {
      enqueueInput(terminalId, input, options.priority ?? 0, projectRoot);
    }

    await restoreSession(terminalId, projectRoot);
    session = readSession(terminalId, projectRoot);
    await new Promise((r) => setTimeout(r, 600));

    const newLines = readBufferSince(terminalId, bufferBefore, projectRoot);
    const rawOutput = cleanOutput(newLines, input);
    const { output, warnings: outputWarnings } = checkOutputQuality(rawOutput, 'input response');

    const allWarnings = [...inputCheck.warnings, ...outputWarnings];

    success({
      terminal_id: terminalId,
      input,
      mode: options.override ? 'override' : 'normal',
      restored: true,
      ...(output && { output }),
      ...(allWarnings.length > 0 && { warnings: allWarnings }),
      hints: {
        view_output: `clrun tail ${terminalId} --lines 50`,
        send_more: `clrun ${terminalId} '<next command>'`,
        check_status: `clrun status`,
      },
    });
    return;
  }

  // ── Check session is running ──────────────────────────────────────────
  if (session!.status !== 'running') {
    fail(sessionNotRunningError(terminalId, session!.status));
  }

  if (!isPtyAlive(session!.worker_pid)) {
    fail({
      error: `Session worker is not alive (PID: ${session!.worker_pid})`,
      hints: {
        note: 'The worker process has died. The session may need recovery.',
        check_status: 'clrun status',
        start_new: 'clrun <command>',
      },
    });
  }

  // ── Snapshot buffer, enqueue, wait for output ─────────────────────────
  const bufferBefore = getBufferSize(terminalId, projectRoot);

  if (options.override) {
    const { entry, cancelled } = enqueueOverride(terminalId, input, projectRoot);

    logEvent('input.override', projectRoot, terminalId, {
      queue_id: entry.queue_id,
      input,
      cancelled_count: cancelled,
    });

    try { process.kill(session!.worker_pid, 'SIGUSR1'); } catch {}

    await new Promise((r) => setTimeout(r, 400));
    const newLines = readBufferSince(terminalId, bufferBefore, projectRoot);
    const rawOutput = cleanOutput(newLines, input);
    const { output, warnings: outputWarnings } = checkOutputQuality(rawOutput, 'input response');

    const allWarnings = [...inputCheck.warnings, ...outputWarnings];

    success({
      terminal_id: terminalId,
      input,
      mode: 'override',
      cancelled_count: cancelled,
      ...(output && { output }),
      ...(allWarnings.length > 0 && { warnings: allWarnings }),
      hints: {
        view_output: `clrun tail ${terminalId} --lines 50`,
        send_more: `clrun ${terminalId} '<next command>'`,
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

    await new Promise((r) => setTimeout(r, 400));
    const newLines = readBufferSince(terminalId, bufferBefore, projectRoot);
    const rawOutput = cleanOutput(newLines, input);
    const { output, warnings: outputWarnings } = checkOutputQuality(rawOutput, 'input response');

    const allWarnings = [...inputCheck.warnings, ...outputWarnings];

    success({
      terminal_id: terminalId,
      input,
      priority,
      mode: 'normal',
      queue_pending: pendingCount(terminalId, projectRoot),
      ...(output && { output }),
      ...(allWarnings.length > 0 && { warnings: allWarnings }),
      hints: {
        view_output: `clrun tail ${terminalId} --lines 50`,
        send_more: `clrun ${terminalId} '<next command>'`,
        override: `clrun input ${terminalId} '<text>' --override`,
        check_status: `clrun status`,
      },
    });
  }
}
