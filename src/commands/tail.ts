import { resolveProjectRoot } from '../utils/paths';
import { success, fail } from '../utils/output';
import { readSession } from '../pty/pty-manager';
import { tailBuffer, bufferLineCount } from '../buffer/buffer-manager';

export async function tailCommand(
  terminalId: string,
  options: { lines?: number }
): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const lineCount = options.lines ?? 50;

  const session = readSession(terminalId, projectRoot);
  if (!session) {
    fail(`Session not found: ${terminalId}`);
  }

  const lines = tailBuffer(terminalId, lineCount, projectRoot);
  const totalLines = bufferLineCount(terminalId, projectRoot);
  const output = lines.map((l) => l.replace(/\r$/, '')).join('\n');

  const response: Record<string, unknown> = {
    terminal_id: terminalId,
    command: session!.command,
    status: session!.status,
    total_lines: totalLines,
  };

  if (session!.last_exit_code !== null) {
    response.exit_code = session!.last_exit_code;
  }

  if (output) {
    response.output = output;
  }

  if (session!.status === 'running') {
    response.hints = {
      send_input: `clrun input ${terminalId} "<response>"`,
      send_with_priority: `clrun input ${terminalId} "<response>" --priority 5`,
      override: `clrun input ${terminalId} "<text>" --override`,
      more_output: `clrun tail ${terminalId} --lines ${lineCount * 2}`,
      kill: `clrun kill ${terminalId}`,
    };
  }

  success(response);
}
