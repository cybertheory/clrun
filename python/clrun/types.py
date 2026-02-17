"""Core data types for clrun."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional


SessionStatus = Literal["running", "exited", "detached", "killed", "suspended"]
QueueMode = Literal["normal", "override"]
QueueStatus = Literal["queued", "sent", "cancelled"]

LedgerEventType = Literal[
    "runtime.started",
    "runtime.stopped",
    "session.created",
    "session.exited",
    "session.killed",
    "session.detached",
    "session.suspended",
    "session.restored",
    "input.queued",
    "input.sent",
    "input.cancelled",
    "input.override",
    "key.sent",
    "skills.installed",
    "skills.global_installed",
    "error",
]


@dataclass
class SavedState:
    cwd: str
    env: Dict[str, str]
    captured_at: str


@dataclass
class SessionMetadata:
    terminal_id: str
    created_at: str
    cwd: str
    command: str
    shell: str
    status: SessionStatus
    pid: int
    worker_pid: int
    queue_length: int = 0
    last_exit_code: Optional[int] = None
    last_activity_at: str = ""
    saved_state: Optional[SavedState] = None

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "terminal_id": self.terminal_id,
            "created_at": self.created_at,
            "cwd": self.cwd,
            "command": self.command,
            "shell": self.shell,
            "status": self.status,
            "pid": self.pid,
            "worker_pid": self.worker_pid,
            "queue_length": self.queue_length,
            "last_exit_code": self.last_exit_code,
            "last_activity_at": self.last_activity_at,
        }
        if self.saved_state:
            d["saved_state"] = {
                "cwd": self.saved_state.cwd,
                "env": self.saved_state.env,
                "captured_at": self.saved_state.captured_at,
            }
        return d

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "SessionMetadata":
        ss = d.get("saved_state")
        saved = SavedState(**ss) if ss else None
        return cls(
            terminal_id=d["terminal_id"],
            created_at=d["created_at"],
            cwd=d["cwd"],
            command=d["command"],
            shell=d["shell"],
            status=d["status"],
            pid=d["pid"],
            worker_pid=d["worker_pid"],
            queue_length=d.get("queue_length", 0),
            last_exit_code=d.get("last_exit_code"),
            last_activity_at=d.get("last_activity_at", ""),
            saved_state=saved,
        )


@dataclass
class QueueEntry:
    queue_id: str
    input: str
    priority: int
    mode: QueueMode
    status: QueueStatus
    created_at: str
    sent_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "queue_id": self.queue_id,
            "input": self.input,
            "priority": self.priority,
            "mode": self.mode,
            "status": self.status,
            "created_at": self.created_at,
            "sent_at": self.sent_at,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "QueueEntry":
        return cls(**d)


@dataclass
class QueueFile:
    terminal_id: str
    entries: List[QueueEntry] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "terminal_id": self.terminal_id,
            "entries": [e.to_dict() for e in self.entries],
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "QueueFile":
        return cls(
            terminal_id=d["terminal_id"],
            entries=[QueueEntry.from_dict(e) for e in d.get("entries", [])],
        )


@dataclass
class RuntimeState:
    pid: int
    started_at: str
    version: str
    project_root: str
    port: Optional[int] = None
