# clrun — CLI Skill Reference

## Overview

`clrun` is a project-scoped, persistent, deterministic CLI execution substrate
designed for AI coding agents. It provides interactive PTY sessions with queued
input, priority control, keystroke navigation, and crash recovery.

All responses are **structured YAML** with contextual `hints` that tell you
exactly what to do next. Every error includes recovery steps. Every success
includes the full set of valid next actions.

## Installation

Node.js:
```bash
npm install -g clrun
# or: npx clrun <command>
```

Python (uv):
```bash
uv tool install clrun-cli
```
(pip: `pip install clrun-cli`)

Both runtimes produce identical YAML output and use the same `.clrun/` state format.

## Commands

### Run a Command (bare shorthand)

```bash
clrun <command>
clrun run "<command>"
```

Creates a new interactive PTY session. Returns YAML with `terminal_id`.
The session starts in the **current working directory**.

**Examples:**
```bash
clrun npm init
clrun "npx create-vue@latest"
clrun run "docker compose up"
```

### Send Text Input

```bash
clrun <terminal_id> "<text>"
clrun input <terminal_id> "<text>" [--priority <n>] [--override]
```

Sends text to a running session followed by Enter. Use the bare shorthand
(`clrun <id> "text"`) for quick input, or `clrun input` for priority/override.

- **--priority <n>**: Higher number = higher priority (default: 0)
- **--override**: Cancel all pending inputs, send this immediately

**Examples:**
```bash
clrun abc123 "my-project-name"
clrun abc123 "yes"
clrun input abc123 "force-reset" --override
```

### Send Keystrokes (for TUI navigation)

```bash
clrun key <terminal_id> <key> [<key>...]
```

Sends named keystrokes to navigate TUI prompts — select lists, multi-select
checkboxes, confirm dialogs, and more. Keys are sent as raw escape sequences
**without** a trailing Enter (unless you include `enter` explicitly).

**Available keys:**
`up`, `down`, `left`, `right`, `enter`, `tab`, `escape`, `space`,
`backspace`, `delete`, `home`, `end`, `pageup`, `pagedown`,
`ctrl-c`, `ctrl-d`, `ctrl-z`, `ctrl-l`, `ctrl-a`, `ctrl-e`, `y`, `n`

**Examples:**
```bash
clrun key abc123 down down enter       # Navigate a select list → pick 3rd item
clrun key abc123 space down space enter # Toggle 1st + 2nd checkbox, confirm
clrun key abc123 enter                  # Accept the default / confirm
clrun key abc123 ctrl-c                 # Interrupt/cancel the running process
```

### View Output

```bash
clrun tail <terminal_id> [--lines <n>]   # Last N lines (default: 50)
clrun head <terminal_id> [--lines <n>]   # First N lines (default: 50)
clrun <terminal_id>                       # Shorthand for tail
```

### Check Status

```bash
clrun status
```

Returns YAML with all terminal sessions, states, and queue depths.

### Kill a Session

```bash
clrun kill <terminal_id>
```

Terminates a running PTY session.

## Interacting with TUI Prompts

Modern CLI tools use rich TUI frameworks (@clack/prompts, inquirer, etc.) that
render interactive widgets. Here's how to handle each type:

### Text Input Prompts

```
◆  Project name:
│  default-value
```

**Action:** Send text — it replaces the default and presses Enter automatically.
```bash
clrun <id> "my-project"
```

To **accept the default**, send an empty Enter:
```bash
clrun key <id> enter
```

### Single-Select Lists

```
◆  Select a framework:
│  ● Vanilla       ← currently highlighted
│  ○ Vue
│  ○ React
│  ○ Svelte
```

**Action:** Use `down`/`up` to move the highlight, then `enter` to select.
```bash
clrun key <id> down down enter    # Selects "React" (3rd item)
```

To **accept the default** (first item):
```bash
clrun key <id> enter
```

### Multi-Select (Checkbox) Lists

```
◆  Select features: (space to select, enter to confirm)
│  ◻ TypeScript        ← cursor here
│  ◻ Router
│  ◻ Linter
│  ◻ Prettier
```

**Action:** Use `space` to toggle each checkbox, `down`/`up` to move, then `enter` to confirm.
```bash
# Select TypeScript (1st), skip Router, select Linter (3rd), confirm:
clrun key <id> space down down space enter
```

To **skip all** (select none):
```bash
clrun key <id> enter
```

### Yes/No Confirm Prompts

```
◆  Use TypeScript?
│  ● Yes / ○ No
```

**Action:** `enter` accepts the highlighted default. Use `left`/`right` or
`down`/`up` to switch between Yes/No first if needed.
```bash
clrun key <id> enter              # Accept default (Yes)
clrun key <id> right enter        # Switch to No, then confirm
```

### Readline-Style Prompts (simple text)

```
package name: (my-project)
```

**Action:** Send text directly — these are basic line-buffered prompts.
```bash
clrun <id> "my-custom-name"     # Type and press Enter
clrun <id> ""                    # Accept the default (just Enter)
```

## Real-World Interactive Workflows

### Scaffolding a Vue App (create-vue)

```bash
clrun "npx create-vue@latest"
# → Project name prompt
clrun <id> "my-vue-app"
# → Feature multi-select (TypeScript, Router, Pinia, Linter, etc.)
clrun key <id> space down down space down space down down down space down down enter
# → Experimental features multi-select
clrun key <id> enter              # Skip all
# → Blank project confirm
clrun key <id> enter              # Accept default (No)
# → Scaffolding done! Install deps:
clrun <id> "cd my-vue-app && npm install"
clrun <id> "npm run dev"
```

### Scaffolding a React App (create-vite)

```bash
clrun "npx create-vite@latest"
# → Project name prompt
clrun <id> "my-react-app"
# → Framework select list (Vanilla, Vue, React, ...)
clrun key <id> down down enter    # Select React
# → Variant select list (TypeScript, JS, SWC, ...)
clrun key <id> enter              # Accept default (TypeScript)
# → Install confirm
clrun key <id> enter              # Yes
```

### Running npm init

```bash
clrun "npm init"
# → package name:
clrun <id> "my-package"
# → version:
clrun <id> ""                    # Accept default (1.0.0)
# → description:
clrun <id> "A cool project"
# → entry point:
clrun <id> ""                    # Accept default
# Continue for each prompt...
```

### Monitoring a Dev Server

```bash
clrun "npm run dev"
# → Wait for server to start, then read output
clrun tail <id> --lines 20
# → Look for "ready" / URL in output
# Session stays alive — the dev server keeps running
clrun kill <id>                  # Stop when done
```

## Session States

| State | Meaning |
|-------|---------|
| `running` | PTY is active and accepting input |
| `suspended` | Idle timeout — env saved, PTY shut down, auto-restores on input |
| `exited` | Command completed (check `last_exit_code`) |
| `killed` | Session was manually terminated |
| `detached` | Session lost due to crash (not recoverable) |

## Suspended Sessions (Auto-Restore)

Sessions automatically suspend after **5 minutes of inactivity**:
- Environment variables and working directory are captured
- Buffer logs are preserved (`clrun tail` still works)
- **Sending any input auto-restores the session transparently**
- The response includes `restored: true`

```bash
# Session suspended after idle timeout
clrun tail <id>                  # Still works — reads preserved buffer
clrun <id> echo $MY_VAR          # Auto-restores, runs command, returns output
```

## Queue System

Inputs are queued deterministically:
1. **Priority DESC** — higher number sends first
2. **FIFO** for equal priority
3. **Override** cancels all pending and sends immediately

## Agent-Native Response Design

Every clrun response includes:

- **`hints`** — the complete set of valid next actions as copy-pasteable commands
- **`warnings`** — issues detected with your input or the output (e.g. likely
  shell-expanded variables, residual ANSI codes)
- **Rich errors** — not just an error message, but the reason, alternatives,
  and exact recovery commands

### Example Error Response

```yaml
error: "Session not found: abc123..."
hints:
  list_sessions: clrun status
  start_new: clrun <command>
  active_sessions: f5e6d7c8-...
  note: Found 1 active session(s).
```

### Example Warning

```yaml
input: ""
warnings:
  - "Input is empty. If you intended to send a shell variable like $MY_VAR,
     use single quotes: clrun <id> 'echo $MY_VAR'"
```

## Best Practices for AI Agents

1. **Use bare shorthand** — `clrun <command>` to start, `clrun <id> "text"` to interact
2. **Use `clrun key` for TUI navigation** — arrow keys, space to toggle, enter to confirm
3. **Read the `hints`** — every response tells you exactly what to do next
4. **Read the `warnings`** — they catch quoting errors, empty inputs, and output artifacts
5. **Use single quotes for `$` variables** — `clrun <id> 'echo $MY_VAR'` prevents shell expansion
6. **Parse YAML** — all responses are structured YAML, never plain text
7. **Poll with `tail`** to observe progress and detect prompts
8. **Use `key enter` to accept defaults** — don't send empty text for TUI prompts
9. **Use `key space` to toggle checkboxes** in multi-select lists
10. **Use priority** when queuing multiple inputs
11. **Use override** for emergency abort / flow change
12. **Just send input to suspended sessions** — they auto-restore, no pre-check needed

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
