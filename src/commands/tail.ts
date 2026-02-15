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

  // Verify session exists
  const session = readSession(terminalId, projectRoot);
  if (!session) {
    fail(`Session not found: ${terminalId}`);
  }

  const lines = tailBuffer(terminalId, lineCount, projectRoot);
  const totalLines = bufferLineCount(terminalId, projectRoot);

  success({
    terminal_id: terminalId,
    command: session!.command,
    status: session!.status,
    lines,
    line_count: lines.length,
    total_lines: totalLines,
    last_exit_code: session!.last_exit_code,
  });
}
