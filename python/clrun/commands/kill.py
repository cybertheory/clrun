"""The `clrun kill` command — terminate a running session."""

from __future__ import annotations

import os
import signal

from clrun.utils.paths import resolve_project_root
from clrun.utils.output import success, fail
from clrun.pty.pty_manager import read_session, update_session, is_pty_alive
from clrun.ledger.ledger import log_event
from clrun.utils.validate import session_not_found_error

from datetime import datetime, timezone


def kill_command(terminal_id: str) -> None:
    project_root = resolve_project_root()

    session = read_session(terminal_id, project_root)
    if not session:
        fail(session_not_found_error(terminal_id))
        return

    if session.status in ("exited", "killed"):
        fail({
            "error": f"Session already terminated (status: {session.status})",
            "hints": {
                "read_output": f"clrun tail {terminal_id} --lines 50",
                "start_new": "clrun <command>",
                "check_status": "clrun status",
            },
        })
        return

    worker_killed = False
    if is_pty_alive(session.worker_pid):
        try:
            os.kill(session.worker_pid, signal.SIGTERM)
            worker_killed = True
        except OSError:
            pass

    pty_killed = False
    if is_pty_alive(session.pid):
        try:
            os.kill(session.pid, signal.SIGTERM)
            pty_killed = True
        except OSError:
            pass

    update_session(
        terminal_id,
        {"status": "killed", "last_activity_at": datetime.now(timezone.utc).isoformat()},
        project_root,
    )

    log_event("session.killed", project_root, terminal_id, {
        "worker_killed": worker_killed,
        "pty_killed": pty_killed,
    })

    success({
        "terminal_id": terminal_id,
        "status": "killed",
        "hints": {
            "check_status": "clrun status",
            "new_session": "clrun <command>",
        },
    })
