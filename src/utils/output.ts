import { stringify } from 'yaml';

/**
 * Strip ANSI escape codes and common TTY control sequences from a string.
 */
export function stripAnsi(text: string): string {
  return text
    // CSI sequences: ESC[ (parameter bytes 0x20-0x3f)* (final byte 0x40-0x7e)
    // Covers SGR (colors), cursor movement, bracket paste mode (?2004h/l), erase, etc.
    .replace(/\x1b\[[\x20-\x3f]*[\x40-\x7e]/g, '')
    // OSC sequences: ESC ] ... BEL or ESC ] ... ST
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    // Other 2-byte ESC sequences (e.g., ESC(B for charset)
    .replace(/\x1b[^[\]]/g, '')
    // Handle backspace: remove char + backspace pairs
    .replace(/[^\x08]\x08/g, '')
    // Any remaining lone backspaces
    .replace(/\x08/g, '')
    // Carriage return not followed by newline (overwrite lines)
    .replace(/\r(?!\n)/g, '')
    // Remaining control chars except newline and tab
    .replace(/[\x00-\x09\x0b-\x0c\x0e-\x1f]/g, '');
}

/**
 * Detect whether a line is a shell prompt (zsh, bash, etc.) or empty noise.
 */
function isPromptLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;

  // zsh EOL mark: "%" followed by mostly whitespace
  if (/^%\s*$/.test(trimmed)) return true;

  // Lines that are primarily whitespace with a prompt char
  if (/^%\s{10,}/.test(trimmed)) return true;

  // Standard prompt patterns:
  // zsh: "user@host dir % " or "dir % "
  // bash: "user@host:dir$ " or "dir$ "
  if (/\s[%$#>]\s*$/.test(trimmed)) return true;
  if (/\s[%$#>]\s+\S/.test(trimmed)) {
    // Prompt + echoed command on the same line (e.g., "user@host dir % echo hello")
    return true;
  }

  return false;
}

/**
 * Clean an array of output lines: strip ANSI codes, remove shell prompts
 * and command echoes, and return only meaningful output.
 *
 * @param lines - Raw buffer lines
 * @param command - Optional command string to strip if echoed
 */
export function cleanOutput(lines: string[], command?: string): string | null {
  if (lines.length === 0) return null;

  const stripped = lines.map((l) => stripAnsi(l.replace(/\r$/, '')));

  const meaningful = stripped.filter((line) => {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) return false;

    // Skip shell prompt lines
    if (isPromptLine(line)) return false;

    // Skip echoed command (exact match or contained within the line)
    if (command) {
      const cmdTrimmed = command.trim();
      if (trimmed === cmdTrimmed) return false;
    }

    return true;
  });

  if (meaningful.length === 0) return null;

  const result = meaningful
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return result || null;
}

/**
 * Serialize data to clean YAML output.
 */
function toYaml(data: Record<string, unknown>): string {
  // Filter out undefined values
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) clean[key] = value;
  }
  return '---\n' + stringify(clean, { lineWidth: 0 });
}

/**
 * Print a success YAML response to stdout and exit 0.
 */
export function success(data: Record<string, unknown>): never {
  process.stdout.write(toYaml(data));
  process.exit(0);
}

/**
 * Print an error YAML response to stdout and exit 1.
 * Accepts a plain string or a rich error object with hints.
 */
export function fail(error: string | { error: string; hints?: Record<string, string> }): never {
  if (typeof error === 'string') {
    process.stdout.write(toYaml({ error }));
  } else {
    process.stdout.write(toYaml(error as Record<string, unknown>));
  }
  process.exit(1);
}

/**
 * Print a YAML response without exiting.
 */
export function respond(data: Record<string, unknown>): void {
  process.stdout.write(toYaml(data));
}

/**
 * Print an error YAML response without exiting.
 */
export function respondError(error: string): void {
  process.stdout.write(toYaml({ error }));
}

/**
 * Wrap an async command handler with error handling.
 * Preserves the original function signature for commander compatibility.
 */
export function withErrorHandling<A extends unknown[]>(
  fn: (...args: A) => Promise<void>
): (...args: A) => Promise<void> {
  return async (...args: A) => {
    try {
      await fn(...args);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      fail(message);
    }
  };
}

/**
 * Build hint commands for a given terminal_id.
 */
export function sessionHints(terminalId: string) {
  return {
    view_output: `clrun tail ${terminalId} --lines 50`,
    send_input: `clrun input ${terminalId} "<response>"`,
    send_with_priority: `clrun input ${terminalId} "<response>" --priority 5`,
    override_queue: `clrun input ${terminalId} "<text>" --override`,
    kill_session: `clrun kill ${terminalId}`,
    check_status: `clrun status`,
  };
}
