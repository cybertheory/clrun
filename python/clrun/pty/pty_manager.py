"""Session metadata CRUD, shell detection, and UUID generation."""

from __future__ import annotations

import json
import os
import platform
import signal
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from clrun.types import SessionMetadata
from clrun.utils.paths import session_path, get_clrun_paths


def _atomic_write(filepath: str, content: str) -> None:
    tmp = filepath + f".tmp.{os.getpid()}"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp, filepath)


def detect_shell() -> str:
    return os.environ.get("SHELL", "/bin/sh" if platform.system() != "Windows" else "powershell.exe")


def generate_terminal_id() -> str:
    return str(uuid.uuid4())


def create_session_metadata(
    terminal_id: str, command: str, cwd: str, pid: int, worker_pid: int
) -> SessionMetadata:
    now = datetime.now(timezone.utc).isoformat()
    return SessionMetadata(
        terminal_id=terminal_id,
        created_at=now,
        cwd=cwd,
        command=command,
        shell=detect_shell(),
        status="running",
        pid=pid,
        worker_pid=worker_pid,
        queue_length=0,
        last_exit_code=None,
        last_activity_at=now,
    )


def write_session(session: SessionMetadata, project_root: str) -> None:
    fp = session_path(session.terminal_id, project_root)
    _atomic_write(fp, json.dumps(session.to_dict(), indent=2))


def read_session(terminal_id: str, project_root: str) -> Optional[SessionMetadata]:
    fp = session_path(terminal_id, project_root)
    if not os.path.exists(fp):
        return None
    try:
        with open(fp, "r", encoding="utf-8") as f:
            return SessionMetadata.from_dict(json.load(f))
    except Exception:
        return None


def update_session(
    terminal_id: str, updates: Dict[str, Any], project_root: str
) -> Optional[SessionMetadata]:
    session = read_session(terminal_id, project_root)
    if not session:
        return None
    d = session.to_dict()
    d.update(updates)
    updated = SessionMetadata.from_dict(d)
    write_session(updated, project_root)
    return updated


def list_sessions(project_root: str) -> List[SessionMetadata]:
    paths = get_clrun_paths(project_root)
    if not os.path.exists(paths.sessions_dir):
        return []
    sessions: List[SessionMetadata] = []
    for fname in os.listdir(paths.sessions_dir):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(paths.sessions_dir, fname), "r", encoding="utf-8") as f:
                sessions.append(SessionMetadata.from_dict(json.load(f)))
        except Exception:
            continue
    return sessions


def is_pty_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except (OSError, ProcessLookupError):
        return False
