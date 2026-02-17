"""The `clrun run` (and bare `clrun <command>`) command."""

from __future__ import annotations

import os
import subprocess
import sys
import time

from clrun.utils.paths import resolve_project_root, ensure_clrun_dirs
from clrun.utils.output import success, fail, session_hints, clean_output
from clrun.runtime.lock_manager import acquire_lock
from clrun.runtime.crash_recovery import recover_sessions
from clrun.pty.pty_manager import generate_terminal_id, read_session
from clrun.queue.queue_engine import init_queue
from clrun.buffer.buffer_manager import get_buffer_size, read_buffer_since
from clrun.skills.installer import install_skills
from clrun.ledger.ledger import log_event
from clrun.utils.validate import validate_command, check_output_quality


def run_command(command: str) -> None:
    project_root = resolve_project_root()
    cwd = os.getcwd()

    cmd_check = validate_command(command)

    if not command.strip():
        fail({
            "error": "No command provided.",
            "hints": {
                "example": "clrun echo 'hello world'",
                "interactive": "clrun 'python3 script.py'",
                "usage": "clrun <command>",
            },
        })

    ensure_clrun_dirs(project_root)
    acquire_lock(project_root)
    recover_sessions(project_root)
    install_skills(project_root)

    terminal_id = generate_terminal_id()
    init_queue(terminal_id, project_root)

    worker_module = "clrun.worker"

    try:
        child = subprocess.Popen(
            [
                sys.executable, "-m", worker_module,
                terminal_id, command, cwd, project_root,
            ],
            start_new_session=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
        )

        log_event("session.created", project_root, terminal_id, {
            "command": command,
            "cwd": cwd,
            "worker_pid": child.pid,
        })

        # Wait for initial output (up to 5s)
        buffer_start = get_buffer_size(terminal_id, project_root)
        max_wait = 5.0
        poll = 0.15
        elapsed = 0.0
        session_status = "running"
        exit_code = None

        while elapsed < max_wait:
            time.sleep(poll)
            elapsed += poll

            current_size = get_buffer_size(terminal_id, project_root)
            has_new_output = current_size > buffer_start

            sess = read_session(terminal_id, project_root)
            if sess:
                session_status = sess.status
                exit_code = sess.last_exit_code

            if sess and sess.status == "exited":
                break

            if has_new_output:
                time.sleep(0.3)
                updated = read_session(terminal_id, project_root)
                if updated:
                    session_status = updated.status
                    exit_code = updated.last_exit_code
                break

        # Build response
        new_lines = read_buffer_since(terminal_id, buffer_start, project_root)
        raw_output = clean_output(new_lines, command)
        output, output_warnings = check_output_quality(raw_output, "run response")

        all_warnings = cmd_check.warnings + output_warnings

        response: dict = {
            "terminal_id": terminal_id,
            "command": command,
            "cwd": cwd,
            "status": session_status,
        }

        if exit_code is not None:
            response["exit_code"] = exit_code
        if output:
            response["output"] = output
        if all_warnings:
            response["warnings"] = all_warnings

        if session_status == "running":
            response["hints"] = {
                **session_hints(terminal_id),
                "note": "Session is running. Use single quotes for shell variables: clrun <id> 'echo $VAR'",
            }
        elif session_status == "exited" and exit_code and exit_code != 0:
            response["hints"] = {
                "read_full_output": f"clrun tail {terminal_id} --lines 100",
                "start_new": "clrun <command>",
                "note": f"Command exited with code {exit_code}. Check output for errors.",
            }

        success(response)

    except Exception as e:
        fail({
            "error": f"Failed to spawn session: {e}",
            "hints": {
                "check_pexpect": "Ensure pexpect is installed: pip install pexpect",
            },
        })
