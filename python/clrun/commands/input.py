"""The `clrun input` command — send text input to a running session."""

from __future__ import annotations

import os
import signal
import time

from clrun.utils.paths import resolve_project_root
from clrun.utils.output import success, fail, clean_output
from clrun.pty.pty_manager import read_session, is_pty_alive
from clrun.queue.queue_engine import enqueue_input, enqueue_override, pending_count
from clrun.buffer.buffer_manager import get_buffer_size, read_buffer_since
from clrun.runtime.restore import restore_session
from clrun.ledger.ledger import log_event
from clrun.utils.validate import validate_input, check_output_quality, session_not_found_error, session_not_running_error


def input_command(terminal_id: str, text: str, priority: int = 0, override: bool = False) -> None:
    project_root = resolve_project_root()

    input_check = validate_input(text)

    session = read_session(terminal_id, project_root)
    if not session:
        fail(session_not_found_error(terminal_id))
        return  # unreachable, fail exits

    # Transparent restore for suspended sessions
    if session.status == "suspended":
        buffer_before = get_buffer_size(terminal_id, project_root)

        if override:
            enqueue_override(terminal_id, text, project_root)
        else:
            enqueue_input(terminal_id, text, priority, project_root)

        restore_session(terminal_id, project_root)
        session = read_session(terminal_id, project_root)
        time.sleep(0.6)

        new_lines = read_buffer_since(terminal_id, buffer_before, project_root)
        raw_output = clean_output(new_lines, text)
        output, output_warnings = check_output_quality(raw_output, "input response")

        all_warnings = input_check.warnings + output_warnings

        success({
            "terminal_id": terminal_id,
            "input": text,
            "mode": "override" if override else "normal",
            "restored": True,
            **({"output": output} if output else {}),
            **({"warnings": all_warnings} if all_warnings else {}),
            "hints": {
                "view_output": f"clrun tail {terminal_id} --lines 50",
                "send_more": f"clrun {terminal_id} '<next command>'",
                "check_status": "clrun status",
            },
        })
        return

    if session.status != "running":
        fail(session_not_running_error(terminal_id, session.status))
        return

    if not is_pty_alive(session.worker_pid):
        fail({
            "error": f"Session worker is not alive (PID: {session.worker_pid})",
            "hints": {
                "note": "The worker process has died. The session may need recovery.",
                "check_status": "clrun status",
                "start_new": "clrun <command>",
            },
        })
        return

    buffer_before = get_buffer_size(terminal_id, project_root)

    if override:
        entry, cancelled = enqueue_override(terminal_id, text, project_root)
        log_event("input.override", project_root, terminal_id, {
            "queue_id": entry.queue_id,
            "input": text,
            "cancelled_count": cancelled,
        })
        try:
            os.kill(session.worker_pid, signal.SIGUSR1)
        except OSError:
            pass

        time.sleep(0.4)
        new_lines = read_buffer_since(terminal_id, buffer_before, project_root)
        raw_output = clean_output(new_lines, text)
        output, output_warnings = check_output_quality(raw_output, "input response")
        all_warnings = input_check.warnings + output_warnings

        success({
            "terminal_id": terminal_id,
            "input": text,
            "mode": "override",
            "cancelled_count": cancelled,
            **({"output": output} if output else {}),
            **({"warnings": all_warnings} if all_warnings else {}),
            "hints": {
                "view_output": f"clrun tail {terminal_id} --lines 50",
                "send_more": f"clrun {terminal_id} '<next command>'",
                "check_status": "clrun status",
            },
        })
    else:
        entry = enqueue_input(terminal_id, text, priority, project_root)
        log_event("input.queued", project_root, terminal_id, {
            "queue_id": entry.queue_id,
            "input": text,
            "priority": priority,
        })
        try:
            os.kill(session.worker_pid, signal.SIGUSR1)
        except OSError:
            pass

        time.sleep(0.4)
        new_lines = read_buffer_since(terminal_id, buffer_before, project_root)
        raw_output = clean_output(new_lines, text)
        output, output_warnings = check_output_quality(raw_output, "input response")
        all_warnings = input_check.warnings + output_warnings

        success({
            "terminal_id": terminal_id,
            "input": text,
            "priority": priority,
            "mode": "normal",
            "queue_pending": pending_count(terminal_id, project_root),
            **({"output": output} if output else {}),
            **({"warnings": all_warnings} if all_warnings else {}),
            "hints": {
                "view_output": f"clrun tail {terminal_id} --lines 50",
                "send_more": f"clrun {terminal_id} '<next command>'",
                "override": f"clrun input {terminal_id} '<text>' --override",
                "check_status": "clrun status",
            },
        })
