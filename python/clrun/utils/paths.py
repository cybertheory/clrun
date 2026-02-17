"""Project root resolution and .clrun path management."""

from __future__ import annotations

import os
from dataclasses import dataclass

CLRUN_DIR = ".clrun"

INDICATORS = [
    "package.json",
    ".git",
    "Cargo.toml",
    "go.mod",
    "pyproject.toml",
    "Makefile",
]


def resolve_project_root() -> str:
    """Walk up from cwd looking for project indicators, fall back to cwd."""
    d = os.getcwd()
    root = os.path.abspath(os.sep)

    while d != root:
        for indicator in INDICATORS:
            if os.path.exists(os.path.join(d, indicator)):
                return d
        if os.path.exists(os.path.join(d, CLRUN_DIR)):
            return d
        d = os.path.dirname(d)

    return os.getcwd()


@dataclass(frozen=True)
class ClrunPaths:
    root: str
    runtime_lock: str
    runtime_pid: str
    runtime_json: str
    sessions_dir: str
    queues_dir: str
    buffers_dir: str
    ledger_dir: str
    events_log: str
    skills_dir: str


def get_clrun_paths(project_root: str | None = None) -> ClrunPaths:
    pr = project_root or resolve_project_root()
    cr = os.path.join(pr, CLRUN_DIR)
    return ClrunPaths(
        root=cr,
        runtime_lock=os.path.join(cr, "runtime.lock"),
        runtime_pid=os.path.join(cr, "runtime.pid"),
        runtime_json=os.path.join(cr, "runtime.json"),
        sessions_dir=os.path.join(cr, "sessions"),
        queues_dir=os.path.join(cr, "queues"),
        buffers_dir=os.path.join(cr, "buffers"),
        ledger_dir=os.path.join(cr, "ledger"),
        events_log=os.path.join(cr, "ledger", "events.log"),
        skills_dir=os.path.join(cr, "skills"),
    )


def ensure_clrun_dirs(project_root: str | None = None) -> None:
    paths = get_clrun_paths(project_root)
    for d in [
        paths.root,
        paths.sessions_dir,
        paths.queues_dir,
        paths.buffers_dir,
        paths.ledger_dir,
        paths.skills_dir,
    ]:
        os.makedirs(d, exist_ok=True)


def session_path(terminal_id: str, project_root: str | None = None) -> str:
    return os.path.join(get_clrun_paths(project_root).sessions_dir, f"{terminal_id}.json")


def queue_path(terminal_id: str, project_root: str | None = None) -> str:
    return os.path.join(get_clrun_paths(project_root).queues_dir, f"{terminal_id}.json")


def buffer_path(terminal_id: str, project_root: str | None = None) -> str:
    return os.path.join(get_clrun_paths(project_root).buffers_dir, f"{terminal_id}.log")
