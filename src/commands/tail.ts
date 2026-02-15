import { resolveProjectRoot } from '../utils/paths';
import { success, fail, cleanOutput } from '../utils/output';
import { readSession } from '../pty/pty-manager';
import { tailBuffer, bufferLineCount } from '../buffer/buffer-manager';
import { sessionNotFoundError, checkOutputQuality } from '../utils/validate';

export async function tailCommand(
  terminalId: string,
  options: { lines?: number }
): Promise<void> {
  const projectRoot = resolveProjectRoot();
  const lineCount = options.lines ?? 50;

  const session = readSession(terminalId, projectRoot);
  if (!session) {
    fail(sessionNotFoundError(terminalId));
  }

  const lines = tailBuffer(terminalId, lineCount, projectRoot);
  const totalLines = bufferLineCount(terminalId, projectRoot);
  const rawOutput = cleanOutput(lines);
  const { output, warnings } = checkOutputQuality(rawOutput, 'tail output');

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
      send_with_priority: `clrun input ${terminalId} '<response>' --priority 5`,
      override: `clrun input ${terminalId} '<text>' --override`,
      more_output: `clrun tail ${terminalId} --lines ${lineCount * 2}`,
      kill: `clrun kill ${terminalId}`,
      note: "Use single quotes for shell variables: clrun <id> 'echo $VAR'",
    };
  } else if (session!.status === 'suspended') {
    response.suspended_at = session!.saved_state?.captured_at;
    response.hints = {
      resume: `clrun ${terminalId} '<command>'  # auto-restores env and cwd`,
      view_more: `clrun tail ${terminalId} --lines ${lineCount * 2}`,
      kill: `clrun kill ${terminalId}`,
    };
  } else if (session!.status === 'exited') {
    response.hints = {
      view_more: `clrun tail ${terminalId} --lines ${lineCount * 2}`,
      start_new: 'clrun <command>',
    };
  }

  success(response);
}
