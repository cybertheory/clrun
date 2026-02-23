import { resolveProjectRoot, ensureClrunDirs } from '../utils/paths';
import { success, fail } from '../utils/output';
import { acquireLock } from '../runtime/lock-manager';
import { generateTerminalId, writeSession } from '../pty/pty-manager';
import { initQueue } from '../queue/queue-engine';
import { initBuffer, appendToBuffer } from '../buffer/buffer-manager';
import { logEvent } from '../ledger/ledger';
import { SCPClient, formatCliForBuffer } from '../scp/client';
import type { SessionMetadata } from '../types';

/**
 * Connect to an SCP server and start a run. Creates a virtual terminal session backed by SCP (no PTY).
 * CLRUN supports dynamic remote CLIs via SCP: run `clrun scp <url>`, then use clrun <id> "<input>" to drive the flow.
 */
export async function scpConnectCommand(baseUrl: string): Promise<void> {
  const projectRoot = resolveProjectRoot();
  ensureClrunDirs(projectRoot);
  acquireLock(projectRoot);

  const terminalId = generateTerminalId();
  initQueue(terminalId, projectRoot);
  initBuffer(terminalId, projectRoot);

  const client = new SCPClient(baseUrl);
  let frame;
  let cli;
  try {
    frame = await client.startRun();
    cli = await client.getCli();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail({
      error: `SCP connect failed: ${msg}`,
      hints: {
        check_url: 'Ensure the SCP server is running and reachable.',
        example: 'clrun scp http://localhost:8000',
      },
    });
  }

  const runId = client.getRunId();
  if (!runId) {
    fail({ error: 'SCP startRun did not return run_id' });
  }

  const display = formatCliForBuffer(cli!);
  appendToBuffer(terminalId, display, projectRoot);

  const now = new Date().toISOString();
  const session: SessionMetadata = {
    terminal_id: terminalId,
    created_at: now,
    cwd: process.cwd(),
    command: `clrun scp ${baseUrl}`,
    shell: '',
    status: 'running',
    pid: 0,
    worker_pid: 0,
    queue_length: 0,
    last_exit_code: null,
    last_activity_at: now,
    scp_run_id: runId,
    scp_base_url: baseUrl.replace(/\/$/, ''),
  };
  writeSession(session, projectRoot);

  logEvent('session.created', projectRoot, terminalId, {
    command: session.command,
    scp_run_id: runId,
    scp_base_url: session.scp_base_url,
  });

  success({
    terminal_id: terminalId,
    status: 'running',
    output: display,
    hints: {
      send_input: `clrun ${terminalId} "<option number or action name>"`,
      view_output: `clrun tail ${terminalId} --lines 50`,
      kill: `clrun kill ${terminalId}`,
      note: 'CLRUN supports dynamic remote CLIs via SCP. Send option index (e.g. "1") or action name to transition.',
    },
  });
}
