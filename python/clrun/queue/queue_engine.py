"""Priority-based input queue with FIFO ordering and override mode."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone

from clrun.types import QueueEntry, QueueFile
from clrun.utils.paths import queue_path


def _atomic_write(filepath: str, content: str) -> None:
    tmp = filepath + f".tmp.{os.getpid()}"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp, filepath)


def init_queue(terminal_id: str, project_root: str) -> None:
    fp = queue_path(terminal_id, project_root)
    q = QueueFile(terminal_id=terminal_id)
    _atomic_write(fp, json.dumps(q.to_dict(), indent=2))


def read_queue(terminal_id: str, project_root: str) -> QueueFile:
    fp = queue_path(terminal_id, project_root)
    if not os.path.exists(fp):
        return QueueFile(terminal_id=terminal_id)
    try:
        with open(fp, "r", encoding="utf-8") as f:
            return QueueFile.from_dict(json.load(f))
    except Exception:
        return QueueFile(terminal_id=terminal_id)


def write_queue(terminal_id: str, queue: QueueFile, project_root: str) -> None:
    fp = queue_path(terminal_id, project_root)
    _atomic_write(fp, json.dumps(queue.to_dict(), indent=2))


def enqueue_input(terminal_id: str, text: str, priority: int, project_root: str) -> QueueEntry:
    queue = read_queue(terminal_id, project_root)
    entry = QueueEntry(
        queue_id=str(uuid.uuid4()),
        input=text,
        priority=priority,
        mode="normal",
        status="queued",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    queue.entries.append(entry)
    write_queue(terminal_id, queue, project_root)
    return entry


def enqueue_override(terminal_id: str, text: str, project_root: str) -> tuple[QueueEntry, int]:
    queue = read_queue(terminal_id, project_root)
    cancelled = 0
    for e in queue.entries:
        if e.status == "queued":
            e.status = "cancelled"
            cancelled += 1
    entry = QueueEntry(
        queue_id=str(uuid.uuid4()),
        input=text,
        priority=2**53,
        mode="override",
        status="queued",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    queue.entries.append(entry)
    write_queue(terminal_id, queue, project_root)
    return entry, cancelled


def get_next_queued(terminal_id: str, project_root: str) -> QueueEntry | None:
    queue = read_queue(terminal_id, project_root)
    pending = [e for e in queue.entries if e.status == "queued"]
    if not pending:
        return None
    pending.sort(key=lambda e: (-e.priority, e.created_at))
    return pending[0]


def mark_sent(terminal_id: str, queue_id: str, project_root: str) -> None:
    queue = read_queue(terminal_id, project_root)
    for e in queue.entries:
        if e.queue_id == queue_id:
            e.status = "sent"
            e.sent_at = datetime.now(timezone.utc).isoformat()
            break
    write_queue(terminal_id, queue, project_root)


def pending_count(terminal_id: str, project_root: str) -> int:
    queue = read_queue(terminal_id, project_root)
    return sum(1 for e in queue.entries if e.status == "queued")
