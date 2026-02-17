"""Crash recovery: detect orphaned sessions and mark as detached."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import List

from clrun.types import SessionMetadata
from clrun.utils.paths import get_clrun_paths
from clrun.pty.pty_manager import list_sessions, update_session, is_pty_alive
from clrun.ledger.ledger import log_event


def recover_sessions(project_root: str) -> dict:
    sessions = list_sessions(project_root)
    detached: List[SessionMetadata] = []
    active: List[SessionMetadata] = []
    recovered = 0

    for session in sessions:
        if session.status == "running":
            worker_alive = is_pty_alive(session.worker_pid)
            pty_alive = is_pty_alive(session.pid)

            if not worker_alive and not pty_alive:
                updated = update_session(
                    session.terminal_id,
                    {"status": "detached", "last_activity_at": datetime.now(timezone.utc).isoformat()},
                    project_root,
                )
                if updated:
                    detached.append(updated)
                    recovered += 1
                    log_event("session.detached", project_root, session.terminal_id, {
                        "reason": "crash_recovery",
                        "original_pid": session.pid,
                        "original_worker_pid": session.worker_pid,
                    })
            else:
                active.append(session)
        elif session.status == "detached":
            detached.append(session)

    return {"recovered": recovered, "detached": detached, "active": active}


def cleanup_stale_lock(project_root: str) -> bool:
    paths = get_clrun_paths(project_root)
    if not os.path.exists(paths.runtime_pid):
        return False
    try:
        with open(paths.runtime_pid, "r", encoding="utf-8") as f:
            pid = int(f.read().strip())
        if not is_pty_alive(pid):
            for fp in [paths.runtime_lock, paths.runtime_pid]:
                try:
                    os.unlink(fp)
                except OSError:
                    pass
            return True
    except Exception:
        for fp in [paths.runtime_lock, paths.runtime_pid]:
            try:
                os.unlink(fp)
            except OSError:
                pass
        return True
    return False
