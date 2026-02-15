#!/usr/bin/env node
/**
 * clrun worker — detached background process that manages a single PTY session.
 *
 * Spawned by `clrun run`. Runs until the PTY exits, is killed, or is suspended.
 *
 * Args: <terminalId> <command> <cwd> <projectRoot> [--restore]
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { appendToBuffer, initBuffer } from './buffer/buffer-manager';
import { getNextQueued, markSent, pendingCount } from './queue/queue-engine';
import { writeSession, readSession, updateSession, detectShell } from './pty/pty-manager';
import { logEvent } from './ledger/ledger';
import { getClrunPaths } from './utils/paths';
import type { SessionMetadata, SavedState } from './types';

// ─── Configuration ──────────────────────────────────────────────────────────

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes
const IDLE_CHECK_INTERVAL_MS = 30 * 1000; // check every 30s
const SUSPEND_CAPTURE_WAIT_MS = 600;      // wait for shell to flush state files

// ─── Parse Arguments ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const restoreFlag = args.includes('--restore');
const positional = args.filter((a) => a !== '--restore');
const [terminalId, command, cwd, projectRoot] = positional;

if (!terminalId || !command || !cwd || !projectRoot) {
  process.stderr.write('worker: missing arguments\n');
  process.exit(1);
}

// ─── Import node-pty dynamically ────────────────────────────────────────────

let pty: typeof import('node-pty');
try {
  pty = require('node-pty');
} catch {
  process.stderr.write('worker: node-pty not available. Install with: npm install node-pty\n');
  process.exit(1);
}

// ─── Internal vars to skip during env restore ───────────────────────────────

const SKIP_ENV_VARS = new Set([
  '_', 'SHLVL', 'PWD', 'OLDPWD', 'SHELL', 'TERM', 'TERM_PROGRAM',
  'TERM_PROGRAM_VERSION', 'TERM_SESSION_ID', 'TMPDIR', 'LOGNAME', 'USER',
  'HOME', 'LANG', 'SSH_AUTH_SOCK',
]);

// ─── Resolve restore state ──────────────────────────────────────────────────

let restoreState: SavedState | null = null;
let restoreCwd = cwd;

if (restoreFlag) {
  const session = readSession(terminalId, projectRoot);
  if (session?.saved_state) {
    restoreState = session.saved_state;
    restoreCwd = restoreState.cwd;
  }
}

// ─── Spawn PTY ──────────────────────────────────────────────────────────────

const shell = detectShell();

const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-256color',
  cols: 120,
  rows: 40,
  cwd: restoreCwd,
  env: { ...process.env } as Record<string, string>,
});

const ptyPid = ptyProcess.pid;

// ─── Restore or send initial command ────────────────────────────────────────

setTimeout(() => {
  if (restoreState) {
    // Re-export saved environment variables
    const exports: string[] = [];
    for (const [key, value] of Object.entries(restoreState!.env)) {
      if (SKIP_ENV_VARS.has(key)) continue;
      // Escape single quotes in value
      const escaped = value.replace(/'/g, "'\\''");
      exports.push(`export ${key}='${escaped}'`);
    }
    if (exports.length > 0) {
      ptyProcess.write(exports.join(' && ') + '\n');
    }

    // Append a restore marker to the buffer
    appendToBuffer(terminalId, '\n--- session restored ---\n', projectRoot);

    logEvent('session.restored', projectRoot, terminalId, {
      restored_cwd: restoreState!.cwd,
      restored_vars: Object.keys(restoreState!.env).filter((k) => !SKIP_ENV_VARS.has(k)).length,
    });
  } else {
    // Normal start: send the initial command
    ptyProcess.write(command + '\n');
  }
}, 80);

// ─── Initialize State ───────────────────────────────────────────────────────

if (!restoreFlag) {
  initBuffer(terminalId, projectRoot);
}

const now = new Date().toISOString();
const session: SessionMetadata = {
  terminal_id: terminalId,
  created_at: restoreFlag
    ? (readSession(terminalId, projectRoot)?.created_at ?? now)
    : now,
  cwd: restoreCwd,
  command,
  shell,
  status: 'running',
  pid: ptyPid,
  worker_pid: process.pid,
  queue_length: 0,
  last_exit_code: null,
  last_activity_at: now,
};
writeSession(session, projectRoot);

if (!restoreFlag) {
  logEvent('session.created', projectRoot, terminalId, { command, cwd, pid: ptyPid });
}

// ─── Idle Tracking ──────────────────────────────────────────────────────────

let lastActivity = Date.now();

function resetIdle(): void {
  lastActivity = Date.now();
}

// ─── Buffer Output ──────────────────────────────────────────────────────────

ptyProcess.onData((data: string) => {
  appendToBuffer(terminalId, data, projectRoot);
  resetIdle();
  updateSession(
    terminalId,
    { last_activity_at: new Date().toISOString() },
    projectRoot
  );
});

// ─── Queue Processing ───────────────────────────────────────────────────────

let queueInterval: ReturnType<typeof setInterval>;

// Raw prefix marker: inputs starting with this are sent verbatim (no \r appended).
// Used by `clrun key` to send escape sequences for arrow keys, tab, etc.
const RAW_PREFIX = '\x00RAW\x00';

function processQueue(): void {
  try {
    let next = getNextQueued(terminalId, projectRoot);
    while (next) {
      if (next.input.startsWith(RAW_PREFIX)) {
        // Raw mode: send the byte sequence verbatim, no \r appended.
        const raw = next.input.slice(RAW_PREFIX.length);
        ptyProcess.write(raw);
      } else {
        // Normal mode: use \r (carriage return) instead of \n (line feed).
        // In cooked mode the terminal driver maps \r → \n (ICRNL) so this
        // works identically to \n for regular shells.  In raw mode (used by
        // TUI frameworks like @clack/prompts, inquirer, etc.) \r is the
        // correct "Enter" key — \n would be ignored or misinterpreted.
        ptyProcess.write(next.input + '\r');
      }
      markSent(terminalId, next.queue_id, projectRoot);
      resetIdle();
      logEvent('input.sent', projectRoot, terminalId, {
        queue_id: next.queue_id,
        input: next.input.startsWith(RAW_PREFIX) ? '[raw keys]' : next.input,
      });
      next = getNextQueued(terminalId, projectRoot);
    }

    const count = pendingCount(terminalId, projectRoot);
    updateSession(terminalId, { queue_length: count }, projectRoot);
  } catch {
    // Non-fatal — retry on next interval
  }
}

// Poll queue every 200ms
queueInterval = setInterval(processQueue, 200);

// Also respond to SIGUSR1 for immediate queue processing
process.on('SIGUSR1', () => {
  resetIdle();
  processQueue();
});

// ─── Idle Suspension ────────────────────────────────────────────────────────

let suspending = false;

const idleCheckInterval = setInterval(async () => {
  if (suspending) return;

  const idle = Date.now() - lastActivity;
  if (idle < IDLE_TIMEOUT_MS) return;

  suspending = true;
  clearInterval(queueInterval);
  clearInterval(idleCheckInterval);

  try {
    await captureAndSuspend();
  } catch {
    // If capture fails, just kill without saving state
    updateSession(terminalId, { status: 'suspended', last_activity_at: new Date().toISOString() }, projectRoot);
    logEvent('session.suspended', projectRoot, terminalId, { capture_failed: true });
    try { ptyProcess.kill(); } catch {}
    process.exit(0);
  }
}, IDLE_CHECK_INTERVAL_MS);

async function captureAndSuspend(): Promise<void> {
  const paths = getClrunPaths(projectRoot);
  const cwdFile = path.join(paths.sessionsDir, `${terminalId}.state.cwd`);
  const envFile = path.join(paths.sessionsDir, `${terminalId}.state.env`);

  // Clean up any stale state files
  try { fs.unlinkSync(cwdFile); } catch {}
  try { fs.unlinkSync(envFile); } catch {}

  // Ask the shell to dump its state
  ptyProcess.write(`pwd > '${cwdFile}'\n`);
  ptyProcess.write(`env -0 > '${envFile}'\n`);

  // Wait for the shell to flush
  await new Promise((r) => setTimeout(r, SUSPEND_CAPTURE_WAIT_MS));

  // Read captured state — fall back to the session's original cwd.
  let capturedCwd = cwd;
  const capturedEnv: Record<string, string> = {};

  try {
    capturedCwd = fs.readFileSync(cwdFile, 'utf-8').trim();
  } catch {
    // Fall back to original cwd
  }

  try {
    const rawEnv = fs.readFileSync(envFile, 'utf-8');
    // env -0 separates entries with null bytes
    const entries = rawEnv.split('\0').filter(Boolean);
    for (const entry of entries) {
      const eqIdx = entry.indexOf('=');
      if (eqIdx > 0) {
        const key = entry.slice(0, eqIdx);
        const value = entry.slice(eqIdx + 1);
        capturedEnv[key] = value;
      }
    }
  } catch {
    // If env capture fails, save empty env
  }

  // Clean up temp files
  try { fs.unlinkSync(cwdFile); } catch {}
  try { fs.unlinkSync(envFile); } catch {}

  const savedState: SavedState = {
    cwd: capturedCwd,
    env: capturedEnv,
    captured_at: new Date().toISOString(),
  };

  // Update session with suspended status and saved state
  updateSession(
    terminalId,
    {
      status: 'suspended',
      last_activity_at: new Date().toISOString(),
      saved_state: savedState,
    },
    projectRoot
  );

  logEvent('session.suspended', projectRoot, terminalId, {
    saved_cwd: capturedCwd,
    saved_env_count: Object.keys(capturedEnv).length,
  });

  appendToBuffer(terminalId, '\n--- session suspended (idle timeout) ---\n', projectRoot);

  // Kill the PTY
  try { ptyProcess.kill(); } catch {}

  setTimeout(() => process.exit(0), 100);
}

// ─── PTY Exit ───────────────────────────────────────────────────────────────

ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
  if (suspending) return; // Handled by captureAndSuspend

  clearInterval(queueInterval);
  clearInterval(idleCheckInterval);

  updateSession(
    terminalId,
    {
      status: 'exited',
      last_exit_code: exitCode,
      last_activity_at: new Date().toISOString(),
      queue_length: 0,
    },
    projectRoot
  );

  logEvent('session.exited', projectRoot, terminalId, { exit_code: exitCode });

  setTimeout(() => {
    process.exit(0);
  }, 100);
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

function shutdown(signal: string): void {
  clearInterval(queueInterval);
  clearInterval(idleCheckInterval);

  try {
    ptyProcess.kill();
  } catch {
    // Already dead
  }

  updateSession(
    terminalId,
    {
      status: 'killed',
      last_activity_at: new Date().toISOString(),
    },
    projectRoot
  );

  logEvent('session.killed', projectRoot, terminalId, { signal });
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
