import * as fs from 'fs';
import { getClrunPaths } from '../utils/paths';
import { listSessions, updateSession, isPtyAlive } from '../pty/pty-manager';
import { logEvent } from '../ledger/ledger';
import type { SessionMetadata } from '../types';

export interface RecoveryResult {
  recovered: number;
  detached: SessionMetadata[];
  active: SessionMetadata[];
}

/**
 * Scan for crashed/orphaned sessions and mark them as detached.
 * 
 * Called on every CLI startup to ensure state consistency.
 */
export function recoverSessions(projectRoot: string): RecoveryResult {
  const sessions = listSessions(projectRoot);
  const detached: SessionMetadata[] = [];
  const active: SessionMetadata[] = [];
  let recovered = 0;

  for (const session of sessions) {
    if (session.status === 'running') {
      // Check if the worker process is still alive
      const workerAlive = isPtyAlive(session.worker_pid);
      const ptyAlive = isPtyAlive(session.pid);

      if (!workerAlive && !ptyAlive) {
        // Both dead — mark as detached
        const updated = updateSession(
          session.terminal_id,
          {
            status: 'detached',
            last_activity_at: new Date().toISOString(),
          },
          projectRoot
        );

        if (updated) {
          detached.push(updated);
          recovered++;

          logEvent('session.detached', projectRoot, session.terminal_id, {
            reason: 'crash_recovery',
            original_pid: session.pid,
            original_worker_pid: session.worker_pid,
          });
        }
      } else {
        active.push(session);
      }
    } else if (session.status === 'detached') {
      detached.push(session);
    } else {
      // exited or killed — leave as-is
    }
  }

  return { recovered, detached, active };
}

/**
 * Clean up stale lock files if the runtime PID is dead.
 */
export function cleanupStaleLock(projectRoot: string): boolean {
  const paths = getClrunPaths(projectRoot);

  if (!fs.existsSync(paths.runtimePid)) {
    return false;
  }

  try {
    const pid = parseInt(fs.readFileSync(paths.runtimePid, 'utf-8').trim(), 10);
    if (!isPtyAlive(pid)) {
      // PID is dead — remove lock files
      for (const f of [paths.runtimeLock, paths.runtimePid]) {
        try { fs.unlinkSync(f); } catch { /* ignore */ }
      }
      return true;
    }
  } catch {
    // Corrupted — clean up
    for (const f of [paths.runtimeLock, paths.runtimePid]) {
      try { fs.unlinkSync(f); } catch { /* ignore */ }
    }
    return true;
  }

  return false;
}
