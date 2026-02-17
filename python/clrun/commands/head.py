"""The `clrun head` command — read the first N lines of a session's output."""

from __future__ import annotations

from clrun.utils.paths import resolve_project_root
from clrun.utils.output import success, fail, clean_output
from clrun.pty.pty_manager import read_session
from clrun.buffer.buffer_manager import head_buffer, buffer_line_count
from clrun.utils.validate import session_not_found_error, check_output_quality


def head_command(terminal_id: str, lines: int = 50) -> None:
    project_root = resolve_project_root()

    session = read_session(terminal_id, project_root)
    if not session:
        fail(session_not_found_error(terminal_id))
        return

    raw_lines = head_buffer(terminal_id, lines, project_root)
    total_lines = buffer_line_count(terminal_id, project_root)
    raw_output = clean_output(raw_lines)
    output, warnings = check_output_quality(raw_output, "head output")

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
            "override": f"clrun input {terminal_id} '<text>' --override",
            "more_output": f"clrun head {terminal_id} --lines {lines * 2}",
            "tail": f"clrun tail {terminal_id} --lines 50",
            "kill": f"clrun kill {terminal_id}",
        }

    success(response)
