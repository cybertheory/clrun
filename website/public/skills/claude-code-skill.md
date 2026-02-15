# clrun — Claude Code Integration Skill

## Purpose

This skill teaches Claude Code how to use `clrun` for interactive command execution.
Use `clrun` whenever you need to run commands that require interactive input,
long-running processes, or deterministic execution control.

## When to Use clrun

- Commands that prompt for user input (e.g., `npm init`, `git commit`)
- Long-running processes you need to monitor (e.g., `npm test`, `docker build`)
- When you need to queue multiple inputs in advance
- When you need override/abort capability

## Core Workflow

### 1. Start a Command

```bash
clrun run "npm init -y"
```

**Always** parse the JSON response and store the `terminal_id`.

### 2. Monitor Output

```bash
clrun tail <terminal_id> --lines 30
```

Check the output to understand what the command is doing or waiting for.

### 3. Send Input When Needed

```bash
clrun input <terminal_id> "yes"
```

Send responses to interactive prompts.

### 4. Check Session Status

```bash
clrun status
```

Verify session state, exit codes, and active sessions.

## Detecting Waiting Input

When a command is waiting for input:
1. Run `clrun tail <id> --lines 10`
2. Look for patterns: `?`, `:`, `(y/n)`, `>`, `Enter`, `Press`
3. The session status will still be `running` with no recent output

## Using Override

When something goes wrong and you need to force a new input:

```bash
clrun input <terminal_id> "q" --override
```

This cancels ALL pending queued inputs and sends the override immediately.

## Priority Queuing

When you need to send multiple inputs in order:

```bash
clrun input <id> "first-answer" --priority 3
clrun input <id> "second-answer" --priority 2
clrun input <id> "third-answer" --priority 1
```

Higher priority numbers are sent first.

## Error Handling

Always check the `ok` field in responses:

```json
{ "ok": false, "error": "Session not found" }
```

Common errors:
- Session not found (wrong terminal_id)
- Session not running (already exited/killed)
- No .clrun directory (run from project root)

## Lifecycle Management

1. **Start** → `clrun run "cmd"`
2. **Monitor** → `clrun tail <id>`
3. **Interact** → `clrun input <id> "response"`
4. **Verify** → `clrun status`
5. **Clean up** → `clrun kill <id>` (if needed)

## Important Notes

- All output is **JSON only** — parse it, don't read it as text
- Sessions persist across your tool calls — use stored terminal_ids
- Buffer logs are **append-only** — tail gives you the latest state
- Detached sessions cannot receive input — start a new one
- The queue processes inputs every 200ms
- Override is immediate — use it for emergency control flow changes
