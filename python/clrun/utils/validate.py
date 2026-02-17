"""Runtime assertions and validation for clrun.

Runs at every CLI boundary to catch formatting errors,
provide corrective hints to AI agents, and enforce output quality.
"""

from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional, Tuple


def assert_no_ansi(text: str, context: str) -> None:
    if "\x1b" in text:
        raise RuntimeError(
            f"[clrun assertion] ANSI escape code found in {context}. "
            "This is a bug — please report it."
        )


def check_output_quality(
    output: Optional[str], context: str
) -> Tuple[Optional[str], List[str]]:
    warnings: List[str] = []
    if not output:
        return output, warnings

    try:
        assert_no_ansi(output, context)
    except RuntimeError:
        output = re.sub(r"\x1b[^]*?[A-Za-z~]", "", output)
        warnings.append("Output contained ANSI escape codes that were stripped at runtime.")

    if re.search(r"\[\?2004[hl]", output):
        output = re.sub(r"\[\?2004[hl]", "", output)
        warnings.append("Output contained bracket paste mode sequences that were stripped.")

    output = output.strip() or None
    return output, warnings


class InputWarnings:
    def __init__(self, warnings: List[str]):
        self.warnings = warnings


def validate_input(text: str) -> InputWarnings:
    warnings: List[str] = []
    if text.strip() == "":
        warnings.append(
            "Input is empty. If you intended to send a shell variable like $MY_VAR, "
            "use single quotes to prevent your shell from expanding it: "
            "clrun <id> 'echo $MY_VAR'"
        )
    if re.match(r"^(echo|printf|cat)\s*$", text.strip()):
        warnings.append(
            f'Input "{text.strip()}" looks like a command with a missing argument. '
            "If you intended to include a shell variable, use single quotes: "
            "clrun <id> 'echo $MY_VAR'"
        )
    return InputWarnings(warnings)


def validate_command(command: str) -> InputWarnings:
    warnings: List[str] = []
    if not command.strip():
        warnings.append("Command is empty. Provide a command to run: clrun <command>")
    if "/dev/" in command or "/proc/" in command:
        warnings.append(
            "Command contains file paths that may be from unintended glob expansion. "
            "Use single quotes if you intended literal wildcards: clrun 'ls *.txt'"
        )
    return InputWarnings(warnings)


def session_not_found_error(terminal_id: str) -> Dict[str, Any]:
    hints: Dict[str, str] = {
        "list_sessions": "clrun status",
        "start_new": "clrun <command>",
    }
    try:
        from clrun.utils.paths import resolve_project_root, get_clrun_paths
        from clrun.pty.pty_manager import list_sessions

        project_root = resolve_project_root()
        paths = get_clrun_paths(project_root)
        if os.path.exists(paths.root):
            sessions = list_sessions(project_root)
            running = [s for s in sessions if s.status in ("running", "suspended")]
            if running:
                hints["active_sessions"] = ", ".join(s.terminal_id for s in running)
                hints["note"] = f"Found {len(running)} active session(s). Use one of the IDs above."
            elif sessions:
                hints["note"] = f"All {len(sessions)} session(s) are terminated. Start a new one with: clrun <command>"
            else:
                hints["note"] = "No sessions exist. Start one with: clrun <command>"
    except Exception:
        pass
    return {"error": f"Session not found: {terminal_id}", "hints": hints}


def session_not_running_error(terminal_id: str, status: str) -> Dict[str, Any]:
    hints: Dict[str, str] = {"check_status": "clrun status"}
    if status == "exited":
        hints["note"] = "This session has exited. You can still read its output."
        hints["read_output"] = f"clrun tail {terminal_id} --lines 50"
        hints["start_new"] = "clrun <command>"
    elif status == "killed":
        hints["note"] = "This session was killed. Start a new one."
        hints["start_new"] = "clrun <command>"
    elif status == "detached":
        hints["note"] = "This session was orphaned after a crash. Read its buffer or start fresh."
        hints["read_output"] = f"clrun tail {terminal_id} --lines 50"
        hints["start_new"] = "clrun <command>"
    else:
        hints["start_new"] = "clrun <command>"
    return {"error": f"Session is not running (status: {status})", "hints": hints}
