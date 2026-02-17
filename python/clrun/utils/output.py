"""YAML output, ANSI stripping, and response helpers."""

from __future__ import annotations

import re
import sys
from typing import Any, Dict, List, Optional

import yaml


def strip_ansi(text: str) -> str:
    """Strip ANSI escape codes and common TTY control sequences."""
    text = re.sub(r"\x1b\[[\x20-\x3f]*[\x40-\x7e]", "", text)
    text = re.sub(r"\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)", "", text)
    text = re.sub(r"\x1b[^\[\]]", "", text)
    text = re.sub(r"[^\x08]\x08", "", text)
    text = re.sub(r"\x08", "", text)
    text = re.sub(r"\r(?!\n)", "", text)
    text = re.sub(r"[\x00-\x09\x0b-\x0c\x0e-\x1f]", "", text)
    return text


def _is_prompt_line(line: str) -> bool:
    """Detect shell prompts and empty noise."""
    trimmed = line.strip()
    if not trimmed:
        return True
    if re.match(r"^%\s*$", trimmed):
        return True
    if re.match(r"^%\s{10,}", trimmed):
        return True
    if re.search(r"\s[%$#>]\s*$", trimmed):
        return True
    if re.search(r"\s[%$#>]\s+\S", trimmed):
        return True
    return False


def clean_output(lines: List[str], command: Optional[str] = None) -> Optional[str]:
    """Clean buffer lines: strip ANSI, remove prompts/echoes."""
    if not lines:
        return None

    stripped = [strip_ansi(l.rstrip("\r")) for l in lines]
    meaningful = []
    for line in stripped:
        trimmed = line.strip()
        if not trimmed:
            continue
        if _is_prompt_line(line):
            continue
        if command and trimmed == command.strip():
            continue
        meaningful.append(line)

    if not meaningful:
        return None

    result = "\n".join(meaningful)
    result = re.sub(r"\n{3,}", "\n\n", result).strip()
    return result or None


def to_yaml(data: Dict[str, Any]) -> str:
    """Serialize to clean YAML."""
    clean = {k: v for k, v in data.items() if v is not None}
    return "---\n" + yaml.dump(clean, default_flow_style=False, width=1000, allow_unicode=True)


def success(data: Dict[str, Any]) -> None:
    """Print success YAML and exit 0."""
    sys.stdout.write(to_yaml(data))
    sys.exit(0)


def fail(error: Any) -> None:
    """Print error YAML and exit 1."""
    if isinstance(error, str):
        sys.stdout.write(to_yaml({"error": error}))
    else:
        sys.stdout.write(to_yaml(error))
    sys.exit(1)


def respond(data: Dict[str, Any]) -> None:
    """Print YAML without exiting."""
    sys.stdout.write(to_yaml(data))


def session_hints(terminal_id: str) -> Dict[str, str]:
    """Build hint commands for a terminal session."""
    return {
        "view_output": f"clrun tail {terminal_id} --lines 50",
        "send_input": f'clrun input {terminal_id} "<response>"',
        "send_with_priority": f'clrun input {terminal_id} "<response>" --priority 5',
        "override_queue": f'clrun input {terminal_id} "<text>" --override',
        "kill_session": f"clrun kill {terminal_id}",
        "check_status": "clrun status",
    }
