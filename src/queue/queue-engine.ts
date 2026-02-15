import * as fs from 'fs';
import * as crypto from 'crypto';
import { queuePath } from '../utils/paths';
import type { QueueEntry, QueueFile } from '../types';

/**
 * Atomically write a file.
 */
function atomicWrite(filePath: string, content: string): void {
  const tmp = filePath + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, filePath);
}

/**
 * Initialize an empty queue for a terminal.
 */
export function initQueue(terminalId: string, projectRoot: string): void {
  const filePath = queuePath(terminalId, projectRoot);
  const queue: QueueFile = { terminal_id: terminalId, entries: [] };
  atomicWrite(filePath, JSON.stringify(queue, null, 2));
}

/**
 * Read the queue for a terminal.
 */
export function readQueue(terminalId: string, projectRoot: string): QueueFile {
  const filePath = queuePath(terminalId, projectRoot);

  if (!fs.existsSync(filePath)) {
    return { terminal_id: terminalId, entries: [] };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as QueueFile;
  } catch {
    return { terminal_id: terminalId, entries: [] };
  }
}

/**
 * Write the queue atomically.
 */
export function writeQueue(terminalId: string, queue: QueueFile, projectRoot: string): void {
  const filePath = queuePath(terminalId, projectRoot);
  atomicWrite(filePath, JSON.stringify(queue, null, 2));
}

/**
 * Enqueue a normal input.
 */
export function enqueueInput(
  terminalId: string,
  input: string,
  priority: number,
  projectRoot: string
): QueueEntry {
  const queue = readQueue(terminalId, projectRoot);

  const entry: QueueEntry = {
    queue_id: crypto.randomUUID(),
    input,
    priority,
    mode: 'normal',
    status: 'queued',
    created_at: new Date().toISOString(),
    sent_at: null,
  };

  queue.entries.push(entry);
  writeQueue(terminalId, queue, projectRoot);

  return entry;
}

/**
 * Enqueue an override input — cancels all pending inputs first.
 */
export function enqueueOverride(
  terminalId: string,
  input: string,
  projectRoot: string
): { entry: QueueEntry; cancelled: number } {
  const queue = readQueue(terminalId, projectRoot);

  // Cancel all pending (unsent) entries
  let cancelled = 0;
  for (const entry of queue.entries) {
    if (entry.status === 'queued') {
      entry.status = 'cancelled';
      cancelled++;
    }
  }

  // Insert override at the beginning
  const entry: QueueEntry = {
    queue_id: crypto.randomUUID(),
    input,
    priority: Number.MAX_SAFE_INTEGER,
    mode: 'override',
    status: 'queued',
    created_at: new Date().toISOString(),
    sent_at: null,
  };

  queue.entries.push(entry);
  writeQueue(terminalId, queue, projectRoot);

  return { entry, cancelled };
}

/**
 * Get the next queued entry sorted by priority DESC, created_at ASC.
 */
export function getNextQueued(terminalId: string, projectRoot: string): QueueEntry | null {
  const queue = readQueue(terminalId, projectRoot);

  const pending = queue.entries.filter((e) => e.status === 'queued');
  if (pending.length === 0) return null;

  // Sort: priority DESC, then created_at ASC
  pending.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return pending[0];
}

/**
 * Mark a queue entry as sent.
 */
export function markSent(terminalId: string, queueId: string, projectRoot: string): void {
  const queue = readQueue(terminalId, projectRoot);

  const entry = queue.entries.find((e) => e.queue_id === queueId);
  if (entry) {
    entry.status = 'sent';
    entry.sent_at = new Date().toISOString();
    writeQueue(terminalId, queue, projectRoot);
  }
}

/**
 * Get pending queue length.
 */
export function pendingCount(terminalId: string, projectRoot: string): number {
  const queue = readQueue(terminalId, projectRoot);
  return queue.entries.filter((e) => e.status === 'queued').length;
}
