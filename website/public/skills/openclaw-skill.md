# clrun — OpenClaw Integration Skill

## Purpose

This skill provides OpenClaw agents with the knowledge to use `clrun`
for interactive, persistent command execution within coding projects.

## Overview

`clrun` is a project-scoped CLI execution substrate. It creates interactive
terminal sessions that persist independently of your agent process, with
deterministic input queuing, keystroke navigation, and priority control.

Available via `npm install -g clrun` (Node.js) or `pip install clrun` (Python).
Both runtimes produce identical YAML output and use the same CLI commands.

All responses are **structured YAML** with `hints` (valid next actions) and
`warnings` (detected issues).

## Command Reference

### Create Session
```bash
clrun <command>                   # Bare shorthand
clrun run "<shell_command>"       # Explicit
```

### Send Text Input
```bash
clrun <id> "<text>"               # Bare shorthand (sends text + Enter)
clrun input <id> "<text>" [--priority N] [--override]
```

### Send Keystrokes (TUI navigation)
```bash
clrun key <id> <key> [<key>...]
```
Keys: `up`, `down`, `left`, `right`, `enter`, `tab`, `escape`, `space`,
`backspace`, `delete`, `home`, `end`, `pageup`, `pagedown`,
`ctrl-c`, `ctrl-d`, `ctrl-z`, `ctrl-l`, `ctrl-a`, `ctrl-e`, `y`, `n`

### Read Output
```bash
clrun tail <id> [--lines N]       # Latest output (default: 50)
clrun head <id> [--lines N]       # First output (default: 50)
clrun <id>                        # Shorthand for tail
```

### Status & Control
```bash
clrun status                      # All sessions
clrun kill <id>                   # Terminate session
```

## Prompt Type Identification & Handling

When you observe a prompt in `tail` output, identify its type:

### Text Input — send text
```
◆  Project name:
│  default-value
```
```bash
clrun <id> "my-project"           # Type custom name
clrun key <id> enter              # Accept the default
```

### Single-Select — navigate with arrows, confirm with enter
```
◆  Select a framework:
│  ● Vanilla       ← 0 downs
│  ○ Vue           ← 1 down
│  ○ React         ← 2 downs
│  ○ Svelte        ← 3 downs
```
```bash
clrun key <id> down down enter    # Select React (2 downs + enter)
clrun key <id> enter              # Accept default (Vanilla)
```

### Multi-Select — toggle with space, navigate with arrows, confirm with enter
```
◆  Select features:
│  ◻ TypeScript    ← toggle with space
│  ◻ Router
│  ◻ Linter
│  ◻ Prettier
```
```bash
# Select TypeScript + Linter (1st and 3rd):
clrun key <id> space down down space enter
#              TS    skip  skip  Linter confirm
```

### Confirm — enter to accept default, arrows to switch
```
◆  Use TypeScript?
│  ● Yes / ○ No
```
```bash
clrun key <id> enter              # Accept default (Yes)
clrun key <id> right enter        # Switch to No, confirm
```

### Readline — send text directly
```
package name: (my-project)
```
```bash
clrun <id> "custom-name"          # Custom value
clrun <id> ""                     # Accept default (empty = Enter)
```

## Agent Workflow Pattern

```
1. EXECUTE   →  result = shell("clrun <command>")
2. PARSE     →  terminal_id = yaml_parse(result).terminal_id
3. OBSERVE   →  output = shell("clrun tail " + id + " --lines 30")
4. IDENTIFY  →  what type of prompt is showing? (text/select/multi/confirm)
5. INTERACT  →  shell("clrun <id> 'text'") or shell("clrun key <id> down enter")
6. REPEAT    →  go to 3 until the task is complete
7. VERIFY    →  status = shell("clrun status")
8. CLEANUP   →  shell("clrun kill " + id)
```

## Real-World Example: create-vue

```bash
# Start scaffolder
clrun "npx create-vue@latest"

# Text input → project name
clrun <id> "my-vue-app"

# Multi-select → pick TypeScript, Router, Pinia, Linter
clrun key <id> space down down space down space down down down space down down enter

# Multi-select → skip experimental features
clrun key <id> enter

# Confirm → keep example code (accept default)
clrun key <id> enter

# Shell commands → install and run
clrun <id> "cd my-vue-app && npm install"
clrun <id> "npm run dev"
```

## Real-World Example: create-vite (React + TypeScript)

```bash
clrun "npx create-vite@latest"
clrun <id> "my-react-app"                  # Project name (text input)
clrun key <id> down down enter             # Framework → React (select list)
clrun key <id> enter                        # Variant → TypeScript (default)
clrun key <id> enter                        # Install → Yes (confirm)
```

## Session States

| State | Meaning | Can receive input? |
|-------|---------|--------------------|
| `running` | PTY is active | Yes |
| `suspended` | Idle timeout, env saved | Yes (auto-restores) |
| `exited` | Command finished | No |
| `killed` | Manually terminated | No |
| `detached` | Crashed/orphaned | No |

## Queue Behavior

| Property | Behavior |
|----------|----------|
| Ordering | Priority DESC, then FIFO |
| Default priority | 0 |
| Override mode | Cancels all pending, sends immediately |
| Processing interval | 200ms |

## Key Rules for Agents

1. **Use `clrun key` for TUI prompts** — select lists, checkboxes, confirms
2. **Use `clrun <id> "text"` for text prompts** — readline and text fields
3. **Read the `hints`** in every response — they tell you exactly what to do next
4. **Read the `warnings`** — they catch quoting errors and output artifacts
5. **Single-quote `$` variables** — `clrun <id> 'echo $MY_VAR'`
6. **Count items from top** for select lists — target position minus 1 = number of `down` presses
7. **Accept defaults with `key enter`** — not empty text for TUI prompts
8. **Parse YAML** — all responses are structured YAML, never plain text
9. **Store terminal_ids** — needed for all subsequent operations
10. **Just send input to suspended sessions** — they auto-restore, no pre-check needed

## File Structure

All state in `.clrun/` at project root:
- `sessions/*.json` — session metadata
- `queues/*.json` — input queues
- `buffers/*.log` — raw PTY output
- `ledger/events.log` — audit trail
- `skills/*.md` — this file and others
