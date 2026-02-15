/**
 * Runtime assertions and validation for clrun.
 *
 * These run at every CLI boundary to catch formatting errors,
 * provide corrective hints to AI agents, and enforce output quality.
 */

import { listSessions } from '../pty/pty-manager';
import { resolveProjectRoot, getClrunPaths } from './paths';
import * as fs from 'fs';

// ─── Output Assertions ─────────────────────────────────────────────────────

/**
 * Assert that a string contains no ANSI escape codes.
 * Throws if any are found (indicates a bug in cleanOutput).
 */
export function assertNoAnsi(text: string, context: string): void {
  // eslint-disable-next-line no-control-regex
  if (/\x1b/.test(text)) {
    throw new Error(
      `[clrun assertion] ANSI escape code found in ${context}. ` +
      `This is a bug — please report it.`
    );
  }
}

/**
 * Assert that output doesn't contain raw shell prompt patterns.
 * Returns cleaned output or warns via a `_warnings` array.
 */
export function checkOutputQuality(
  output: string | null,
  context: string
): { output: string | null; warnings: string[] } {
  const warnings: string[] = [];

  if (!output) return { output, warnings };

  // Check for ANSI leaks
  try {
    assertNoAnsi(output, context);
  } catch {
    // Strip ANSI as a fallback rather than crashing
    // eslint-disable-next-line no-control-regex
    output = output.replace(/\x1b[^]*?[A-Za-z~]/g, '');
    warnings.push('Output contained ANSI escape codes that were stripped at runtime.');
  }

  // Check for bracket paste mode leak
  if (/\[\?2004[hl]/.test(output)) {
    output = output.replace(/\[\?2004[hl]/g, '');
    warnings.push('Output contained bracket paste mode sequences that were stripped.');
  }

  // Trim result after stripping
  output = output.trim() || null;

  return { output, warnings };
}

// ─── Input Validation ───────────────────────────────────────────────────────

export interface InputWarnings {
  warnings: string[];
}

/**
 * Validate input before sending to a session.
 * Returns warnings that should be included in the response.
 */
export function validateInput(input: string): InputWarnings {
  const warnings: string[] = [];

  // Detect likely shell-expanded variable (empty or very short after expansion)
  if (input.trim() === '') {
    warnings.push(
      'Input is empty. If you intended to send a shell variable like $MY_VAR, ' +
      "use single quotes to prevent your shell from expanding it: " +
      "clrun <id> 'echo $MY_VAR'"
    );
  }

  // Detect partial expansion: "echo " with nothing after
  if (/^(echo|printf|cat)\s*$/.test(input.trim())) {
    warnings.push(
      `Input "${input.trim()}" looks like a command with a missing argument. ` +
      'If you intended to include a shell variable, use single quotes: ' +
      "clrun <id> 'echo $MY_VAR'"
    );
  }

  return { warnings };
}

// ─── Session Validation ─────────────────────────────────────────────────────

export interface SessionError {
  error: string;
  hints: Record<string, string>;
}

/**
 * Build a rich error for "session not found" with corrective hints.
 */
export function sessionNotFoundError(terminalId: string): SessionError {
  const hints: Record<string, string> = {
    list_sessions: 'clrun status',
    start_new: 'clrun <command>',
  };

  // Try to find similar/active sessions to suggest
  try {
    const projectRoot = resolveProjectRoot();
    const paths = getClrunPaths(projectRoot);

    if (fs.existsSync(paths.root)) {
      const sessions = listSessions(projectRoot);
      const running = sessions.filter((s) => s.status === 'running' || s.status === 'suspended');

      if (running.length > 0) {
        hints.active_sessions = running.map((s) => s.terminal_id).join(', ');
        hints.note = `Found ${running.length} active session(s). Use one of the IDs above.`;
      } else if (sessions.length > 0) {
        hints.note = `All ${sessions.length} session(s) are terminated. Start a new one with: clrun <command>`;
      } else {
        hints.note = 'No sessions exist. Start one with: clrun <command>';
      }
    }
  } catch {
    // Non-fatal — just skip the suggestions
  }

  return {
    error: `Session not found: ${terminalId}`,
    hints,
  };
}

/**
 * Build a rich error for "session not running" with corrective hints.
 */
export function sessionNotRunningError(
  terminalId: string,
  status: string
): SessionError {
  const hints: Record<string, string> = {
    check_status: 'clrun status',
  };

  switch (status) {
    case 'exited':
      hints.note = 'This session has exited. You can still read its output.';
      hints.read_output = `clrun tail ${terminalId} --lines 50`;
      hints.start_new = 'clrun <command>';
      break;
    case 'killed':
      hints.note = 'This session was killed. Start a new one.';
      hints.start_new = 'clrun <command>';
      break;
    case 'detached':
      hints.note = 'This session was orphaned after a crash. Read its buffer or start fresh.';
      hints.read_output = `clrun tail ${terminalId} --lines 50`;
      hints.start_new = 'clrun <command>';
      break;
    default:
      hints.start_new = 'clrun <command>';
  }

  return {
    error: `Session is not running (status: ${status})`,
    hints,
  };
}

// ─── Command Validation ─────────────────────────────────────────────────────

/**
 * Validate a command string before creating a session.
 * Returns warnings to include in the response.
 */
export function validateCommand(command: string): InputWarnings {
  const warnings: string[] = [];

  if (!command.trim()) {
    warnings.push('Command is empty. Provide a command to run: clrun <command>');
  }

  // Detect unquoted glob patterns that may have been expanded
  if (command.includes('/dev/') || command.includes('/proc/')) {
    // Might be a glob expansion gone wrong
    warnings.push(
      'Command contains file paths that may be from unintended glob expansion. ' +
      "Use single quotes if you intended literal wildcards: clrun 'ls *.txt'"
    );
  }

  return { warnings };
}
