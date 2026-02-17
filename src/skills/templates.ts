/**
 * Skill markdown templates. These are installed into .clrun/skills/
 * on first initialization.
 */

export const CLRUN_SKILL = `# clrun — CLI Skill Reference

## Overview

\`clrun\` is a project-scoped, persistent, deterministic CLI execution substrate
designed for AI coding agents. It provides interactive PTY sessions with queued
input, priority control, keystroke navigation, and crash recovery.

All responses are **structured YAML** with contextual \`hints\` that tell you
exactly what to do next. Every error includes recovery steps. Every success
includes the full set of valid next actions.

## Installation

Node.js:
\`\`\`bash
npm install -g clrun
# or: npx clrun <command>
\`\`\`

Python:
\`\`\`bash
pip install clrun-cli
\`\`\`

Both runtimes produce identical YAML output and use the same \`.clrun/\` state format.

## Commands

### Run a Command (bare shorthand)

\`\`\`bash
clrun <command>
clrun run "<command>"
\`\`\`

Creates a new interactive PTY session. Returns YAML with \`terminal_id\`.
The session starts in the **current working directory**.

**Examples:**
\`\`\`bash
clrun npm init
clrun "npx create-vue@latest"
clrun run "docker compose up"
\`\`\`

### Send Text Input

\`\`\`bash
clrun <terminal_id> "<text>"
clrun input <terminal_id> "<text>" [--priority <n>] [--override]
\`\`\`

Sends text to a running session followed by Enter. Use the bare shorthand
(\`clrun <id> "text"\`) for quick input, or \`clrun input\` for priority/override.

- **--priority <n>**: Higher number = higher priority (default: 0)
- **--override**: Cancel all pending inputs, send this immediately

**Examples:**
\`\`\`bash
clrun abc123 "my-project-name"
clrun abc123 "yes"
clrun input abc123 "force-reset" --override
\`\`\`

### Send Keystrokes (for TUI navigation)

\`\`\`bash
clrun key <terminal_id> <key> [<key>...]
\`\`\`

Sends named keystrokes to navigate TUI prompts — select lists, multi-select
checkboxes, confirm dialogs, and more. Keys are sent as raw escape sequences
**without** a trailing Enter (unless you include \`enter\` explicitly).

**Available keys:**
\`up\`, \`down\`, \`left\`, \`right\`, \`enter\`, \`tab\`, \`escape\`, \`space\`,
\`backspace\`, \`delete\`, \`home\`, \`end\`, \`pageup\`, \`pagedown\`,
\`ctrl-c\`, \`ctrl-d\`, \`ctrl-z\`, \`ctrl-l\`, \`ctrl-a\`, \`ctrl-e\`, \`y\`, \`n\`

**Examples:**
\`\`\`bash
clrun key abc123 down down enter       # Navigate a select list → pick 3rd item
clrun key abc123 space down space enter # Toggle 1st + 2nd checkbox, confirm
clrun key abc123 enter                  # Accept the default / confirm
clrun key abc123 ctrl-c                 # Interrupt/cancel the running process
\`\`\`

### View Output

\`\`\`bash
clrun tail <terminal_id> [--lines <n>]   # Last N lines (default: 50)
clrun head <terminal_id> [--lines <n>]   # First N lines (default: 50)
clrun <terminal_id>                       # Shorthand for tail
\`\`\`

### Check Status

\`\`\`bash
clrun status
\`\`\`

Returns YAML with all terminal sessions, states, and queue depths.

### Kill a Session

\`\`\`bash
clrun kill <terminal_id>
\`\`\`

Terminates a running PTY session.

## Interacting with TUI Prompts

Modern CLI tools use rich TUI frameworks (@clack/prompts, inquirer, etc.) that
render interactive widgets. Here's how to handle each type:

### Text Input Prompts

\`\`\`
◆  Project name:
│  default-value
\`\`\`

**Action:** Send text — it replaces the default and presses Enter automatically.
\`\`\`bash
clrun <id> "my-project"
\`\`\`

To **accept the default**, send an empty Enter:
\`\`\`bash
clrun key <id> enter
\`\`\`

### Single-Select Lists

\`\`\`
◆  Select a framework:
│  ● Vanilla       ← currently highlighted
│  ○ Vue
│  ○ React
│  ○ Svelte
\`\`\`

**Action:** Use \`down\`/\`up\` to move the highlight, then \`enter\` to select.
\`\`\`bash
clrun key <id> down down enter    # Selects "React" (3rd item)
\`\`\`

To **accept the default** (first item):
\`\`\`bash
clrun key <id> enter
\`\`\`

### Multi-Select (Checkbox) Lists

\`\`\`
◆  Select features: (space to select, enter to confirm)
│  ◻ TypeScript        ← cursor here
│  ◻ Router
│  ◻ Linter
│  ◻ Prettier
\`\`\`

**Action:** Use \`space\` to toggle each checkbox, \`down\`/\`up\` to move, then \`enter\` to confirm.
\`\`\`bash
# Select TypeScript (1st), skip Router, select Linter (3rd), confirm:
clrun key <id> space down down space enter
\`\`\`

To **skip all** (select none):
\`\`\`bash
clrun key <id> enter
\`\`\`

### Yes/No Confirm Prompts

\`\`\`
◆  Use TypeScript?
│  ● Yes / ○ No
\`\`\`

**Action:** \`enter\` accepts the highlighted default. Use \`left\`/\`right\` or
\`down\`/\`up\` to switch between Yes/No first if needed.
\`\`\`bash
clrun key <id> enter              # Accept default (Yes)
clrun key <id> right enter        # Switch to No, then confirm
\`\`\`

### Readline-Style Prompts (simple text)

\`\`\`
package name: (my-project)
\`\`\`

**Action:** Send text directly — these are basic line-buffered prompts.
\`\`\`bash
clrun <id> "my-custom-name"     # Type and press Enter
clrun <id> ""                    # Accept the default (just Enter)
\`\`\`

## Real-World Interactive Workflows

### Scaffolding a Vue App (create-vue)

\`\`\`bash
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
\`\`\`

### Scaffolding a React App (create-vite)

\`\`\`bash
clrun "npx create-vite@latest"
# → Project name prompt
clrun <id> "my-react-app"
# → Framework select list (Vanilla, Vue, React, ...)
clrun key <id> down down enter    # Select React
# → Variant select list (TypeScript, JS, SWC, ...)
clrun key <id> enter              # Accept default (TypeScript)
# → Install confirm
clrun key <id> enter              # Yes
\`\`\`

### Running npm init

\`\`\`bash
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
\`\`\`

### Monitoring a Dev Server

\`\`\`bash
clrun "npm run dev"
# → Wait for server to start, then read output
clrun tail <id> --lines 20
# → Look for "ready" / URL in output
# Session stays alive — the dev server keeps running
clrun kill <id>                  # Stop when done
\`\`\`

## Session States

| State | Meaning |
|-------|---------|
| \`running\` | PTY is active and accepting input |
| \`suspended\` | Idle timeout — env saved, PTY shut down, auto-restores on input |
| \`exited\` | Command completed (check \`last_exit_code\`) |
| \`killed\` | Session was manually terminated |
| \`detached\` | Session lost due to crash (not recoverable) |

## Suspended Sessions (Auto-Restore)

Sessions automatically suspend after **5 minutes of inactivity**:
- Environment variables and working directory are captured
- Buffer logs are preserved (\`clrun tail\` still works)
- **Sending any input auto-restores the session transparently**
- The response includes \`restored: true\`

\`\`\`bash
# Session suspended after idle timeout
clrun tail <id>                  # Still works — reads preserved buffer
clrun <id> echo $MY_VAR          # Auto-restores, runs command, returns output
\`\`\`

## Queue System

Inputs are queued deterministically:
1. **Priority DESC** — higher number sends first
2. **FIFO** for equal priority
3. **Override** cancels all pending and sends immediately

## Agent-Native Response Design

Every clrun response includes:

- **\`hints\`** — the complete set of valid next actions as copy-pasteable commands
- **\`warnings\`** — issues detected with your input or the output (e.g. likely
  shell-expanded variables, residual ANSI codes)
- **Rich errors** — not just an error message, but the reason, alternatives,
  and exact recovery commands

### Example Error Response

\`\`\`yaml
error: "Session not found: abc123..."
hints:
  list_sessions: clrun status
  start_new: clrun <command>
  active_sessions: f5e6d7c8-...
  note: Found 1 active session(s).
\`\`\`

### Example Warning

\`\`\`yaml
input: ""
warnings:
  - "Input is empty. If you intended to send a shell variable like $MY_VAR,
     use single quotes: clrun <id> 'echo $MY_VAR'"
\`\`\`

## Best Practices for AI Agents

1. **Use bare shorthand** — \`clrun <command>\` to start, \`clrun <id> "text"\` to interact
2. **Use \`clrun key\` for TUI navigation** — arrow keys, space to toggle, enter to confirm
3. **Read the \`hints\`** — every response tells you exactly what to do next
4. **Read the \`warnings\`** — they catch quoting errors, empty inputs, and output artifacts
5. **Use single quotes for \`$\` variables** — \`clrun <id> 'echo $MY_VAR'\` prevents shell expansion
6. **Parse YAML** — all responses are structured YAML, never plain text
7. **Poll with \`tail\`** to observe progress and detect prompts
8. **Use \`key enter\` to accept defaults** — don't send empty text for TUI prompts
9. **Use \`key space\` to toggle checkboxes** in multi-select lists
10. **Use priority** when queuing multiple inputs
11. **Use override** for emergency abort / flow change
12. **Just send input to suspended sessions** — they auto-restore, no pre-check needed

## State Files

All state lives in \`.clrun/\` within the project root:

\`\`\`
.clrun/
  sessions/<id>.json    # Session metadata
  queues/<id>.json      # Input queue
  buffers/<id>.log      # Raw PTY output
  ledger/events.log     # Event audit trail
  skills/               # This file and others
\`\`\`
`;

export const CLAUDE_CODE_SKILL = `# clrun — Claude Code Integration Skill

## Purpose

This skill teaches Claude Code how to use \`clrun\` for interactive command
execution. Use \`clrun\` whenever you need to run commands that require
interactive input, TUI navigation, long-running processes, or deterministic
execution control.

## When to Use clrun

- **Interactive scaffolders** — create-vue, create-vite, create-astro, npm init
- **TUI tools** with select lists, checkboxes, and confirm dialogs
- **Long-running processes** — dev servers, test suites, docker builds
- **Stateful sessions** — setting env vars, then querying them later
- **Any command that prompts** for user input

## Quick Reference

| Action | Command |
|--------|---------|
| Start a session | \`clrun <command>\` |
| Send text + Enter | \`clrun <id> "text"\` |
| Navigate TUI | \`clrun key <id> down enter\` |
| Toggle checkbox | \`clrun key <id> space\` |
| Accept default | \`clrun key <id> enter\` |
| View latest output | \`clrun tail <id>\` or \`clrun <id>\` |
| Check all sessions | \`clrun status\` |
| Kill a session | \`clrun kill <id>\` |
| Interrupt (Ctrl+C) | \`clrun key <id> ctrl-c\` |

## Two Input Modes

### Text Input (\`clrun <id> "text"\`)

Sends text followed by Enter (\\r). Use for:
- Typing text into prompts (project names, descriptions, etc.)
- Sending shell commands to the running session
- Responding to simple yes/no or readline-style prompts

\`\`\`bash
clrun <id> "my-project-name"    # Type text and press Enter
clrun <id> ""                    # Just press Enter (accept default for readline prompts)
\`\`\`

### Keystroke Input (\`clrun key <id> <keys...>\`)

Sends raw keystrokes. Use for:
- Navigating select lists (\`up\`, \`down\`, \`enter\`)
- Toggling checkboxes (\`space\`)
- Accepting TUI defaults (\`enter\`)
- Switching Yes/No (\`left\`, \`right\`)
- Interrupting processes (\`ctrl-c\`)

\`\`\`bash
clrun key <id> down down enter           # Select 3rd item in a list
clrun key <id> space down space enter    # Toggle checkboxes 1 and 2, confirm
clrun key <id> enter                      # Accept default / confirm
\`\`\`

**Available keys:**
\`up\`, \`down\`, \`left\`, \`right\`, \`enter\`, \`tab\`, \`escape\`, \`space\`,
\`backspace\`, \`delete\`, \`home\`, \`end\`, \`pageup\`, \`pagedown\`,
\`ctrl-c\`, \`ctrl-d\`, \`ctrl-z\`, \`ctrl-l\`, \`ctrl-a\`, \`ctrl-e\`, \`y\`, \`n\`

## Identifying Prompt Types

When you \`tail\` a session and see a prompt, identify its type to choose the
right input method:

| You see | Type | Action |
|---------|------|--------|
| \`◆  Project name: │  default\` | Text input | \`clrun <id> "name"\` or \`clrun key <id> enter\` |
| \`● Option1  ○ Option2  ○ Option3\` | Single-select | \`clrun key <id> down... enter\` |
| \`◻ Option1  ◻ Option2  ◻ Option3\` | Multi-select | \`clrun key <id> space down... enter\` |
| \`● Yes / ○ No\` | Confirm | \`clrun key <id> enter\` or \`clrun key <id> right enter\` |
| \`(y/n)\`, \`[Y/n]\` | Simple confirm | \`clrun <id> "y"\` or \`clrun <id> "n"\` |
| \`package name: (default)\` | Readline | \`clrun <id> "value"\` or \`clrun <id> ""\` |

## Counting Items in Select Lists

When navigating a select list, count the items from the top to find your target:
- The **first item** is always highlighted by default (●)
- Each \`down\` moves one position
- To select the Nth item: send N-1 \`down\` presses, then \`enter\`

\`\`\`
◆  Select a framework:
│  ● Vanilla       ← position 1 (0 downs)
│  ○ Vue           ← position 2 (1 down)
│  ○ React         ← position 3 (2 downs)
│  ○ Svelte        ← position 4 (3 downs)
\`\`\`

\`\`\`bash
clrun key <id> down down enter   # Selects React (2 downs from top)
\`\`\`

## Multi-Select Pattern

For multi-select, plan your moves as a sequence of \`space\` (toggle) and \`down\`
(skip) from top to bottom, ending with \`enter\`:

\`\`\`
◆  Select features:
│  ◻ TypeScript     ← want this ✓
│  ◻ JSX            ← skip
│  ◻ Router         ← want this ✓
│  ◻ Pinia          ← want this ✓
│  ◻ Vitest         ← skip
│  ◻ Linter         ← want this ✓
│  ◻ Prettier       ← skip
\`\`\`

\`\`\`bash
clrun key <id> space down down space down space down down space down down enter
#              TS    skip  skip  Router Pinia skip  skip  Linter skip  skip  confirm
\`\`\`

## Real-World Example: create-vue

\`\`\`bash
# 1. Start the scaffolder
clrun "npx create-vue@latest"
# Read the terminal_id from the response

# 2. Wait for first prompt, then tail
clrun tail <id> --lines 20
# → ◆  Project name: │  vue-project

# 3. Enter project name
clrun <id> "my-vue-app"
# → ◆  Select features: ◻ TypeScript ◻ Router ...

# 4. Toggle features (TypeScript + Router + Pinia + Linter)
clrun key <id> space down down space down space down down down space down down enter

# 5. Skip experimental features
clrun key <id> enter

# 6. Accept "keep example code" default
clrun key <id> enter

# 7. Install and run
clrun <id> "cd my-vue-app && npm install"
# Wait for install...
clrun tail <id> --lines 10
clrun <id> "npm run dev"
\`\`\`

## Real-World Example: create-vite (React)

\`\`\`bash
clrun "npx create-vite@latest"
clrun <id> "my-react-app"                    # Project name
clrun key <id> down down enter               # Select React (3rd)
clrun key <id> enter                          # TypeScript (default)
clrun key <id> enter                          # Accept install
# Wait for deps + dev server startup
clrun tail <id> --lines 15
\`\`\`

## Lifecycle Pattern

\`\`\`
1. START    →  clrun <command>                    → get terminal_id
2. OBSERVE  →  clrun tail <id>                    → read output, identify prompt
3. INTERACT →  clrun <id> "text" / clrun key <id> → send input
4. REPEAT   →  go to 2 until done
5. VERIFY   →  clrun status                       → check exit codes
6. CLEANUP  →  clrun kill <id>                    → if needed
\`\`\`

## Reading Responses

All responses are YAML. Key fields:

- **\`terminal_id\`** — store this, you need it for everything
- **\`output\`** — cleaned terminal output (ANSI stripped, prompts filtered)
- **\`status\`** — \`running\`, \`suspended\`, \`exited\`, \`killed\`, \`detached\`
- **\`hints\`** — the exact commands you can run next (copy-pasteable)
- **\`warnings\`** — issues with your input or detected output artifacts
- **\`restored\`** — \`true\` if the session was auto-restored from suspension

## Shell Variable Quoting

When sending commands containing \`$\` variables, use **single quotes** to prevent
your shell from expanding them before clrun receives them:

\`\`\`bash
clrun <id> 'echo $MY_VAR'          # Correct — variable reaches the session
clrun <id> "echo $MY_VAR"          # Wrong — your shell expands it first
\`\`\`

## Suspended Sessions

Sessions suspend after 5 minutes of inactivity. Just send input normally — they
auto-restore transparently. No need to check status first.

## Important Rules

1. **Parse YAML** — all responses are structured YAML
2. **Read the hints** — they tell you exactly what to do next
3. **Use \`key\` for TUI prompts** — never type escape sequences as text
4. **Use text input for readline prompts** — \`clrun <id> "text"\`
5. **Single-quote \`$\` variables** — prevents premature shell expansion
6. **Accept defaults with \`key enter\`** — not with empty text for TUI prompts
7. **Count items from top** for select lists — N-1 \`down\` presses for item N
`;

export const OPENCLAW_SKILL = `# clrun — OpenClaw Integration Skill

## Purpose

This skill provides OpenClaw agents with the knowledge to use \`clrun\`
for interactive, persistent command execution within coding projects.

## Overview

\`clrun\` is a project-scoped CLI execution substrate. It creates interactive
terminal sessions that persist independently of your agent process, with
deterministic input queuing, keystroke navigation, and priority control.

All responses are **structured YAML** with \`hints\` (valid next actions) and
\`warnings\` (detected issues).

## Command Reference

### Create Session
\`\`\`bash
clrun <command>                   # Bare shorthand
clrun run "<shell_command>"       # Explicit
\`\`\`

### Send Text Input
\`\`\`bash
clrun <id> "<text>"               # Bare shorthand (sends text + Enter)
clrun input <id> "<text>" [--priority N] [--override]
\`\`\`

### Send Keystrokes (TUI navigation)
\`\`\`bash
clrun key <id> <key> [<key>...]
\`\`\`
Keys: \`up\`, \`down\`, \`left\`, \`right\`, \`enter\`, \`tab\`, \`escape\`, \`space\`,
\`backspace\`, \`delete\`, \`home\`, \`end\`, \`pageup\`, \`pagedown\`,
\`ctrl-c\`, \`ctrl-d\`, \`ctrl-z\`, \`ctrl-l\`, \`ctrl-a\`, \`ctrl-e\`, \`y\`, \`n\`

### Read Output
\`\`\`bash
clrun tail <id> [--lines N]       # Latest output (default: 50)
clrun head <id> [--lines N]       # First output (default: 50)
clrun <id>                        # Shorthand for tail
\`\`\`

### Status & Control
\`\`\`bash
clrun status                      # All sessions
clrun kill <id>                   # Terminate session
\`\`\`

## Prompt Type Identification & Handling

When you observe a prompt in \`tail\` output, identify its type:

### Text Input — send text
\`\`\`
◆  Project name:
│  default-value
\`\`\`
\`\`\`bash
clrun <id> "my-project"           # Type custom name
clrun key <id> enter              # Accept the default
\`\`\`

### Single-Select — navigate with arrows, confirm with enter
\`\`\`
◆  Select a framework:
│  ● Vanilla       ← 0 downs
│  ○ Vue           ← 1 down
│  ○ React         ← 2 downs
│  ○ Svelte        ← 3 downs
\`\`\`
\`\`\`bash
clrun key <id> down down enter    # Select React (2 downs + enter)
clrun key <id> enter              # Accept default (Vanilla)
\`\`\`

### Multi-Select — toggle with space, navigate with arrows, confirm with enter
\`\`\`
◆  Select features:
│  ◻ TypeScript    ← toggle with space
│  ◻ Router
│  ◻ Linter
│  ◻ Prettier
\`\`\`
\`\`\`bash
# Select TypeScript + Linter (1st and 3rd):
clrun key <id> space down down space enter
#              TS    skip  skip  Linter confirm
\`\`\`

### Confirm — enter to accept default, arrows to switch
\`\`\`
◆  Use TypeScript?
│  ● Yes / ○ No
\`\`\`
\`\`\`bash
clrun key <id> enter              # Accept default (Yes)
clrun key <id> right enter        # Switch to No, confirm
\`\`\`

### Readline — send text directly
\`\`\`
package name: (my-project)
\`\`\`
\`\`\`bash
clrun <id> "custom-name"          # Custom value
clrun <id> ""                     # Accept default (empty = Enter)
\`\`\`

## Agent Workflow Pattern

\`\`\`
1. EXECUTE   →  result = shell("clrun <command>")
2. PARSE     →  terminal_id = yaml_parse(result).terminal_id
3. OBSERVE   →  output = shell("clrun tail " + id + " --lines 30")
4. IDENTIFY  →  what type of prompt is showing? (text/select/multi/confirm)
5. INTERACT  →  shell("clrun <id> 'text'") or shell("clrun key <id> down enter")
6. REPEAT    →  go to 3 until the task is complete
7. VERIFY    →  status = shell("clrun status")
8. CLEANUP   →  shell("clrun kill " + id)
\`\`\`

## Real-World Example: create-vue

\`\`\`bash
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
\`\`\`

## Real-World Example: create-vite (React + TypeScript)

\`\`\`bash
clrun "npx create-vite@latest"
clrun <id> "my-react-app"                  # Project name (text input)
clrun key <id> down down enter             # Framework → React (select list)
clrun key <id> enter                        # Variant → TypeScript (default)
clrun key <id> enter                        # Install → Yes (confirm)
\`\`\`

## Session States

| State | Meaning | Can receive input? |
|-------|---------|--------------------|
| \`running\` | PTY is active | Yes |
| \`suspended\` | Idle timeout, env saved | Yes (auto-restores) |
| \`exited\` | Command finished | No |
| \`killed\` | Manually terminated | No |
| \`detached\` | Crashed/orphaned | No |

## Queue Behavior

| Property | Behavior |
|----------|----------|
| Ordering | Priority DESC, then FIFO |
| Default priority | 0 |
| Override mode | Cancels all pending, sends immediately |
| Processing interval | 200ms |

## Key Rules for Agents

1. **Use \`clrun key\` for TUI prompts** — select lists, checkboxes, confirms
2. **Use \`clrun <id> "text"\` for text prompts** — readline and text fields
3. **Read the \`hints\`** in every response — they tell you exactly what to do next
4. **Read the \`warnings\`** — they catch quoting errors and output artifacts
5. **Single-quote \`$\` variables** — \`clrun <id> 'echo $MY_VAR'\`
6. **Count items from top** for select lists — target position minus 1 = number of \`down\` presses
7. **Accept defaults with \`key enter\`** — not empty text for TUI prompts
8. **Parse YAML** — all responses are structured YAML, never plain text
9. **Store terminal_ids** — needed for all subsequent operations
10. **Just send input to suspended sessions** — they auto-restore, no pre-check needed

## File Structure

All state in \`.clrun/\` at project root:
- \`sessions/*.json\` — session metadata
- \`queues/*.json\` — input queues
- \`buffers/*.log\` — raw PTY output
- \`ledger/events.log\` — audit trail
- \`skills/*.md\` — this file and others
`;

// ─── Agent Skills Spec (agentskills.io) ──────────────────────────────────────

export const AGENT_SKILL_MD = `---
name: clrun
description: Run and control interactive CLI sessions for AI agents. Handles TUI prompts (select lists, checkboxes, confirms), persistent shell state, and long-running processes. Use when you need to execute terminal commands, respond to interactive prompts, navigate scaffolding wizards like create-vue or create-vite, or manage dev servers.
license: MIT
metadata:
  author: cybertheory
  version: "1.0.1"
compatibility: Requires Node.js >= 18 or Python >= 3.9. Works on macOS and Linux. Node version also supports Windows.
---

# clrun — The Interactive CLI for AI Agents

No more \\\`--yes\\\` flags or command retries. \\\`clrun\\\` gives you full control over interactive terminal sessions with structured YAML responses.

## Install

Node.js:
\\\`\\\`\\\`bash
npm install -g clrun
\\\`\\\`\\\`

Python:
\\\`\\\`\\\`bash
pip install clrun-cli
\\\`\\\`\\\`

## Core Commands

| Action | Command |
|--------|---------|
| Run a command | \\\`clrun <command>\\\` |
| Send text + Enter | \\\`clrun <id> "text"\\\` |
| Send keystrokes | \\\`clrun key <id> down enter\\\` |
| Toggle checkbox | \\\`clrun key <id> space\\\` |
| Accept default | \\\`clrun key <id> enter\\\` |
| View output | \\\`clrun tail <id>\\\` |
| Check sessions | \\\`clrun status\\\` |
| Kill session | \\\`clrun kill <id>\\\` |
| Interrupt | \\\`clrun key <id> ctrl-c\\\` |

## Two Input Modes

**Text input** — sends text followed by Enter:
\\\`\\\`\\\`bash
clrun <id> "my-project-name"    # Type and press Enter
clrun <id> ""                    # Just press Enter
\\\`\\\`\\\`

**Keystroke input** — sends raw keys for TUI navigation:
\\\`\\\`\\\`bash
clrun key <id> down down enter           # Select 3rd item in list
clrun key <id> space down space enter    # Toggle checkboxes 1 and 2
clrun key <id> enter                      # Accept default
\\\`\\\`\\\`

Available keys: \\\`up\\\`, \\\`down\\\`, \\\`left\\\`, \\\`right\\\`, \\\`enter\\\`, \\\`tab\\\`, \\\`escape\\\`, \\\`space\\\`, \\\`backspace\\\`, \\\`delete\\\`, \\\`home\\\`, \\\`end\\\`, \\\`pageup\\\`, \\\`pagedown\\\`, \\\`ctrl-c\\\`, \\\`ctrl-d\\\`, \\\`ctrl-z\\\`, \\\`ctrl-l\\\`, \\\`ctrl-a\\\`, \\\`ctrl-e\\\`, \\\`y\\\`, \\\`n\\\`

## Identifying Prompt Types

| You see | Type | Action |
|---------|------|--------|
| \\\`◆ Name: │ default\\\` | Text input | \\\`clrun <id> "value"\\\` or \\\`clrun key <id> enter\\\` |
| \\\`● Opt1 ○ Opt2 ○ Opt3\\\` | Single-select | \\\`clrun key <id> down... enter\\\` |
| \\\`◻ Opt1 ◻ Opt2 ◻ Opt3\\\` | Multi-select | \\\`clrun key <id> space down... enter\\\` |
| \\\`● Yes / ○ No\\\` | Confirm | \\\`clrun key <id> enter\\\` or \\\`right enter\\\` |
| \\\`(y/n)\\\` | Simple confirm | \\\`clrun <id> "y"\\\` or \\\`clrun <id> "n"\\\` |
| \\\`name: (default)\\\` | Readline | \\\`clrun <id> "value"\\\` or \\\`clrun <id> ""\\\` |

## Select List Navigation

Count items from the top. First item is highlighted by default. To select item N, send N-1 \\\`down\\\` presses then \\\`enter\\\`.

## Multi-Select Pattern

Plan a sequence of \\\`space\\\` (toggle) and \\\`down\\\` (skip) from top to bottom, ending with \\\`enter\\\`:

\\\`\\\`\\\`bash
# Select items 1, 3, and 4 from a list of 5:
clrun key <id> space down down space down space enter
\\\`\\\`\\\`

## Reading Responses

All responses are structured YAML. Key fields:
- **\\\`terminal_id\\\`** — store this for all subsequent calls
- **\\\`output\\\`** — cleaned terminal output (ANSI stripped)
- **\\\`status\\\`** — \\\`running\\\`, \\\`suspended\\\`, \\\`exited\\\`, \\\`killed\\\`, \\\`detached\\\`
- **\\\`hints\\\`** — exact commands you can run next
- **\\\`warnings\\\`** — detected issues with input or output

## Workflow Pattern

1. START → \\\`clrun <command>\\\` → get terminal_id
2. OBSERVE → \\\`clrun tail <id>\\\` → read output, identify prompt
3. INTERACT → \\\`clrun <id> "text"\\\` or \\\`clrun key <id> ...\\\` → respond
4. REPEAT → steps 2-3 until done
5. CLEANUP → \\\`clrun kill <id>\\\` → if needed

## Shell Variable Quoting

Use single quotes to prevent your shell from expanding \\\`$\\\` variables:
\\\`\\\`\\\`bash
clrun <id> 'echo $MY_VAR'          # Correct
clrun <id> "echo $MY_VAR"          # Wrong — expanded before clrun sees it
\\\`\\\`\\\`

## Session Persistence

- Environment variables persist within a session
- Sessions auto-suspend after 5 min idle (env and cwd saved)
- Sending input to a suspended session auto-restores it

See [references/tui-patterns.md](references/tui-patterns.md) for complete real-world examples.
`;

export const AGENT_SKILL_TUI_PATTERNS = `# TUI Interaction Patterns — Real-World Examples

Complete walkthroughs of driving interactive CLI tools with \\\`clrun\\\`.

## Example: create-vue (Vue.js scaffolder)

\\\`\\\`\\\`bash
clrun "npx create-vue@latest"
clrun <id> "my-vue-app"
clrun key <id> space down down space down space down down down space down down enter
clrun key <id> enter
clrun key <id> enter
clrun <id> "cd my-vue-app && npm install"
clrun <id> "npm run dev"
\\\`\\\`\\\`

## Example: create-vite (React + TypeScript)

\\\`\\\`\\\`bash
clrun "npx create-vite@latest"
clrun <id> "my-react-app"
clrun key <id> down down enter
clrun key <id> enter
clrun key <id> enter
\\\`\\\`\\\`

## Example: npm init (readline prompts)

\\\`\\\`\\\`bash
clrun "npm init"
clrun <id> "my-package"
clrun <id> ""
clrun <id> "A cool project"
clrun <id> ""
clrun <id> "vitest run"
clrun <id> ""
clrun <id> "cli,agent,terminal"
clrun <id> "myname"
clrun <id> "MIT"
clrun <id> "yes"
\\\`\\\`\\\`

## Example: Long-running dev server

\\\`\\\`\\\`bash
clrun "npm run dev"
clrun tail <id> --lines 20
clrun kill <id>
\\\`\\\`\\\`

## Example: Interrupting a process

\\\`\\\`\\\`bash
clrun key <id> ctrl-c
clrun tail <id> --lines 10
clrun kill <id>
\\\`\\\`\\\`

## Example: Environment variable persistence

\\\`\\\`\\\`bash
clrun "bash"
clrun <id> "export API_KEY=sk-12345"
clrun <id> 'echo $API_KEY'
# Sessions auto-suspend after 5 min idle and auto-restore on input
\\\`\\\`\\\`

## Pattern: Priority queuing

\\\`\\\`\\\`bash
clrun "npm init"
clrun input <id> "my-package" --priority 10
clrun input <id> "" --priority 9
clrun input <id> "Description" --priority 8
clrun input <id> "MIT" --priority 2
clrun input <id> "yes" --priority 1
\\\`\\\`\\\`

## Pattern: Override for recovery

\\\`\\\`\\\`bash
clrun input <id> "n" --override
clrun key <id> ctrl-c
\\\`\\\`\\\`
`;
