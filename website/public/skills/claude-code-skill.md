# clrun — Claude Code Integration Skill

## Purpose

This skill teaches Claude Code how to use `clrun` for interactive command
execution. Use `clrun` whenever you need to run commands that require
interactive input, TUI navigation, long-running processes, or deterministic
execution control.

## Prerequisites

Install via npm or pip — the CLI commands are identical:
```bash
npm install -g clrun   # Node.js
pip install clrun      # Python
```

## When to Use clrun

- **Interactive scaffolders** — create-vue, create-vite, create-astro, npm init
- **TUI tools** with select lists, checkboxes, and confirm dialogs
- **Long-running processes** — dev servers, test suites, docker builds
- **Stateful sessions** — setting env vars, then querying them later
- **Any command that prompts** for user input

## Quick Reference

| Action | Command |
|--------|---------|
| Start a session | `clrun <command>` |
| Send text + Enter | `clrun <id> "text"` |
| Navigate TUI | `clrun key <id> down enter` |
| Toggle checkbox | `clrun key <id> space` |
| Accept default | `clrun key <id> enter` |
| View latest output | `clrun tail <id>` or `clrun <id>` |
| Check all sessions | `clrun status` |
| Kill a session | `clrun kill <id>` |
| Interrupt (Ctrl+C) | `clrun key <id> ctrl-c` |

## Two Input Modes

### Text Input (`clrun <id> "text"`)

Sends text followed by Enter (\r). Use for:
- Typing text into prompts (project names, descriptions, etc.)
- Sending shell commands to the running session
- Responding to simple yes/no or readline-style prompts

```bash
clrun <id> "my-project-name"    # Type text and press Enter
clrun <id> ""                    # Just press Enter (accept default for readline prompts)
```

### Keystroke Input (`clrun key <id> <keys...>`)

Sends raw keystrokes. Use for:
- Navigating select lists (`up`, `down`, `enter`)
- Toggling checkboxes (`space`)
- Accepting TUI defaults (`enter`)
- Switching Yes/No (`left`, `right`)
- Interrupting processes (`ctrl-c`)

```bash
clrun key <id> down down enter           # Select 3rd item in a list
clrun key <id> space down space enter    # Toggle checkboxes 1 and 2, confirm
clrun key <id> enter                      # Accept default / confirm
```

**Available keys:**
`up`, `down`, `left`, `right`, `enter`, `tab`, `escape`, `space`,
`backspace`, `delete`, `home`, `end`, `pageup`, `pagedown`,
`ctrl-c`, `ctrl-d`, `ctrl-z`, `ctrl-l`, `ctrl-a`, `ctrl-e`, `y`, `n`

## Identifying Prompt Types

When you `tail` a session and see a prompt, identify its type to choose the
right input method:

| You see | Type | Action |
|---------|------|--------|
| `◆  Project name: │  default` | Text input | `clrun <id> "name"` or `clrun key <id> enter` |
| `● Option1  ○ Option2  ○ Option3` | Single-select | `clrun key <id> down... enter` |
| `◻ Option1  ◻ Option2  ◻ Option3` | Multi-select | `clrun key <id> space down... enter` |
| `● Yes / ○ No` | Confirm | `clrun key <id> enter` or `clrun key <id> right enter` |
| `(y/n)`, `[Y/n]` | Simple confirm | `clrun <id> "y"` or `clrun <id> "n"` |
| `package name: (default)` | Readline | `clrun <id> "value"` or `clrun <id> ""` |

## Counting Items in Select Lists

When navigating a select list, count the items from the top to find your target:
- The **first item** is always highlighted by default (●)
- Each `down` moves one position
- To select the Nth item: send N-1 `down` presses, then `enter`

```
◆  Select a framework:
│  ● Vanilla       ← position 1 (0 downs)
│  ○ Vue           ← position 2 (1 down)
│  ○ React         ← position 3 (2 downs)
│  ○ Svelte        ← position 4 (3 downs)
```

```bash
clrun key <id> down down enter   # Selects React (2 downs from top)
```

## Multi-Select Pattern

For multi-select, plan your moves as a sequence of `space` (toggle) and `down`
(skip) from top to bottom, ending with `enter`:

```
◆  Select features:
│  ◻ TypeScript     ← want this ✓
│  ◻ JSX            ← skip
│  ◻ Router         ← want this ✓
│  ◻ Pinia          ← want this ✓
│  ◻ Vitest         ← skip
│  ◻ Linter         ← want this ✓
│  ◻ Prettier       ← skip
```

```bash
clrun key <id> space down down space down space down down space down down enter
#              TS    skip  skip  Router Pinia skip  skip  Linter skip  skip  confirm
```

## Real-World Example: create-vue

```bash
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
```

## Real-World Example: create-vite (React)

```bash
clrun "npx create-vite@latest"
clrun <id> "my-react-app"                    # Project name
clrun key <id> down down enter               # Select React (3rd)
clrun key <id> enter                          # TypeScript (default)
clrun key <id> enter                          # Accept install
# Wait for deps + dev server startup
clrun tail <id> --lines 15
```

## Lifecycle Pattern

```
1. START    →  clrun <command>                    → get terminal_id
2. OBSERVE  →  clrun tail <id>                    → read output, identify prompt
3. INTERACT →  clrun <id> "text" / clrun key <id> → send input
4. REPEAT   →  go to 2 until done
5. VERIFY   →  clrun status                       → check exit codes
6. CLEANUP  →  clrun kill <id>                    → if needed
```

## Reading Responses

All responses are YAML. Key fields:

- **`terminal_id`** — store this, you need it for everything
- **`output`** — cleaned terminal output (ANSI stripped, prompts filtered)
- **`status`** — `running`, `suspended`, `exited`, `killed`, `detached`
- **`hints`** — the exact commands you can run next (copy-pasteable)
- **`warnings`** — issues with your input or detected output artifacts
- **`restored`** — `true` if the session was auto-restored from suspension

## Shell Variable Quoting

When sending commands containing `$` variables, use **single quotes** to prevent
your shell from expanding them before clrun receives them:

```bash
clrun <id> 'echo $MY_VAR'          # Correct — variable reaches the session
clrun <id> "echo $MY_VAR"          # Wrong — your shell expands it first
```

## Suspended Sessions

Sessions suspend after 5 minutes of inactivity. Just send input normally — they
auto-restore transparently. No need to check status first.

## Important Rules

1. **Parse YAML** — all responses are structured YAML
2. **Read the hints** — they tell you exactly what to do next
3. **Use `key` for TUI prompts** — never type escape sequences as text
4. **Use text input for readline prompts** — `clrun <id> "text"`
5. **Single-quote `$` variables** — prevents premature shell expansion
6. **Accept defaults with `key enter`** — not with empty text for TUI prompts
7. **Count items from top** for select lists — N-1 `down` presses for item N
