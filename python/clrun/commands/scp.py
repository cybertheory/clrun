"""The `clrun scp` command — connect to an SCP server and start a dynamic remote CLI session."""

from __future__ import annotations

import os

from clrun.utils.paths import resolve_project_root, ensure_clrun_dirs
from clrun.utils.output import success, fail
from clrun.runtime.lock_manager import acquire_lock
from clrun.pty.pty_manager import generate_terminal_id, write_session, create_session_metadata
from clrun.queue.queue_engine import init_queue
from clrun.buffer.buffer_manager import init_buffer, append_to_buffer
from clrun.ledger.ledger import log_event
from clrun.scp.client import SCPClient, format_cli_for_buffer


def scp_connect_command(base_url: str) -> None:
    """Connect to an SCP server and start a run. CLRUN supports dynamic remote CLIs via SCP."""
    project_root = resolve_project_root()
    ensure_clrun_dirs(project_root)
    acquire_lock(project_root)

    terminal_id = generate_terminal_id()
    init_queue(terminal_id, project_root)
    init_buffer(terminal_id, project_root)

    client = SCPClient(base_url)
    try:
        client.start_run()
        cli = client.get_cli()
    except Exception as e:
        fail({
            "error": f"SCP connect failed: {str(e)}",
            "hints": {
                "check_url": "Ensure the SCP server is running and reachable.",
                "example": "clrun scp http://localhost:8000",
            },
        })
        return

    run_id = client.get_run_id()
    if not run_id:
        fail({"error": "SCP start_run did not return run_id"})
        return

    display = format_cli_for_buffer(cli)
    append_to_buffer(terminal_id, display, project_root)

    base_normalized = base_url.rstrip("/")
    cwd = os.getcwd()
    session = create_session_metadata(
        terminal_id,
        f"clrun scp {base_url}",
        cwd,
        pid=0,
        worker_pid=0,
    )
    session.scp_run_id = run_id
    session.scp_base_url = base_normalized
    write_session(session, project_root)

    log_event("session.created", project_root, terminal_id, {
        "command": session.command,
        "scp_run_id": run_id,
        "scp_base_url": session.scp_base_url,
    })

    success({
        "terminal_id": terminal_id,
        "status": "running",
        "output": display,
        "hints": {
            "send_input": f"clrun {terminal_id} \"<option number or action name>\"",
            "view_output": f"clrun tail {terminal_id} --lines 50",
            "kill": f"clrun kill {terminal_id}",
            "note": "CLRUN supports dynamic remote CLIs via SCP. Send option index (e.g. \"1\") or action name to transition.",
        },
    })
