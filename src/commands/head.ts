import { resolveProjectRoot } from '../utils/paths';
import { success, fail, cleanOutput } from '../utils/output';
import { readSession } from '../pty/pty-manager';
import { headBuffer, bufferLineCount } from '../buffer/buffer-manager';
import { sessionNotFoundError, checkOutputQuality } from '../utils/validate';

export async function headCommand(
  terminalId: string,
  options: { lines?: number }
): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const lineCount = options.lines ?? 50;

  const session = readSession(terminalId, projectRoot);
  if (!session) {
    fail(sessionNotFoundError(terminalId));
  }

  const lines = headBuffer(terminalId, lineCount, projectRoot);
  const totalLines = bufferLineCount(terminalId, projectRoot);
  const rawOutput = cleanOutput(lines);
  const { output, warnings } = checkOutputQuality(rawOutput, 'head output');

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

  if (warnings.length > 0) {
    response.warnings = warnings;
  }

  if (session!.status === 'running') {
    response.hints = {
      send_input: `clrun ${terminalId} '<command>'`,
      override: `clrun input ${terminalId} '<text>' --override`,
      more_output: `clrun head ${terminalId} --lines ${lineCount * 2}`,
      tail: `clrun tail ${terminalId} --lines 50`,
      kill: `clrun kill ${terminalId}`,
    };
  }

  success(response);
}
