"""Restore a suspended session by spawning a new worker with --restore."""

from __future__ import annotations

import os
import subprocess
import sys
import time

from clrun.pty.pty_manager import read_session
from clrun.ledger.ledger import log_event


def restore_session(terminal_id: str, project_root: str) -> None:
    session = read_session(terminal_id, project_root)
    if not session or session.status != "suspended":
        raise RuntimeError(f"Session {terminal_id} is not suspended")

    restored_cwd = session.saved_state.cwd if session.saved_state else session.cwd

    worker_module = "clrun.worker"
    child = subprocess.Popen(
        [
            sys.executable, "-m", worker_module,
            terminal_id, session.command, restored_cwd, project_root, "--restore",
        ],
        start_new_session=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
    )

    log_event("session.restored", project_root, terminal_id, {
        "worker_pid": child.pid,
        "restored_cwd": restored_cwd,
    })

    max_wait = 3.0
    poll_interval = 0.1
    elapsed = 0.0

    while elapsed < max_wait:
        time.sleep(poll_interval)
        elapsed += poll_interval
        updated = read_session(terminal_id, project_root)
        if updated and updated.status == "running" and updated.worker_pid != session.worker_pid:
            return
