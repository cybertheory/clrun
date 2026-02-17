"""The `clrun tail` command — read the last N lines of a session's output."""

from __future__ import annotations

from clrun.utils.paths import resolve_project_root
from clrun.utils.output import success, fail, clean_output
from clrun.pty.pty_manager import read_session
from clrun.buffer.buffer_manager import tail_buffer, buffer_line_count
from clrun.utils.validate import session_not_found_error, check_output_quality


def tail_command(terminal_id: str, lines: int = 50) -> None:
    project_root = resolve_project_root()

    session = read_session(terminal_id, project_root)
    if not session:
        fail(session_not_found_error(terminal_id))
        return

    raw_lines = tail_buffer(terminal_id, lines, project_root)
    total_lines = buffer_line_count(terminal_id, project_root)
    raw_output = clean_output(raw_lines)
    output, warnings = check_output_quality(raw_output, "tail output")

    response: dict = {
        "terminal_id": terminal_id,
        "command": session.command,
        "status": session.status,
        "total_lines": total_lines,
    }

    if session.last_exit_code is not None:
        response["exit_code"] = session.last_exit_code
    if output:
        response["output"] = output
    if warnings:
        response["warnings"] = warnings

    if session.status == "running":
        response["hints"] = {
            "send_input": f"clrun {terminal_id} '<command>'",
            "send_with_priority": f"clrun input {terminal_id} '<response>' --priority 5",
            "override": f"clrun input {terminal_id} '<text>' --override",
            "more_output": f"clrun tail {terminal_id} --lines {lines * 2}",
            "kill": f"clrun kill {terminal_id}",
            "note": "Use single quotes for shell variables: clrun <id> 'echo $VAR'",
        }
    elif session.status == "suspended":
        response["suspended_at"] = session.saved_state.captured_at if session.saved_state else None
        response["hints"] = {
            "resume": f"clrun {terminal_id} '<command>'  # auto-restores env and cwd",
            "view_more": f"clrun tail {terminal_id} --lines {lines * 2}",
            "kill": f"clrun kill {terminal_id}",
        }
    elif session.status == "exited":
        response["hints"] = {
            "view_more": f"clrun tail {terminal_id} --lines {lines * 2}",
            "start_new": "clrun <command>",
        }

    success(response)
