"""Minimal SCP client using urllib. No dependency on scp-sdk so CLRUN works when SCP is gitignored."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

TIMEOUT_SEC = 30


def _request(
    url: str,
    method: str = "GET",
    data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else None,
        headers={"Content-Type": "application/json"} if data else {},
        method=method,
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT_SEC) as resp:
        return json.loads(resp.read().decode("utf-8"))


class SCPClient:
    """Minimal SCP client; canonical CLI format snake_case (prompt, hint, options, input_hint)."""

    def __init__(self, base_url: str) -> None:
        self._base = base_url.rstrip("/")
        self._run_id: Optional[str] = None

    def start_run(self, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        out = _request(
            f"{self._base}/runs",
            method="POST",
            data={"data": data or {}},
        )
        self._run_id = out.get("run_id")
        return out

    def get_frame(self, run_id: Optional[str] = None) -> Dict[str, Any]:
        rid = run_id or self._run_id
        if not rid:
            raise ValueError("No run_id")
        return _request(f"{self._base}/runs/{rid}")

    def get_cli(self, run_id: Optional[str] = None) -> Dict[str, Any]:
        rid = run_id or self._run_id
        if not rid:
            raise ValueError("No run_id")
        return _request(f"{self._base}/runs/{rid}/cli")

    def transition(
        self,
        action: str,
        body: Optional[Dict[str, Any]] = None,
        run_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        rid = run_id or self._run_id
        if not rid:
            raise ValueError("No run_id")
        frame = self.get_frame(rid)
        next_states = frame.get("next_states") or []
        href = None
        for ns in next_states:
            if ns.get("action") == action:
                href = ns.get("href")
                break
        if not href:
            raise ValueError(f"Action '{action}' not in next_states")
        url = href if href.startswith("http") else f"{self._base}{'' if href.startswith('/') else '/'}{href}"
        return _request(url, method="POST", data=body or {})

    def get_run_id(self) -> Optional[str]:
        return self._run_id


def format_cli_for_buffer(cli: Dict[str, Any]) -> str:
    """Format CLI response as display text for the buffer (canonical snake_case)."""
    lines: List[str] = []
    if cli.get("prompt"):
        lines.append(cli["prompt"])
    if cli.get("hint"):
        lines.append(cli["hint"])
    options = cli.get("options") or []
    for i, opt in enumerate(options):
        label = opt.get("label", opt.get("action", ""))
        action = opt.get("action", "")
        lines.append(f"  {i + 1}. {label} ({action})")
    if cli.get("input_hint"):
        lines.append(cli["input_hint"])
    return "\n".join(lines) + "\n"


def resolve_input_to_action_or_body(
    text: str,
    options: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Resolve user input to action (and optional body). Returns dict with 'action' and optional 'body' or None."""
    trimmed = text.strip()
    try:
        n = int(trimmed)
        if 1 <= n <= len(options):
            return {"action": options[n - 1].get("action", "")}
    except ValueError:
        pass
    for o in options:
        if o.get("action") == trimmed:
            return {"action": trimmed}
    if len(options) == 1 and trimmed:
        return {"action": options[0].get("action", ""), "body": {"value": trimmed}}
    return None
