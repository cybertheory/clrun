import type { CLIResponse } from '../types';

/**
 * Print a success JSON response to stdout and exit 0.
 */
export function success<T>(data: T): never {
  const response: CLIResponse<T> = { ok: true, data };
  process.stdout.write(JSON.stringify(response, null, 2) + '\n');
  process.exit(0);
}

/**
 * Print an error JSON response to stdout and exit 1.
 */
export function fail(error: string): never {
  const response: CLIResponse = { ok: false, error };
  process.stdout.write(JSON.stringify(response, null, 2) + '\n');
  process.exit(1);
}

/**
 * Print a JSON response without exiting.
 */
export function respond<T>(data: T): void {
  const response: CLIResponse<T> = { ok: true, data };
  process.stdout.write(JSON.stringify(response, null, 2) + '\n');
}

/**
 * Print an error JSON response without exiting.
 */
export function respondError(error: string): void {
  const response: CLIResponse = { ok: false, error };
  process.stdout.write(JSON.stringify(response, null, 2) + '\n');
}

/**
 * Wrap an async command handler with JSON error handling.
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
