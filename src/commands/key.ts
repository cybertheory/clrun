import { resolveProjectRoot } from '../utils/paths';
import { success, fail, cleanOutput } from '../utils/output';
import { readSession, isPtyAlive } from '../pty/pty-manager';
import { enqueueInput } from '../queue/queue-engine';
import { getBufferSize, readBufferSince } from '../buffer/buffer-manager';
import { restoreSession } from '../runtime/restore';
import { logEvent } from '../ledger/ledger';
import {
  sessionNotFoundError,
  sessionNotRunningError,
} from '../utils/validate';

// ─── Named key → escape sequence map ────────────────────────────────────────

const KEY_MAP: Record<string, string> = {
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',
  enter: '\r',
  return: '\r',
  tab: '\t',
  escape: '\x1b',
  esc: '\x1b',
  space: ' ',
  backspace: '\x7f',
  delete: '\x1b[3~',
  home: '\x1b[H',
  end: '\x1b[F',
  pageup: '\x1b[5~',
  pagedown: '\x1b[6~',
  // Ctrl combos
  'ctrl-c': '\x03',
  'ctrl-d': '\x04',
  'ctrl-z': '\x1a',
  'ctrl-l': '\x0c',
  'ctrl-a': '\x01',
  'ctrl-e': '\x05',
  // "y" and "n" shortcuts for confirm prompts
  y: 'y',
  n: 'n',
};

/**
 * Resolve a key name to its byte sequence.
 * Supports names from KEY_MAP, or raw text like "abc".
 */
function resolveKey(name: string): string | null {
  const lower = name.toLowerCase();
  return KEY_MAP[lower] ?? null;
}

export async function keyCommand(
  terminalId: string,
  keys: string[]
): Promise<void> {
  const projectRoot = resolveProjectRoot();

  // ── Validate keys ──────────────────────────────────────────────────────
  const resolved: string[] = [];
  const unknown: string[] = [];

  for (const k of keys) {
    const seq = resolveKey(k);
    if (seq !== null) {
      resolved.push(seq);
    } else {
      unknown.push(k);
    }
  }

  if (unknown.length > 0) {
    fail({
      error: `Unknown key name(s): ${unknown.join(', ')}`,
      hints: {
        available_keys: Object.keys(KEY_MAP).join(', '),
        example: 'clrun key <id> down down enter',
        note: 'Keys are case-insensitive. Use "clrun input" for text input.',
      },
    });
  }

  // ── Verify session exists ──────────────────────────────────────────────
  let session = readSession(terminalId, projectRoot);
  if (!session) {
    fail(sessionNotFoundError(terminalId));
  }

  // ── Transparent restore for suspended sessions ─────────────────────────
  if (session!.status === 'suspended') {
    // Queue the key sequence as a raw string (worker will handle \r)
    // But keys are raw escape sequences — we need a special queue entry
    // that the worker sends without appending \r.
    // For now, enqueue each key individually so the worker sends each + \r,
    // but we actually need the raw bytes. Let's write directly via SIGUSR1
    // after restore.
    await restoreSession(terminalId, projectRoot);
    session = readSession(terminalId, projectRoot);
    await new Promise((r) => setTimeout(r, 300));
  }

  // ── Check session is running ───────────────────────────────────────────
  if (session!.status !== 'running') {
    fail(sessionNotRunningError(terminalId, session!.status));
  }

  if (!isPtyAlive(session!.worker_pid)) {
    fail({
      error: `Session worker is not alive (PID: ${session!.worker_pid})`,
      hints: {
        check_status: 'clrun status',
        start_new: 'clrun <command>',
      },
    });
  }

  // ── Send key sequences via the queue ───────────────────────────────────
  // Concatenate all resolved keys into one raw string and enqueue it.
  // The worker will append \r, but for raw key sequences we need to
  // mark it so the worker sends it verbatim.
  const rawSequence = resolved.join('');

  // We use a special prefix that the worker recognizes to send raw bytes
  // without appending \r.
  const RAW_PREFIX = '\x00RAW\x00';
  enqueueInput(terminalId, RAW_PREFIX + rawSequence, 999, projectRoot);

  // Signal the worker to process immediately
  try { process.kill(session!.worker_pid, 'SIGUSR1'); } catch {}

  logEvent('key.sent', projectRoot, terminalId, {
    keys: keys,
    sequence_length: rawSequence.length,
  });

  // ── Wait for output ────────────────────────────────────────────────────
  const bufferBefore = getBufferSize(terminalId, projectRoot);
  await new Promise((r) => setTimeout(r, 400));

  const newLines = readBufferSince(terminalId, bufferBefore, projectRoot);
  const output = cleanOutput(newLines);

  success({
    terminal_id: terminalId,
    keys_sent: keys,
    ...(output && { output }),
    hints: {
      send_more_keys: `clrun key ${terminalId} <key> [<key>...]`,
      send_text: `clrun ${terminalId} '<text>'`,
      view_output: `clrun tail ${terminalId} --lines 50`,
      available_keys: 'up, down, left, right, enter, tab, escape, space, backspace, ctrl-c, ctrl-d',
    },
  });
}
