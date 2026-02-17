"""The `clrun key` command — send named keystrokes to a running session."""

from __future__ import annotations

import os
import signal
import time
from typing import List

from clrun.utils.paths import resolve_project_root
from clrun.utils.output import success, fail, clean_output
from clrun.pty.pty_manager import read_session, is_pty_alive
from clrun.queue.queue_engine import enqueue_input
from clrun.buffer.buffer_manager import get_buffer_size, read_buffer_since
from clrun.runtime.restore import restore_session
from clrun.ledger.ledger import log_event
from clrun.utils.validate import session_not_found_error, session_not_running_error

KEY_MAP = {
    "up": "\x1b[A",
    "down": "\x1b[B",
    "right": "\x1b[C",
    "left": "\x1b[D",
    "enter": "\r",
    "return": "\r",
    "tab": "\t",
    "escape": "\x1b",
    "esc": "\x1b",
    "space": " ",
    "backspace": "\x7f",
    "delete": "\x1b[3~",
    "home": "\x1b[H",
    "end": "\x1b[F",
    "pageup": "\x1b[5~",
    "pagedown": "\x1b[6~",
    "ctrl-c": "\x03",
    "ctrl-d": "\x04",
    "ctrl-z": "\x1a",
    "ctrl-l": "\x0c",
    "ctrl-a": "\x01",
    "ctrl-e": "\x05",
    "y": "y",
    "n": "n",
}

RAW_PREFIX = "\x00RAW\x00"


def _resolve_key(name: str) -> str | None:
    return KEY_MAP.get(name.lower())


def key_command(terminal_id: str, keys: List[str]) -> None:
    project_root = resolve_project_root()

    resolved: List[str] = []
    unknown: List[str] = []

    for k in keys:
        seq = _resolve_key(k)
        if seq is not None:
            resolved.append(seq)
        else:
            unknown.append(k)

    if unknown:
        fail({
            "error": f"Unknown key name(s): {', '.join(unknown)}",
            "hints": {
                "available_keys": ", ".join(KEY_MAP.keys()),
                "example": "clrun key <id> down down enter",
                "note": 'Keys are case-insensitive. Use "clrun input" for text input.',
            },
        })
        return

    session = read_session(terminal_id, project_root)
    if not session:
        fail(session_not_found_error(terminal_id))
        return

    if session.status == "suspended":
        restore_session(terminal_id, project_root)
        session = read_session(terminal_id, project_root)
        time.sleep(0.3)

    if session and session.status != "running":
        fail(session_not_running_error(terminal_id, session.status))
        return

    if not is_pty_alive(session.worker_pid):
        fail({
            "error": f"Session worker is not alive (PID: {session.worker_pid})",
            "hints": {
                "check_status": "clrun status",
                "start_new": "clrun <command>",
            },
        })
        return

    raw_sequence = "".join(resolved)
    enqueue_input(terminal_id, RAW_PREFIX + raw_sequence, 999, project_root)

    try:
        os.kill(session.worker_pid, signal.SIGUSR1)
    except OSError:
        pass

    log_event("key.sent", project_root, terminal_id, {
        "keys": keys,
        "sequence_length": len(raw_sequence),
    })

    buffer_before = get_buffer_size(terminal_id, project_root)
    time.sleep(0.4)

    new_lines = read_buffer_since(terminal_id, buffer_before, project_root)
    output = clean_output(new_lines)

    success({
        "terminal_id": terminal_id,
        "keys_sent": keys,
        **({"output": output} if output else {}),
        "hints": {
            "send_more_keys": f"clrun key {terminal_id} <key> [<key>...]",
            "send_text": f"clrun {terminal_id} '<text>'",
            "view_output": f"clrun tail {terminal_id} --lines 50",
            "available_keys": "up, down, left, right, enter, tab, escape, space, backspace, ctrl-c, ctrl-d",
        },
    })
