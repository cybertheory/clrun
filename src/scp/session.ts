import { SCPClient, formatCliForBuffer, scpCliUrl, resolveInputToActionOrBody } from './client';
import { appendToBuffer } from '../buffer/buffer-manager';
import { updateSession } from '../pty/pty-manager';

/**
 * Handle input for an SCP-backed session: resolve to transition, call API, append new CLI state to buffer.
 */
export async function handleScpInput(
  terminalId: string,
  input: string,
  projectRoot: string,
  baseUrl: string,
  runId: string
): Promise<{ output: string; done?: boolean }> {
  const client = new SCPClient(baseUrl);
  const cli = await client.getCli(runId);
  const options = cli.options ?? [];
  const resolved = resolveInputToActionOrBody(input, options);

  if (!resolved) {
    const lines: string[] = options.length
      ? ['Unknown option. Choose one of:']
      : ['No options available; this run may already be complete.'];
    options.forEach((o, i) => lines.push(`  ${i + 1}. ${o.label} (or "${o.action}")`));
    const out = lines.join('\n') + '\n';
    appendToBuffer(terminalId, out, projectRoot);
    return { output: out };
  }

  try {
    await client.transition(resolved.action, resolved.body, runId);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const out = `Error: ${errMsg}\n`;
    appendToBuffer(terminalId, out, projectRoot);
    return { output: out };
  }

  const newCli = await client.getCli(runId);
  const out = formatCliForBuffer(newCli) + `View CLI in browser: ${scpCliUrl(baseUrl, runId)}\n`;
  appendToBuffer(terminalId, out, projectRoot);

  const frame = await client.getFrame(runId);
  const isTerminal = frame.status === 'completed' || frame.status === 'failed';
  if (isTerminal) {
    updateSession(terminalId, { status: 'exited', last_exit_code: frame.status === 'completed' ? 0 : 1 }, projectRoot);
    return { output: out, done: true };
  }
  return { output: out };
}
