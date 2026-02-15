# clrun — CLI Skill Reference

## Overview

`clrun` is a project-scoped, persistent, deterministic CLI execution substrate
designed for AI coding agents. It provides interactive PTY sessions with queued
input, priority control, and crash recovery.

## Installation

```bash
npm install -g clrun
# or
npx clrun <command>
```

## Commands

### Run a Command

```bash
clrun run "<command>"
```

Creates a new interactive PTY session. Returns JSON with `terminal_id`.

**Example:**
```bash
clrun run "npm init"
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "terminal_id": "a1b2c3d4-...",
    "command": "npm init",
    "status": "running",
    "pid": 12345
  }
}
```

### Send Input

```bash
clrun input <terminal_id> "<input>" [--priority <n>] [--override]
```

Queue input to a running terminal session.

- **--priority <n>**: Higher number = higher priority (default: 0)
- **--override**: Cancel all pending inputs, send this immediately

**Examples:**
```bash
clrun input abc123 "yes"
clrun input abc123 "yes" --priority 10
clrun input abc123 "force-reset" --override
```

### View Output (tail)

```bash
clrun tail <terminal_id> [--lines <n>]
```

Returns the last N lines of terminal output (default: 50).

### View Output (head)

```bash
clrun head <terminal_id> [--lines <n>]
```

Returns the first N lines of terminal output (default: 50).

### Check Status

```bash
clrun status
```

Returns JSON with all terminal sessions and their states.

### Kill a Session

```bash
clrun kill <terminal_id>
```

Terminates a running PTY session.

## Queue System

The input queue is **deterministic**:

1. Inputs are sorted by **priority DESC** (higher first)
2. Ties are broken by **created_at ASC** (first-in, first-out)
3. Override mode cancels all pending inputs

### Queue Entry States
- `queued` — waiting to be sent
- `sent` — delivered to the PTY
- `cancelled` — cancelled by override

## Session States

| State | Meaning |
|-------|---------|
| `running` | PTY is active and accepting input |
| `exited` | Command completed (check `last_exit_code`) |
| `killed` | Session was manually terminated |
| `detached` | Session lost due to crash (not recoverable) |

## Detached Sessions

When `clrun` detects a previously running session whose process has died:
- It marks the session as `detached`
- The buffer log is still readable
- The session cannot be resumed
- You should inspect the buffer and start a new session if needed

## Best Practices for AI Agents

1. **Always capture the `terminal_id`** from `clrun run` responses
2. **Poll with `clrun tail`** to observe command output
3. **Use priority** when multiple inputs are queued
4. **Use override** when you need to abort current flow
5. **Check status** before sending input to verify the session is `running`
6. **Handle `detached` sessions** — don't try to send input to them
7. **Parse JSON strictly** — all responses are structured JSON
8. **Don't assume command completion** — check `status` and `last_exit_code`

## State Files

All state lives in `.clrun/` within the project root:

```
.clrun/
  sessions/<id>.json    # Session metadata
  queues/<id>.json      # Input queue
  buffers/<id>.log      # Raw PTY output
  ledger/events.log     # Event audit trail
  skills/               # This file and others
```

## Git Integration Potential

The `.clrun/ledger/events.log` file can be committed to git to enable:
- Cross-session reasoning about execution history
- Team-wide visibility into agent actions
- Audit trails for debugging

Add `.clrun/` to `.gitignore` to exclude, or selectively commit the ledger.
