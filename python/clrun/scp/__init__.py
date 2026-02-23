"""SCP integration: dynamic remote CLI sessions."""

from clrun.scp.client import SCPClient, format_cli_for_buffer, resolve_input_to_action_or_body

__all__ = [
    "SCPClient",
    "format_cli_for_buffer",
    "resolve_input_to_action_or_body",
]
