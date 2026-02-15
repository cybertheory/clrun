#!/usr/bin/env node
/**
 * clrun worker — detached background process that manages a single PTY session.
 *
 * Spawned by `clrun run`. Runs until the PTY exits.
 *
 * Args: <terminalId> <command> <cwd> <projectRoot>
 */

import * as os from 'os';
import * as path from 'path';
import { appendToBuffer, initBuffer } from './buffer/buffer-manager';
import { readQueue, writeQueue, getNextQueued, markSent, pendingCount } from './queue/queue-engine';
import { writeSession, readSession, updateSession, detectShell } from './pty/pty-manager';
import { logEvent } from './ledger/ledger';
import type { SessionMetadata } from './types';

// ─── Parse Arguments ────────────────────────────────────────────────────────

const [, , terminalId, command, cwd, projectRoot] = process.argv;

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

// ─── Spawn PTY ──────────────────────────────────────────────────────────────

const shell = detectShell();
const isWindows = os.platform() === 'win32';

const ptyProcess = pty.spawn(shell, isWindows ? [] : ['-c', command], {
  name: 'xterm-256color',
  cols: 120,
  rows: 40,
  cwd,
  env: { ...process.env } as Record<string, string>,
});

const ptyPid = ptyProcess.pid;

// ─── Initialize State ───────────────────────────────────────────────────────

initBuffer(terminalId, projectRoot);

const session: SessionMetadata = {
  terminal_id: terminalId,
  created_at: new Date().toISOString(),
  cwd,
  command,
  shell,
  status: 'running',
  pid: ptyPid,
  worker_pid: process.pid,
  queue_length: 0,
  last_exit_code: null,
  last_activity_at: new Date().toISOString(),
};
writeSession(session, projectRoot);

logEvent('session.created', projectRoot, terminalId, { command, cwd, pid: ptyPid });

// ─── Buffer Output ──────────────────────────────────────────────────────────

ptyProcess.onData((data: string) => {
  appendToBuffer(terminalId, data, projectRoot);
  updateSession(
    terminalId,
    { last_activity_at: new Date().toISOString() },
    projectRoot
  );
});

// ─── Queue Processing ───────────────────────────────────────────────────────

let queueInterval: ReturnType<typeof setInterval>;

function processQueue(): void {
  try {
    let next = getNextQueued(terminalId, projectRoot);
    while (next) {
      ptyProcess.write(next.input + '\n');
      markSent(terminalId, next.queue_id, projectRoot);
      logEvent('input.sent', projectRoot, terminalId, {
        queue_id: next.queue_id,
        input: next.input,
      });
      next = getNextQueued(terminalId, projectRoot);
    }

    // Update queue length in session
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
  processQueue();
});

// ─── PTY Exit ───────────────────────────────────────────────────────────────

ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
  clearInterval(queueInterval);

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

  // Small delay to allow final buffer writes
  setTimeout(() => {
    process.exit(0);
  }, 100);
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────

function shutdown(signal: string): void {
  clearInterval(queueInterval);

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
