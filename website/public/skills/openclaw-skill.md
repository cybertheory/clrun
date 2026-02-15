# clrun — OpenClaw Integration Skill

## Purpose

This skill provides OpenClaw agents with the knowledge to use `clrun`
for interactive, persistent command execution within coding projects.

## Overview

`clrun` is a project-scoped CLI execution substrate. It creates interactive
terminal sessions that persist independently of your agent process, with
deterministic input queuing and priority control.

## Command Reference

### Create Session
```
clrun run "<shell_command>"
```
Returns: `{ ok: true, data: { terminal_id, command, status, pid } }`

### Queue Input
```
clrun input <terminal_id> "<text>" [--priority N] [--override]
```
Returns: `{ ok: true, data: { queue_id, status, mode } }`

### Read Output (Latest)
```
clrun tail <terminal_id> [--lines N]
```
Returns: `{ ok: true, data: { terminal_id, lines, total_lines } }`

### Read Output (Beginning)
```
clrun head <terminal_id> [--lines N]
```
Returns: `{ ok: true, data: { terminal_id, lines, total_lines } }`

### Runtime Status
```
clrun status
```
Returns: `{ ok: true, data: { sessions: [...], detached: [...] } }`

### Terminate Session
```
clrun kill <terminal_id>
```
Returns: `{ ok: true, data: { terminal_id, status: "killed" } }`

## Agent Workflow Pattern

```
1. EXECUTE:  result = shell("clrun run \"npm test\"")
2. PARSE:    terminal_id = json_parse(result).data.terminal_id
3. WAIT:     sleep(2000)
4. OBSERVE:  output = shell("clrun tail " + terminal_id + " --lines 50")
5. DECIDE:   if output contains prompt → send input
6. INPUT:    shell("clrun input " + terminal_id + " \"yes\"")
7. VERIFY:   status = shell("clrun status")
8. CLEANUP:  if done → shell("clrun kill " + terminal_id)
```

## Queue Behavior

| Property | Behavior |
|----------|----------|
| Ordering | Priority DESC, then FIFO |
| Default priority | 0 |
| Override mode | Cancels all pending, sends immediately |
| Processing interval | 200ms |

## Session States

- `running` — active, accepts input
- `exited` — completed, has exit code
- `killed` — terminated by agent
- `detached` — orphaned after crash, read-only

## Key Rules for Agents

1. **Always parse JSON** — never interpret output as plain text
2. **Store terminal_ids** — you need them for all subsequent operations
3. **Check status before input** — don't send input to exited/detached sessions
4. **Use priority for ordered multi-input** — higher number = sent first
5. **Use override for emergencies** — cancels pending queue
6. **Poll tail for output** — the buffer is append-only and always current
7. **Handle detached gracefully** — create new sessions, don't retry

## File Structure

All state in `.clrun/` at project root:
- `sessions/*.json` — session metadata
- `queues/*.json` — input queues
- `buffers/*.log` — raw PTY output
- `ledger/events.log` — audit trail
- `skills/*.md` — this file and others

## Git-Trackable Execution History

The ledger at `.clrun/ledger/events.log` records all execution events
as newline-delimited JSON. Committing this file to git enables:
- Historical reasoning about past executions
- Team visibility into agent actions
- Debugging failed automation sequences
