"""Runtime lock acquisition/release and PID tracking."""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Optional

from clrun.types import RuntimeState
from clrun.utils.paths import get_clrun_paths, ensure_clrun_dirs

PACKAGE_VERSION = "1.1.0"


def _is_process_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except (OSError, ProcessLookupError):
        return False


def _atomic_write(filepath: str, content: str) -> None:
    tmp = filepath + f".tmp.{os.getpid()}"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp, filepath)


@dataclass
class LockResult:
    acquired: bool
    attached: bool
    existing_pid: Optional[int] = None
    message: str = ""


def _cleanup_lock(paths: any) -> None:
    for fp in [paths.runtime_lock, paths.runtime_pid, paths.runtime_json]:
        try:
            os.unlink(fp)
        except OSError:
            pass


def acquire_lock(project_root: str) -> LockResult:
    ensure_clrun_dirs(project_root)
    paths = get_clrun_paths(project_root)

    if os.path.exists(paths.runtime_lock):
        try:
            with open(paths.runtime_pid, "r", encoding="utf-8") as f:
                existing_pid = int(f.read().strip())
            if _is_process_alive(existing_pid):
                return LockResult(
                    acquired=False,
                    attached=True,
                    existing_pid=existing_pid,
                    message=f"Attached to existing runtime (PID: {existing_pid})",
                )
            _cleanup_lock(paths)
        except Exception:
            _cleanup_lock(paths)

    pid = os.getpid()
    from datetime import datetime, timezone

    runtime = RuntimeState(
        pid=pid,
        started_at=datetime.now(timezone.utc).isoformat(),
        version=PACKAGE_VERSION,
        project_root=project_root,
    )

    _atomic_write(paths.runtime_lock, f"{pid}\n{int(time.time())}")
    _atomic_write(paths.runtime_pid, str(pid))
    _atomic_write(
        paths.runtime_json,
        json.dumps(
            {"pid": runtime.pid, "started_at": runtime.started_at, "version": runtime.version, "project_root": runtime.project_root},
            indent=2,
        ),
    )
    return LockResult(acquired=True, attached=False, message=f"Runtime lock acquired (PID: {pid})")


def release_lock(project_root: str) -> None:
    paths = get_clrun_paths(project_root)
    _cleanup_lock(paths)


def read_runtime_state(project_root: str) -> Optional[RuntimeState]:
    paths = get_clrun_paths(project_root)
    if not os.path.exists(paths.runtime_json):
        return None
    try:
        with open(paths.runtime_json, "r", encoding="utf-8") as f:
            d = json.load(f)
        return RuntimeState(**d)
    except Exception:
        return None


def is_runtime_active(project_root: str) -> bool:
    paths = get_clrun_paths(project_root)
    if not os.path.exists(paths.runtime_pid):
        return False
    try:
        with open(paths.runtime_pid, "r", encoding="utf-8") as f:
            pid = int(f.read().strip())
        return _is_process_alive(pid)
    except Exception:
        return False
