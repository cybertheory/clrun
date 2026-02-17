"""The `clrun status` command — show all sessions and their state."""

from __future__ import annotations

import os

from clrun.utils.paths import resolve_project_root, get_clrun_paths
from clrun.utils.output import success, fail
from clrun.pty.pty_manager import list_sessions
from clrun.runtime.crash_recovery import recover_sessions
from clrun.queue.queue_engine import pending_count


def status_command() -> None:
    project_root = resolve_project_root()
    paths = get_clrun_paths(project_root)

    if not os.path.exists(paths.root):
        fail("No .clrun directory found. Run `clrun <command>` to initialize.")
        return

    recover_sessions(project_root)
    sessions = list_sessions(project_root)

    enriched = []
    for session in sessions:
        entry: dict = {
            "terminal_id": session.terminal_id,
            "command": session.command,
            "status": session.status,
            "pid": session.pid,
            "queue_length": pending_count(session.terminal_id, project_root),
            "created_at": session.created_at,
            "last_activity_at": session.last_activity_at,
        }
        if session.last_exit_code is not None:
            entry["exit_code"] = session.last_exit_code
        if session.status == "suspended" and session.saved_state:
            entry["suspended_at"] = session.saved_state.captured_at
            entry["saved_cwd"] = session.saved_state.cwd
        enriched.append(entry)

    running = [s for s in enriched if s["status"] == "running"]
    suspended = [s for s in enriched if s["status"] == "suspended"]
    exited = [s for s in enriched if s["status"] == "exited"]
    detached = [s for s in enriched if s["status"] == "detached"]
    killed = [s for s in enriched if s["status"] == "killed"]

    success({
        "project": project_root,
        "running": len(running),
        "suspended": len(suspended),
        "exited": len(exited),
        "detached": len(detached),
        "killed": len(killed),
        "sessions": enriched,
        "hints": {
            "view_session": "clrun <terminal_id>",
            "send_input": 'clrun <terminal_id> "<command>"',
            "resume_suspended": 'clrun <terminal_id> "<command>"  # auto-restores',
            "kill_session": "clrun kill <terminal_id>",
            "new_session": "clrun <command>",
        },
    })
