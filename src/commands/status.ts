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
  const sessions = listSessions(projectRoot);

  const enriched = sessions.map((session) => {
    const entry: Record<string, unknown> = {
      terminal_id: session.terminal_id,
      command: session.command,
      status: session.status,
      pid: session.pid,
      queue_length: pendingCount(session.terminal_id, projectRoot),
      created_at: session.created_at,
      last_activity_at: session.last_activity_at,
    };

    if (session.last_exit_code !== null) {
      entry.exit_code = session.last_exit_code;
    }

    if (session.status === 'suspended' && session.saved_state) {
      entry.suspended_at = session.saved_state.captured_at;
      entry.saved_cwd = session.saved_state.cwd;
    }

    return entry;
  });

  const running = enriched.filter((s) => s.status === 'running');
  const suspended = enriched.filter((s) => s.status === 'suspended');
  const exited = enriched.filter((s) => s.status === 'exited');
  const detached = enriched.filter((s) => s.status === 'detached');
  const killed = enriched.filter((s) => s.status === 'killed');

  success({
    project: projectRoot,
    running: running.length,
    suspended: suspended.length,
    exited: exited.length,
    detached: detached.length,
    killed: killed.length,
    sessions: enriched,
    hints: {
      view_session: 'clrun <terminal_id>',
      send_input: 'clrun <terminal_id> "<command>"',
      resume_suspended: 'clrun <terminal_id> "<command>"  # auto-restores',
      kill_session: 'clrun kill <terminal_id>',
      new_session: 'clrun <command>',
    },
  });
}
