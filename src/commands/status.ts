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

  // Check if .clrun exists
  if (!fs.existsSync(paths.root)) {
    fail('No .clrun directory found. Run `clrun run` to initialize.');
  }

  // Run crash recovery first
  const recovery = recoverSessions(projectRoot);

  // Read runtime state
  const runtime = readRuntimeState(projectRoot);

  // Get all sessions
  const sessions = listSessions(projectRoot);

  // Enrich session data with live status
  const enriched = sessions.map((session) => {
    const workerAlive = isPtyAlive(session.worker_pid);
    const queueLen = pendingCount(session.terminal_id, projectRoot);

    return {
      terminal_id: session.terminal_id,
      command: session.command,
      cwd: session.cwd,
      status: session.status,
      pid: session.pid,
      worker_pid: session.worker_pid,
      worker_alive: workerAlive,
      queue_length: queueLen,
      last_exit_code: session.last_exit_code,
      created_at: session.created_at,
      last_activity_at: session.last_activity_at,
    };
  });

  const running = enriched.filter((s) => s.status === 'running');
  const exited = enriched.filter((s) => s.status === 'exited');
  const detached = enriched.filter((s) => s.status === 'detached');
  const killed = enriched.filter((s) => s.status === 'killed');

  success({
    project_root: projectRoot,
    runtime: runtime
      ? {
          pid: runtime.pid,
          started_at: runtime.started_at,
          version: runtime.version,
        }
      : null,
    recovery: recovery.recovered > 0
      ? { recovered: recovery.recovered }
      : undefined,
    summary: {
      total: enriched.length,
      running: running.length,
      exited: exited.length,
      detached: detached.length,
      killed: killed.length,
    },
    sessions: enriched,
  });
}
