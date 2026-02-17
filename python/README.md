# clrun

### *The Interactive CLI for AI Agents*

**Persistent. Deterministic. Agent-Native.**

*yup! that's right — no more `--yes` or command retries*

`clrun` gives AI agents full control over interactive terminal sessions — TUI prompts, select lists, checkboxes, long-running processes, and stateful shells. Every response is structured YAML with contextual hints telling the agent exactly what to do next.

```bash
pip install clrun
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

# Send input to a session
clrun <terminal_id> "my-project-name"

# Navigate TUI prompts with keystrokes
clrun key <terminal_id> down down enter

# View output
clrun tail <terminal_id> --lines 50

# Check all sessions
clrun status

# Kill a session
clrun kill <terminal_id>
```

## Commands

| Action | Command |
|--------|---------|
| Run a command | `clrun <command>` |
| Send text + Enter | `clrun <id> "text"` |
| Send keystrokes | `clrun key <id> down enter` |
| Toggle checkbox | `clrun key <id> space` |
| Accept default | `clrun key <id> enter` |
| View output | `clrun tail <id>` |
| Check sessions | `clrun status` |
| Kill session | `clrun kill <id>` |
| Interrupt | `clrun key <id> ctrl-c` |

## TUI Prompt Navigation

| You see | Type | Action |
|---------|------|--------|
| `◆ Name: │ default` | Text input | `clrun <id> "value"` or `clrun key <id> enter` |
| `● Opt1 ○ Opt2` | Single-select | `clrun key <id> down... enter` |
| `◻ Opt1 ◻ Opt2` | Multi-select | `clrun key <id> space down... enter` |
| `● Yes / ○ No` | Confirm | `clrun key <id> enter` or `right enter` |
| `(y/n)` | Simple confirm | `clrun <id> "y"` or `clrun <id> "n"` |

## Python Version

This is the Python port of `clrun`. It uses `pexpect` for PTY management instead of `node-pty`, which means:

- **No native compilation** — `pexpect` is pure Python on macOS/Linux
- **Same CLI interface** — identical commands and YAML output
- **Same file-based state** — `.clrun/` directory structure is fully compatible

Install via pip:

```bash
pip install clrun
```

Or pipx for isolated install:

```bash
pipx install clrun
```

## License

MIT — [github.com/cybertheory/clrun](https://github.com/cybertheory/clrun)
