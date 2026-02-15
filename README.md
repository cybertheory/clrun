# clrun

### *The Interactive CLI for AI Agents*

**Persistent. Deterministic. Agent-Native.**

`clrun` gives AI agents full control over interactive terminal sessions — TUI prompts, select lists, checkboxes, long-running processes, and stateful shells. Every response is structured YAML with contextual hints telling the agent exactly what to do next.

```bash
npm install -g clrun
```

---

## Why clrun?

Traditional CLI execution gives agents a string and an exit code. `clrun` gives them:

- **Structured context** — every response includes `output`, `hints`, and `warnings`
- **Interactive control** — navigate TUI prompts with named keystrokes
- **Persistent sessions** — env vars, cwd, and history survive across calls
- **Agent-native errors** — failures include the reason, alternatives, and recovery commands

```yaml
# What an agent sees after running a command:
---
terminal_id: f5e6d7c8-...
command: npx create-vue@latest
output: |
  ◆  Project name:
  │  vue-project
status: running
hints:
  send_input: clrun f5e6d7c8 "my-app"
  send_keys: clrun key f5e6d7c8 enter
  view_output: clrun tail f5e6d7c8 --lines 50
  kill: clrun kill f5e6d7c8
```

---

## Quick Start

```bash
# Run any command
clrun echo "hello world"

# Start an interactive scaffolder
clrun "npx create-vue@latest"

# Send text input (+ Enter)
clrun <id> "my-project-name"

# Navigate TUI select lists with arrow keys
clrun key <id> down down enter

# Toggle checkboxes in multi-select
clrun key <id> space down space enter

# Accept a default
clrun key <id> enter

# View latest output
clrun tail <id> --lines 50

# Check all sessions
clrun status

# Kill a session
clrun kill <id>
```

---

## Real-World Example: Scaffolding a Vue App

```bash
# 1. Start the scaffolder
clrun "npx create-vue@latest"
# → Returns terminal_id and shows "Project name:" prompt

# 2. Enter the project name
clrun <id> "my-vue-app"
# → Advances to feature multi-select

# 3. Select TypeScript, Router, Pinia, and Linter
clrun key <id> space down down space down space down down down space down down enter
# → Advances to experimental features

# 4. Skip experimental features
clrun key <id> enter

# 5. Keep example code (accept default)
clrun key <id> enter

# 6. Install and start dev server
clrun <id> "cd my-vue-app && npm install"
clrun <id> "npm run dev"
# → Vite dev server running at http://localhost:5173/
```

---

## Commands

All commands return **structured YAML** with `hints` for next actions.

### `clrun <command>` — Run a command

```bash
clrun "npm init"
clrun run "docker compose up"
```

```yaml
---
terminal_id: a1b2c3d4-...
command: npm init
output: "package name: (my-project)"
status: running
hints:
  send_input: clrun a1b2c3d4 "<response>"
  kill_session: clrun kill a1b2c3d4
```

### `clrun <id> "<text>"` — Send text input

Sends text followed by Enter. Use for text prompts and shell commands.

```bash
clrun <id> "my-project"        # Type text + Enter
clrun <id> ""                   # Just press Enter (accept readline default)
```

### `clrun key <id> <keys...>` — Send keystrokes

Sends raw keystrokes for TUI navigation. No trailing Enter unless you include `enter`.

```bash
clrun key <id> down down enter           # Navigate select list
clrun key <id> space down space enter    # Toggle checkboxes
clrun key <id> enter                      # Accept default
clrun key <id> ctrl-c                     # Interrupt process
```

**Available keys:** `up`, `down`, `left`, `right`, `enter`, `tab`, `escape`, `space`, `backspace`, `delete`, `home`, `end`, `pageup`, `pagedown`, `ctrl-c`, `ctrl-d`, `ctrl-z`, `ctrl-l`, `ctrl-a`, `ctrl-e`, `y`, `n`

### `clrun input <id> "<text>" [options]` — Queue input with priority

```bash
clrun input <id> "yes" --priority 10
clrun input <id> "force" --override
```

- `--priority <n>` — Higher number = sent first (default: 0)
- `--override` — Cancel all pending inputs, send immediately

### `clrun tail <id>` / `clrun head <id>` — View output

```bash
clrun tail <id> --lines 100    # Latest output
clrun head <id> --lines 20     # First output
clrun <id>                     # Shorthand for tail
```

### `clrun status` — All sessions

### `clrun kill <id>` — Terminate session

---

## Handling TUI Prompts

| You see | Type | Action |
|---------|------|--------|
| `◆ Name: │ default` | Text input | `clrun <id> "value"` or `clrun key <id> enter` |
| `● Opt1 ○ Opt2 ○ Opt3` | Single-select | `clrun key <id> down... enter` |
| `◻ Opt1 ◻ Opt2 ◻ Opt3` | Multi-select | `clrun key <id> space down... enter` |
| `● Yes / ○ No` | Confirm | `clrun key <id> enter` or `right enter` |
| `(y/n)` | Simple confirm | `clrun <id> "y"` or `clrun <id> "n"` |
| `package name: (default)` | Readline | `clrun <id> "value"` or `clrun <id> ""` |

**Counting items in select lists:** The first item is highlighted by default. To select the Nth item, send N-1 `down` presses then `enter`.

---

## Agent-Native Design

Every `clrun` response is designed for high-context AI agents:

### Rich Error Context

```yaml
---
error: "Session not found: a1b2c3d4-..."
hints:
  list_sessions: clrun status
  start_new: clrun <command>
  active_sessions: f5e6d7c8-...
  note: Found 1 active session(s).
```

### Input Validation Warnings

```yaml
---
input: ""
warnings:
  - "Input is empty. If you intended to send $MY_VAR,
     use single quotes: clrun <id> 'echo $MY_VAR'"
```

### Contextual Next Actions

Every success response includes `hints` — the complete set of valid next commands, copy-pasteable.

---

## Session States

| State | Meaning | Accepts input? |
|-------|---------|----------------|
| `running` | PTY is active | Yes |
| `suspended` | Idle 5 min, env saved | Yes (auto-restores) |
| `exited` | Command finished | No |
| `killed` | Manually terminated | No |
| `detached` | Crashed/orphaned | No |

### Suspend & Auto-Restore

Sessions suspend after 5 minutes of inactivity, saving environment variables and working directory. Sending any input to a suspended session **transparently restores it** — no special handling needed.

```bash
clrun export MY_VAR=hello
# ... 5+ minutes idle → session suspends ...
clrun <id> 'echo $MY_VAR'     # Auto-restores, prints "hello"
```

---

## AI Agent Skills

On first run, `clrun` installs skill files into `.clrun/skills/`:

- **`clrun-skill.md`** — Complete reference with TUI interaction patterns
- **`claude-code-skill.md`** — Optimized for Claude Code agents
- **`openclaw-skill.md`** — Formatted for OpenClaw agents

These teach agents how to identify prompt types, navigate select lists, toggle checkboxes, and handle the full interactive lifecycle — with zero configuration.

---

## Project-Scoped State

All state lives in `.clrun/` at the project root. No global state.

```
.clrun/
  sessions/<id>.json    # Session metadata
  queues/<id>.json      # Input queue
  buffers/<id>.log      # Raw PTY output (append-only)
  ledger/events.log     # Structured event audit trail
  skills/               # Agent skill files
```

---

## Development

```bash
npm install
npm run build
npm test              # 50 tests (unit + integration)
npm run dev -- run "echo hello"
```

## Project Structure

```
src/
  index.ts              # CLI entry + smart routing
  worker.ts             # Detached PTY worker (suspend/restore)
  types.ts              # TypeScript types

  commands/
    run.ts              # clrun run / bare commands
    input.ts            # clrun input (with auto-restore)
    key.ts              # clrun key (TUI keystrokes)
    tail.ts / head.ts   # Output viewing
    status.ts / kill.ts # Session management

  runtime/
    lock-manager.ts     # File-based locking
    crash-recovery.ts   # Orphan detection
    restore.ts          # Transparent session restore

  utils/
    output.ts           # YAML output, ANSI stripping
    validate.ts         # Runtime assertions, rich errors
    paths.ts            # Project-scoped path resolution
```

---

## License

MIT
