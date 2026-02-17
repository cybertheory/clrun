"""CLI entry point with Click commands and smart routing."""

from __future__ import annotations

import re
import sys

import click

from clrun.utils.output import fail

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)
KNOWN_COMMANDS = {"run", "input", "key", "tail", "head", "status", "kill", "help", "--help", "--version", "-h"}


def _error_handler(fn):
    """Wrap a Click command handler with error handling."""
    def wrapper(*args, **kwargs):
        try:
            fn(*args, **kwargs)
        except SystemExit:
            raise
        except Exception as e:
            fail(str(e))
    wrapper.__name__ = fn.__name__
    wrapper.__doc__ = fn.__doc__
    return wrapper


@click.group(invoke_without_command=True)
@click.version_option(version="1.1.0", prog_name="clrun")
@click.pass_context
def cli(ctx: click.Context) -> None:
    """clrun — The Interactive CLI for AI Agents"""
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


@cli.command()
@click.argument("command")
def run(command: str) -> None:
    """Run a command in a new interactive PTY session."""
    from clrun.commands.run import run_command
    run_command(command)


@cli.command("input")
@click.argument("terminal_id")
@click.argument("text")
@click.option("-p", "--priority", default=0, type=int, help="Priority (higher = first)")
@click.option("--override", is_flag=True, help="Cancel all pending inputs and send immediately")
def input_cmd(terminal_id: str, text: str, priority: int, override: bool) -> None:
    """Queue input to a running terminal session."""
    from clrun.commands.input import input_command
    input_command(terminal_id, text, priority=priority, override=override)


@cli.command()
@click.argument("terminal_id")
@click.argument("keys", nargs=-1, required=True)
def key(terminal_id: str, keys: tuple) -> None:
    """Send named keystrokes (arrow keys, tab, enter, etc.)."""
    from clrun.commands.key import key_command
    key_command(terminal_id, list(keys))


@cli.command()
@click.argument("terminal_id")
@click.option("-n", "--lines", default=50, type=int, help="Number of lines")
def tail(terminal_id: str, lines: int) -> None:
    """Show the last N lines of terminal output."""
    from clrun.commands.tail import tail_command
    tail_command(terminal_id, lines=lines)


@cli.command()
@click.argument("terminal_id")
@click.option("-n", "--lines", default=50, type=int, help="Number of lines")
def head(terminal_id: str, lines: int) -> None:
    """Show the first N lines of terminal output."""
    from clrun.commands.head import head_command
    head_command(terminal_id, lines=lines)


@cli.command()
def status() -> None:
    """Show runtime status and all terminal sessions."""
    from clrun.commands.status import status_command
    status_command()


@cli.command()
@click.argument("terminal_id")
def kill(terminal_id: str) -> None:
    """Kill a running terminal session."""
    from clrun.commands.kill import kill_command
    kill_command(terminal_id)


def main() -> None:
    """Entry point with smart routing for bare commands and terminal_id shorthand."""
    args = sys.argv[1:]

    if not args:
        cli()
        return

    first_arg = args[0]

    # If it starts with - or is a known command, let Click handle it
    if first_arg.startswith("-") or first_arg in KNOWN_COMMANDS:
        cli()
        return

    # Smart routing
    try:
        if UUID_RE.match(first_arg):
            terminal_id = first_arg
            rest = args[1:]

            if not rest:
                # clrun <terminal_id> → shorthand for tail
                from clrun.commands.tail import tail_command
                tail_command(terminal_id, lines=50)
            else:
                # clrun <terminal_id> <anything> → send as input
                text = " ".join(rest)
                from clrun.commands.input import input_command
                input_command(terminal_id, text, priority=0, override=False)
        else:
            # clrun echo hello world → run a new command
            command = " ".join(args)
            from clrun.commands.run import run_command
            run_command(command)
    except SystemExit:
        raise
    except Exception as e:
        fail(str(e))


if __name__ == "__main__":
    main()
