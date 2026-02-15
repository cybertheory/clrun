import { resolveProjectRoot, getClrunPaths } from '../utils/paths';
import { success, fail } from '../utils/output';
import { listSessions, isPtyAlive } from '../pty/pty-manager';
import { readRuntimeState } from '../runtime/lock-manager';
import { recoverSessions } from '../runtime/crash-recovery';
import { pendingCount } from '../queue/queue-engine';
import * as fs from 'fs';

export async function statusCommand(): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const paths = getClrunPaths(projectRoot);

  if (!fs.existsSync(paths.root)) {
    fail('No .clrun directory found. Run `clrun <command>` to initialize.');
  }

  recoverSessions(projectRoot);
  const runtime = readRuntimeState(projectRoot);
  const sessions = listSessions(projectRoot);

  const enriched = sessions.map((session) => ({
    terminal_id: session.terminal_id,
    command: session.command,
    status: session.status,
    pid: session.pid,
    queue_length: pendingCount(session.terminal_id, projectRoot),
    ...(session.last_exit_code !== null && { exit_code: session.last_exit_code }),
    created_at: session.created_at,
    last_activity_at: session.last_activity_at,
  }));

  const running = enriched.filter((s) => s.status === 'running');
  const exited = enriched.filter((s) => s.status === 'exited');
  const detached = enriched.filter((s) => s.status === 'detached');
  const killed = enriched.filter((s) => s.status === 'killed');

  success({
    project: projectRoot,
    running: running.length,
    exited: exited.length,
    detached: detached.length,
    killed: killed.length,
    sessions: enriched,
    hints: {
      view_session: 'clrun tail <terminal_id> --lines 50',
      send_input: 'clrun input <terminal_id> "<response>"',
      kill_session: 'clrun kill <terminal_id>',
      new_session: 'clrun <command>',
    },
  });
}
