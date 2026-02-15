# clrun

### *The Interactive CLI for AI Agents*

**Persistent. Deterministic. Project-Scoped Execution.**

`clrun` is a production-grade, open-source Node.js CLI tool that provides a project-scoped, persistent, deterministic execution substrate for AI coding agents. It manages interactive PTY sessions with queued input, priority control, override capability, and crash recovery.

---

## Installation

```bash
npm install -g clrun
```

Or run directly:

```bash
npx clrun <command>
```

### Requirements

- Node.js >= 18.0.0
- macOS, Linux, or Windows

---

## Quick Start

```bash
# Run an interactive command
clrun run "npm init"

# Send input to a terminal session
clrun input <terminal_id> "yes"

# View output
clrun tail <terminal_id> --lines 50

# Check all sessions
clrun status

# Kill a session
clrun kill <terminal_id>
```

---

## Commands

All commands output **structured JSON only**. No conversational output.

### `clrun run <command>`

Run a command in a new interactive PTY session.

```bash
clrun run "npm init"
clrun run "docker compose up"
clrun run "python manage.py runserver"
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "terminal_id": "a1b2c3d4-...",
    "command": "npm init",
    "cwd": "/path/to/project",
    "status": "running",
    "worker_pid": 12345
  }
}
```

### `clrun input <terminal_id> <input> [options]`

Queue input to a running terminal session.

**Options:**
- `-p, --priority <number>` — Priority level (higher = first). Default: `0`
- `--override` — Cancel all pending inputs, send this immediately

```bash
clrun input abc123 "yes"
clrun input abc123 "y" --priority 10
clrun input abc123 "force" --override
```

### `clrun tail <terminal_id> [options]`

Show the last N lines of terminal output.

```bash
clrun tail abc123 --lines 100
```

### `clrun head <terminal_id> [options]`

Show the first N lines of terminal output.

```bash
clrun head abc123 --lines 20
```

### `clrun status`

Show runtime status and all terminal sessions.

```bash
clrun status
```

### `clrun kill <terminal_id>`

Terminate a running terminal session.

```bash
clrun kill abc123
```

---

## Architecture

### Project-Scoped State

All runtime state lives in `.clrun/` at the project root:

```
.clrun/
  runtime.lock          # Runtime lock file
  runtime.pid           # Active PID
  runtime.json          # Runtime metadata

  sessions/
    <terminal_id>.json  # Session metadata per terminal

  queues/
    <terminal_id>.json  # Input queue per terminal

  buffers/
    <terminal_id>.log   # Raw PTY output (append-only)

  ledger/
    events.log          # Structured event audit trail

  skills/
    clrun-skill.md      # General usage skill
    claude-code-skill.md # Claude Code integration skill
    openclaw-skill.md   # OpenClaw integration skill
```

No global state. No home directory writes. Fully project-scoped.

### Input Queue System

Every input is queued with deterministic ordering:

1. **Priority DESC** — higher priority numbers are sent first
2. **Created at ASC** — FIFO for same priority

Queue entry states:
- `queued` — waiting to be sent
- `sent` — delivered to the PTY
- `cancelled` — cancelled by override

**Override Mode:** When `--override` is used, all pending (unsent) inputs are cancelled, and the override input is sent immediately.

### Session Lifecycle

| State | Description |
|-------|-------------|
| `running` | PTY is active, accepting input |
| `exited` | Command completed with an exit code |
| `killed` | Session was manually terminated |
| `detached` | Session orphaned after crash (read-only) |

### Crash Recovery

On every CLI invocation:
1. Scan all sessions marked as `running`
2. Check if worker processes are alive
3. Mark dead sessions as `detached`
4. Surface detached sessions in status output
5. Never auto-respawn — explicit recovery only

### Runtime Locking

Only one runtime per project:
1. Check for `.clrun/runtime.lock`
2. If lock exists and PID alive → attach
3. If lock exists and PID dead → steal lock
4. If no lock → create atomically

---

## AI Agent Skills

On first initialization, `clrun` automatically installs skill files into `.clrun/skills/`:

- **`clrun-skill.md`** — Complete CLI reference for AI consumption
- **`claude-code-skill.md`** — Optimized instructions for Claude Code
- **`openclaw-skill.md`** — Formatted for OpenClaw agents

These files enable zero-configuration AI compatibility. Point your AI agent at these files and it will know how to use `clrun`.

---

## Git Execution Context

The `.clrun/ledger/events.log` file records all execution events as newline-delimited JSON. You can choose to:

- **Add `.clrun/` to `.gitignore`** — Keep execution state private
- **Commit `.clrun/ledger/events.log`** — Enable AI agents to reason about past execution history across sessions

Committing the ledger enables:
- Cross-session reasoning about execution patterns
- Team-wide visibility into agent actions
- Audit trails for debugging failed automation sequences
- Historical context for AI decision-making

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev -- run "echo hello"

# Link globally for testing
npm link
```

---

## Project Structure

```
src/
  index.ts              # CLI entry point (commander)
  worker.ts             # Detached PTY worker process
  types.ts              # Shared TypeScript types

  commands/
    run.ts              # clrun run
    input.ts            # clrun input
    tail.ts             # clrun tail
    head.ts             # clrun head
    status.ts           # clrun status
    kill.ts             # clrun kill

  runtime/
    lock-manager.ts     # File-based runtime locking
    crash-recovery.ts   # Session recovery on restart

  pty/
    pty-manager.ts      # PTY session management

  queue/
    queue-engine.ts     # Priority queue with override

  buffer/
    buffer-manager.ts   # Append-only buffer logs

  ledger/
    ledger.ts           # Event audit trail

  skills/
    skill-installer.ts  # Auto-install skill files
    templates.ts        # Skill markdown content

  utils/
    paths.ts            # Project-scoped path resolution
    output.ts           # JSON output helpers
```

---

## License

MIT
