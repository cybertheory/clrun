#!/usr/bin/env python3
"""
clrun worker — detached background process that manages a single PTY session.

Spawned by `clrun run`. Runs until the PTY exits, is killed, or is suspended.

Usage: python -m clrun.worker <terminalId> <command> <cwd> <projectRoot> [--restore]
"""

from __future__ import annotations

import os
import select
import signal
import sys
import time
from datetime import datetime, timezone

import pexpect

from clrun.buffer.buffer_manager import append_to_buffer, init_buffer
from clrun.queue.queue_engine import get_next_queued, mark_sent, pending_count
from clrun.pty.pty_manager import write_session, read_session, update_session, detect_shell
from clrun.ledger.ledger import log_event
from clrun.utils.paths import get_clrun_paths, ensure_clrun_dirs
from clrun.types import SessionMetadata, SavedState

# ─── Configuration ───────────────────────────────────────────────────────────

IDLE_TIMEOUT_S = 5 * 60       # 5 minutes
SUSPEND_CAPTURE_WAIT_S = 0.6  # wait for shell to flush state files
RAW_PREFIX = "\x00RAW\x00"

SKIP_ENV_VARS = {
    "_", "SHLVL", "PWD", "OLDPWD", "SHELL", "TERM", "TERM_PROGRAM",
    "TERM_PROGRAM_VERSION", "TERM_SESSION_ID", "TMPDIR", "LOGNAME", "USER",
    "HOME", "LANG", "SSH_AUTH_SOCK",
}

# ─── State ───────────────────────────────────────────────────────────────────

last_activity = time.time()
suspending = False
child: pexpect.spawn | None = None
sigusr1_received = False


def reset_idle() -> None:
    global last_activity
    last_activity = time.time()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def main() -> None:
    global child, suspending, sigusr1_received

    args = sys.argv[1:]
    restore_flag = "--restore" in args
    positional = [a for a in args if a != "--restore"]

    if len(positional) < 4:
        sys.stderr.write("worker: missing arguments\n")
        sys.exit(1)

    terminal_id, command, cwd, project_root = positional[:4]

    # ─── Ensure directories exist ────────────────────────────────────────
    ensure_clrun_dirs(project_root)

    # ─── Resolve restore state ───────────────────────────────────────────
    restore_state: SavedState | None = None
    restore_cwd = cwd

    if restore_flag:
        session = read_session(terminal_id, project_root)
        if session and session.saved_state:
            restore_state = session.saved_state
            restore_cwd = restore_state.cwd

    # ─── Spawn PTY ───────────────────────────────────────────────────────
    shell = detect_shell()
    env = dict(os.environ)
    env["TERM"] = "xterm-256color"

    child = pexpect.spawn(
        shell,
        encoding="utf-8",
        cwd=restore_cwd,
        env=env,
        dimensions=(40, 120),
        timeout=None,
    )
    pty_pid = child.pid

    # ─── Initialize state ────────────────────────────────────────────────
    if not restore_flag:
        init_buffer(terminal_id, project_root)

    existing = read_session(terminal_id, project_root) if restore_flag else None
    session_data = SessionMetadata(
        terminal_id=terminal_id,
        created_at=existing.created_at if existing else now_iso(),
        cwd=restore_cwd,
        command=command,
        shell=shell,
        status="running",
        pid=pty_pid,
        worker_pid=os.getpid(),
        queue_length=0,
        last_exit_code=None,
        last_activity_at=now_iso(),
    )
    write_session(session_data, project_root)

    if not restore_flag:
        log_event("session.created", project_root, terminal_id, {"command": command, "cwd": cwd, "pid": pty_pid})

    # ─── Send initial command or restore ─────────────────────────────────
    time.sleep(0.08)

    if restore_state:
        exports = []
        for key, value in restore_state.env.items():
            if key in SKIP_ENV_VARS:
                continue
            escaped = value.replace("'", "'\\''")
            exports.append(f"export {key}='{escaped}'")
        if exports:
            child.sendline(" && ".join(exports))
        append_to_buffer(terminal_id, "\n--- session restored ---\n", project_root)
        restored_vars = len([k for k in restore_state.env if k not in SKIP_ENV_VARS])
        log_event("session.restored", project_root, terminal_id, {
            "restored_cwd": restore_state.cwd,
            "restored_vars": restored_vars,
        })
    else:
        child.sendline(command)

    # ─── SIGUSR1 handler for immediate queue processing ──────────────────
    def sigusr1_handler(signum: int, frame: object) -> None:
        global sigusr1_received
        sigusr1_received = True

    signal.signal(signal.SIGUSR1, sigusr1_handler)

    # ─── Helper: read available PTY output ───────────────────────────────
    def drain_output() -> None:
        """Read all available data from the PTY and append to buffer."""
        try:
            fd = child.fileno()
        except Exception:
            return
        while True:
            try:
                rlist, _, _ = select.select([fd], [], [], 0)
                if not rlist:
                    break
                data = child.read_nonblocking(size=4096, timeout=0)
                if data:
                    append_to_buffer(terminal_id, data, project_root)
                    reset_idle()
                else:
                    break
            except pexpect.TIMEOUT:
                break
            except pexpect.EOF:
                break
            except Exception:
                break

    # ─── Helper: process queue ───────────────────────────────────────────
    def process_queue() -> None:
        try:
            entry = get_next_queued(terminal_id, project_root)
            while entry:
                if entry.input.startswith(RAW_PREFIX):
                    raw = entry.input[len(RAW_PREFIX):]
                    child.send(raw)
                else:
                    child.sendline(entry.input)
                mark_sent(terminal_id, entry.queue_id, project_root)
                reset_idle()
                log_event("input.sent", project_root, terminal_id, {
                    "queue_id": entry.queue_id,
                    "input": "[raw keys]" if entry.input.startswith(RAW_PREFIX) else entry.input,
                })
                entry = get_next_queued(terminal_id, project_root)
            count = pending_count(terminal_id, project_root)
            update_session(terminal_id, {"queue_length": count}, project_root)
        except Exception:
            pass

    # ─── Capture and suspend ─────────────────────────────────────────────
    def capture_and_suspend() -> None:
        global suspending
        paths = get_clrun_paths(project_root)
        cwd_file = os.path.join(paths.sessions_dir, f"{terminal_id}.state.cwd")
        env_file = os.path.join(paths.sessions_dir, f"{terminal_id}.state.env")

        for f in [cwd_file, env_file]:
            try:
                os.unlink(f)
            except OSError:
                pass

        child.sendline(f"pwd > '{cwd_file}'")
        child.sendline(f"env -0 > '{env_file}'")
        time.sleep(SUSPEND_CAPTURE_WAIT_S)

        captured_cwd = cwd
        captured_env: dict[str, str] = {}

        try:
            with open(cwd_file, "r", encoding="utf-8") as f:
                captured_cwd = f.read().strip()
        except Exception:
            pass

        try:
            with open(env_file, "r", encoding="utf-8") as f:
                raw = f.read()
            for entry in raw.split("\0"):
                if not entry:
                    continue
                eq = entry.find("=")
                if eq > 0:
                    captured_env[entry[:eq]] = entry[eq + 1:]
        except Exception:
            pass

        for f in [cwd_file, env_file]:
            try:
                os.unlink(f)
            except OSError:
                pass

        saved_state = {
            "cwd": captured_cwd,
            "env": captured_env,
            "captured_at": now_iso(),
        }

        update_session(terminal_id, {
            "status": "suspended",
            "last_activity_at": now_iso(),
            "saved_state": saved_state,
        }, project_root)

        log_event("session.suspended", project_root, terminal_id, {
            "saved_cwd": captured_cwd,
            "saved_env_count": len(captured_env),
        })

        append_to_buffer(terminal_id, "\n--- session suspended (idle timeout) ---\n", project_root)

        try:
            child.terminate(force=True)
        except Exception:
            pass

    # ─── Graceful shutdown ───────────────────────────────────────────────
    def shutdown(signum: int = 0, frame: object = None) -> None:
        try:
            child.terminate(force=True)
        except Exception:
            pass
        update_session(terminal_id, {"status": "killed", "last_activity_at": now_iso()}, project_root)
        log_event("session.killed", project_root, terminal_id, {"signal": signum})
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    # ─── Main event loop (single-threaded) ───────────────────────────────
    last_session_update = time.time()

    try:
        while True:
            # 1. Drain all available PTY output
            drain_output()

            # 2. Check if child is still alive
            if not child.isalive():
                # Drain any final output
                drain_output()
                break

            # 3. Process queue (on signal or every iteration)
            if sigusr1_received:
                sigusr1_received = False
                reset_idle()
            process_queue()

            # 4. Update session activity periodically (every 5s)
            now = time.time()
            if now - last_session_update > 5:
                update_session(terminal_id, {"last_activity_at": now_iso()}, project_root)
                last_session_update = now

            # 5. Check idle timeout
            idle = time.time() - last_activity
            if idle >= IDLE_TIMEOUT_S and not suspending:
                suspending = True
                try:
                    capture_and_suspend()
                except Exception:
                    update_session(terminal_id, {"status": "suspended", "last_activity_at": now_iso()}, project_root)
                    log_event("session.suspended", project_root, terminal_id, {"capture_failed": True})
                    try:
                        child.terminate(force=True)
                    except Exception:
                        pass
                sys.exit(0)

            # 6. Sleep briefly to avoid busy-waiting
            time.sleep(0.1)

    except Exception:
        pass

    # ─── PTY exited normally ─────────────────────────────────────────────
    if not suspending:
        exit_code = child.exitstatus if child.exitstatus is not None else child.signalstatus or 0
        update_session(terminal_id, {
            "status": "exited",
            "last_exit_code": exit_code,
            "last_activity_at": now_iso(),
            "queue_length": 0,
        }, project_root)
        log_event("session.exited", project_root, terminal_id, {"exit_code": exit_code})

    sys.exit(0)


if __name__ == "__main__":
    main()
