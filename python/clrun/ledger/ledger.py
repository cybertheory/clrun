"""Append-only event ledger for audit trail."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from clrun.utils.paths import get_clrun_paths, ensure_clrun_dirs


def log_event(
    event: str,
    project_root: str,
    terminal_id: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None,
) -> None:
    ensure_clrun_dirs(project_root)
    paths = get_clrun_paths(project_root)
    entry: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
    }
    if terminal_id:
        entry["terminal_id"] = terminal_id
    if data:
        entry["data"] = data
    with open(paths.events_log, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def read_events(project_root: str) -> List[Dict[str, Any]]:
    paths = get_clrun_paths(project_root)
    if not os.path.exists(paths.events_log):
        return []
    with open(paths.events_log, "r", encoding="utf-8") as f:
        content = f.read().strip()
    if not content:
        return []
    events: List[Dict[str, Any]] = []
    for line in content.split("\n"):
        if line.strip():
            try:
                events.append(json.loads(line))
            except Exception:
                pass
    return events
