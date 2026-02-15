import { resolveProjectRoot } from '../utils/paths';
import { success, fail } from '../utils/output';
import { readSession, updateSession, isPtyAlive } from '../pty/pty-manager';
import { logEvent } from '../ledger/ledger';
import { sessionNotFoundError } from '../utils/validate';

export async function killCommand(terminalId: string): Promise<void> {
  const projectRoot = resolveProjectRoot();

  const session = readSession(terminalId, projectRoot);
  if (!session) {
    fail(sessionNotFoundError(terminalId));
  }

  if (session!.status === 'exited' || session!.status === 'killed') {
    fail({
      error: `Session already terminated (status: ${session!.status})`,
      hints: {
        read_output: `clrun tail ${terminalId} --lines 50`,
        start_new: 'clrun <command>',
        check_status: 'clrun status',
      },
    });
  }

  let workerKilled = false;
  if (isPtyAlive(session!.worker_pid)) {
    try {
      process.kill(session!.worker_pid, 'SIGTERM');
      workerKilled = true;
    } catch {}
  }

  let ptyKilled = false;
  if (isPtyAlive(session!.pid)) {
    try {
      process.kill(session!.pid, 'SIGTERM');
      ptyKilled = true;
    } catch {}
  }

  updateSession(
    terminalId,
    { status: 'killed', last_activity_at: new Date().toISOString() },
    projectRoot
  );

  logEvent('session.killed', projectRoot, terminalId, {
    worker_killed: workerKilled,
    pty_killed: ptyKilled,
  });

  success({
    terminal_id: terminalId,
    status: 'killed',
    hints: {
      check_status: 'clrun status',
      new_session: 'clrun <command>',
    },
  });
}
