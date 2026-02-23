"""Handle input for SCP-backed sessions: transition + get_cli, append to buffer."""

from __future__ import annotations

from clrun.scp.client import (
    SCPClient,
    format_cli_for_buffer,
    resolve_input_to_action_or_body,
)
from clrun.buffer.buffer_manager import append_to_buffer
from clrun.pty.pty_manager import update_session


def handle_scp_input(
    terminal_id: str,
    text: str,
    project_root: str,
    base_url: str,
    run_id: str,
) -> dict:
    """Process input for an SCP session; returns dict with 'output' and optional 'done'."""
    client = SCPClient(base_url)
    cli = client.get_cli(run_id)
    options = cli.get("options") or []
    resolved = resolve_input_to_action_or_body(text, options)

    if not resolved:
        lines = ["Unknown option. Choose one of:"]
        for i, o in enumerate(options):
            label = o.get("label", o.get("action", ""))
            action = o.get("action", "")
            lines.append(f"  {i + 1}. {label} (or \"{action}\")")
        out = "\n".join(lines) + "\n"
        append_to_buffer(terminal_id, out, project_root)
        return {"output": out}

    action = resolved["action"]
    body = resolved.get("body")

    try:
        client.transition(action, body, run_id)
    except Exception as e:
        err_msg = str(e)
        out = f"Error: {err_msg}\n"
        append_to_buffer(terminal_id, out, project_root)
        return {"output": out}

    new_cli = client.get_cli(run_id)
    out = format_cli_for_buffer(new_cli)
    append_to_buffer(terminal_id, out, project_root)

    frame = client.get_frame(run_id)
    status = frame.get("status", "")
    if status in ("completed", "failed"):
        update_session(
            terminal_id,
            {"status": "exited", "last_exit_code": 0 if status == "completed" else 1},
            project_root,
        )
        return {"output": out, "done": True}
    return {"output": out}
