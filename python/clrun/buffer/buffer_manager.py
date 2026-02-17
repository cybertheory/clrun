"""Append-only buffer file management for PTY output."""

from __future__ import annotations

import os

from clrun.utils.paths import buffer_path


def append_to_buffer(terminal_id: str, data: str, project_root: str) -> None:
    fp = buffer_path(terminal_id, project_root)
    with open(fp, "a", encoding="utf-8") as f:
        f.write(data)


def init_buffer(terminal_id: str, project_root: str) -> None:
    fp = buffer_path(terminal_id, project_root)
    with open(fp, "w", encoding="utf-8") as f:
        f.write("")


def tail_buffer(terminal_id: str, lines: int, project_root: str) -> list[str]:
    fp = buffer_path(terminal_id, project_root)
    if not os.path.exists(fp):
        return []
    with open(fp, "r", encoding="utf-8") as f:
        all_lines = f.read().split("\n")
    if all_lines and all_lines[-1] == "":
        all_lines.pop()
    return all_lines[-lines:]


def head_buffer(terminal_id: str, lines: int, project_root: str) -> list[str]:
    fp = buffer_path(terminal_id, project_root)
    if not os.path.exists(fp):
        return []
    with open(fp, "r", encoding="utf-8") as f:
        all_lines = f.read().split("\n")
    if all_lines and all_lines[-1] == "":
        all_lines.pop()
    return all_lines[:lines]


def buffer_line_count(terminal_id: str, project_root: str) -> int:
    fp = buffer_path(terminal_id, project_root)
    if not os.path.exists(fp):
        return 0
    with open(fp, "r", encoding="utf-8") as f:
        content = f.read()
    if content == "":
        return 0
    all_lines = content.split("\n")
    if all_lines[-1] == "":
        return len(all_lines) - 1
    return len(all_lines)


def read_raw_buffer(terminal_id: str, project_root: str) -> str:
    fp = buffer_path(terminal_id, project_root)
    if not os.path.exists(fp):
        return ""
    with open(fp, "r", encoding="utf-8") as f:
        return f.read()


def get_buffer_size(terminal_id: str, project_root: str) -> int:
    fp = buffer_path(terminal_id, project_root)
    if not os.path.exists(fp):
        return 0
    return os.path.getsize(fp)


def read_buffer_since(terminal_id: str, offset: int, project_root: str) -> list[str]:
    fp = buffer_path(terminal_id, project_root)
    if not os.path.exists(fp):
        return []
    size = os.path.getsize(fp)
    new_bytes = size - offset
    if new_bytes <= 0:
        return []
    with open(fp, "rb") as f:
        f.seek(offset)
        data = f.read(new_bytes)
    content = data.decode("utf-8", errors="replace")
    lines = content.split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    return lines
