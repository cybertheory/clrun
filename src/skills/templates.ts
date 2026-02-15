/**
 * Skill markdown templates. These are installed into .clrun/skills/
 * on first initialization.
 */

export const CLRUN_SKILL = `# clrun — CLI Skill Reference

## Overview

\`clrun\` is a project-scoped, persistent, deterministic CLI execution substrate
designed for AI coding agents. It provides interactive PTY sessions with queued
input, priority control, and crash recovery.

## Installation

\`\`\`bash
npm install -g clrun
# or
npx clrun <command>
\`\`\`

## Commands

### Run a Command

\`\`\`bash
clrun run "<command>"
\`\`\`

Creates a new interactive PTY session. Returns JSON with \`terminal_id\`.

**Example:**
\`\`\`bash
clrun run "npm init"
\`\`\`

**Response:**
\`\`\`json
{
  "ok": true,
  "data": {
    "terminal_id": "a1b2c3d4-...",
    "command": "npm init",
    "status": "running",
    "pid": 12345
  }
}
\`\`\`

### Send Input

\`\`\`bash
clrun input <terminal_id> "<input>" [--priority <n>] [--override]
\`\`\`

Queue input to a running terminal session.

- **--priority <n>**: Higher number = higher priority (default: 0)
- **--override**: Cancel all pending inputs, send this immediately

**Examples:**
\`\`\`bash
clrun input abc123 "yes"
clrun input abc123 "yes" --priority 10
clrun input abc123 "force-reset" --override
\`\`\`

### View Output (tail)

\`\`\`bash
clrun tail <terminal_id> [--lines <n>]
\`\`\`

Returns the last N lines of terminal output (default: 50).

### View Output (head)

\`\`\`bash
clrun head <terminal_id> [--lines <n>]
\`\`\`

Returns the first N lines of terminal output (default: 50).

### Check Status

\`\`\`bash
clrun status
\`\`\`

Returns JSON with all terminal sessions and their states.

### Kill a Session

\`\`\`bash
clrun kill <terminal_id>
\`\`\`

Terminates a running PTY session.

## Queue System

The input queue is **deterministic**:

1. Inputs are sorted by **priority DESC** (higher first)
2. Ties are broken by **created_at ASC** (first-in, first-out)
3. Override mode cancels all pending inputs

### Queue Entry States
- \`queued\` — waiting to be sent
- \`sent\` — delivered to the PTY
- \`cancelled\` — cancelled by override

## Session States

| State | Meaning |
|-------|---------|
| \`running\` | PTY is active and accepting input |
| \`exited\` | Command completed (check \`last_exit_code\`) |
| \`killed\` | Session was manually terminated |
| \`detached\` | Session lost due to crash (not recoverable) |

## Detached Sessions

When \`clrun\` detects a previously running session whose process has died:
- It marks the session as \`detached\`
- The buffer log is still readable
- The session cannot be resumed
- You should inspect the buffer and start a new session if needed

## Best Practices for AI Agents

1. **Always capture the \`terminal_id\`** from \`clrun run\` responses
2. **Poll with \`clrun tail\`** to observe command output
3. **Use priority** when multiple inputs are queued
4. **Use override** when you need to abort current flow
5. **Check status** before sending input to verify the session is \`running\`
6. **Handle \`detached\` sessions** — don't try to send input to them
7. **Parse JSON strictly** — all responses are structured JSON
8. **Don't assume command completion** — check \`status\` and \`last_exit_code\`

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

## Git Integration Potential

The \`.clrun/ledger/events.log\` file can be committed to git to enable:
- Cross-session reasoning about execution history
- Team-wide visibility into agent actions
- Audit trails for debugging

Add \`.clrun/\` to \`.gitignore\` to exclude, or selectively commit the ledger.
`;

export const CLAUDE_CODE_SKILL = `# clrun — Claude Code Integration Skill

## Purpose

This skill teaches Claude Code how to use \`clrun\` for interactive command execution.
Use \`clrun\` whenever you need to run commands that require interactive input,
long-running processes, or deterministic execution control.

## When to Use clrun

- Commands that prompt for user input (e.g., \`npm init\`, \`git commit\`)
- Long-running processes you need to monitor (e.g., \`npm test\`, \`docker build\`)
- When you need to queue multiple inputs in advance
- When you need override/abort capability

## Core Workflow

### 1. Start a Command

\`\`\`bash
clrun run "npm init -y"
\`\`\`

**Always** parse the JSON response and store the \`terminal_id\`.

### 2. Monitor Output

\`\`\`bash
clrun tail <terminal_id> --lines 30
\`\`\`

Check the output to understand what the command is doing or waiting for.

### 3. Send Input When Needed

\`\`\`bash
clrun input <terminal_id> "yes"
\`\`\`

Send responses to interactive prompts.

### 4. Check Session Status

\`\`\`bash
clrun status
\`\`\`

Verify session state, exit codes, and active sessions.

## Detecting Waiting Input

When a command is waiting for input:
1. Run \`clrun tail <id> --lines 10\`
2. Look for patterns: \`?\`, \`:\`, \`(y/n)\`, \`>\`, \`Enter\`, \`Press\`
3. The session status will still be \`running\` with no recent output

## Using Override

When something goes wrong and you need to force a new input:

\`\`\`bash
clrun input <terminal_id> "q" --override
\`\`\`

This cancels ALL pending queued inputs and sends the override immediately.

## Priority Queuing

When you need to send multiple inputs in order:

\`\`\`bash
clrun input <id> "first-answer" --priority 3
clrun input <id> "second-answer" --priority 2
clrun input <id> "third-answer" --priority 1
\`\`\`

Higher priority numbers are sent first.

## Error Handling

Always check the \`ok\` field in responses:

\`\`\`json
{ "ok": false, "error": "Session not found" }
\`\`\`

Common errors:
- Session not found (wrong terminal_id)
- Session not running (already exited/killed)
- No .clrun directory (run from project root)

## Lifecycle Management

1. **Start** → \`clrun run "cmd"\`
2. **Monitor** → \`clrun tail <id>\`
3. **Interact** → \`clrun input <id> "response"\`
4. **Verify** → \`clrun status\`
5. **Clean up** → \`clrun kill <id>\` (if needed)

## Important Notes

- All output is **JSON only** — parse it, don't read it as text
- Sessions persist across your tool calls — use stored terminal_ids
- Buffer logs are **append-only** — tail gives you the latest state
- Detached sessions cannot receive input — start a new one
- The queue processes inputs every 200ms
- Override is immediate — use it for emergency control flow changes
`;

export const OPENCLAW_SKILL = `# clrun — OpenClaw Integration Skill

## Purpose

This skill provides OpenClaw agents with the knowledge to use \`clrun\`
for interactive, persistent command execution within coding projects.

## Overview

\`clrun\` is a project-scoped CLI execution substrate. It creates interactive
terminal sessions that persist independently of your agent process, with
deterministic input queuing and priority control.

## Command Reference

### Create Session
\`\`\`
clrun run "<shell_command>"
\`\`\`
Returns: \`{ ok: true, data: { terminal_id, command, status, pid } }\`

### Queue Input
\`\`\`
clrun input <terminal_id> "<text>" [--priority N] [--override]
\`\`\`
Returns: \`{ ok: true, data: { queue_id, status, mode } }\`

### Read Output (Latest)
\`\`\`
clrun tail <terminal_id> [--lines N]
\`\`\`
Returns: \`{ ok: true, data: { terminal_id, lines, total_lines } }\`

### Read Output (Beginning)
\`\`\`
clrun head <terminal_id> [--lines N]
\`\`\`
Returns: \`{ ok: true, data: { terminal_id, lines, total_lines } }\`

### Runtime Status
\`\`\`
clrun status
\`\`\`
Returns: \`{ ok: true, data: { sessions: [...], detached: [...] } }\`

### Terminate Session
\`\`\`
clrun kill <terminal_id>
\`\`\`
Returns: \`{ ok: true, data: { terminal_id, status: "killed" } }\`

## Agent Workflow Pattern

\`\`\`
1. EXECUTE:  result = shell("clrun run \\"npm test\\"")
2. PARSE:    terminal_id = json_parse(result).data.terminal_id
3. WAIT:     sleep(2000)
4. OBSERVE:  output = shell("clrun tail " + terminal_id + " --lines 50")
5. DECIDE:   if output contains prompt → send input
6. INPUT:    shell("clrun input " + terminal_id + " \\"yes\\"")
7. VERIFY:   status = shell("clrun status")
8. CLEANUP:  if done → shell("clrun kill " + terminal_id)
\`\`\`

## Queue Behavior

| Property | Behavior |
|----------|----------|
| Ordering | Priority DESC, then FIFO |
| Default priority | 0 |
| Override mode | Cancels all pending, sends immediately |
| Processing interval | 200ms |

## Session States

- \`running\` — active, accepts input
- \`exited\` — completed, has exit code
- \`killed\` — terminated by agent
- \`detached\` — orphaned after crash, read-only

## Key Rules for Agents

1. **Always parse JSON** — never interpret output as plain text
2. **Store terminal_ids** — you need them for all subsequent operations
3. **Check status before input** — don't send input to exited/detached sessions
4. **Use priority for ordered multi-input** — higher number = sent first
5. **Use override for emergencies** — cancels pending queue
6. **Poll tail for output** — the buffer is append-only and always current
7. **Handle detached gracefully** — create new sessions, don't retry

## File Structure

All state in \`.clrun/\` at project root:
- \`sessions/*.json\` — session metadata
- \`queues/*.json\` — input queues
- \`buffers/*.log\` — raw PTY output
- \`ledger/events.log\` — audit trail
- \`skills/*.md\` — this file and others

## Git-Trackable Execution History

The ledger at \`.clrun/ledger/events.log\` records all execution events
as newline-delimited JSON. Committing this file to git enables:
- Historical reasoning about past executions
- Team visibility into agent actions
- Debugging failed automation sequences
`;
