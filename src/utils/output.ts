import { stringify } from 'yaml';

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
 */
export function fail(error: string): never {
  process.stdout.write(toYaml({ error }));
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
