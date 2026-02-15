import * as fs from 'fs';
import * as crypto from 'crypto';
import * as os from 'os';
import { sessionPath, getClrunPaths } from '../utils/paths';
import type { SessionMetadata } from '../types';

/**
 * Atomically write a file.
 */
function atomicWrite(filePath: string, content: string): void {
  const tmp = filePath + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, filePath);
}

/**
 * Detect the user's default shell.
 */
export function detectShell(): string {
  return process.env.SHELL || (os.platform() === 'win32' ? 'powershell.exe' : '/bin/sh');
}

/**
 * Generate a new terminal ID.
 */
export function generateTerminalId(): string {
  return crypto.randomUUID();
}

/**
 * Create initial session metadata.
 */
export function createSessionMetadata(
  terminalId: string,
  command: string,
  cwd: string,
  pid: number,
  workerPid: number
): SessionMetadata {
  const now = new Date().toISOString();
  return {
    terminal_id: terminalId,
    created_at: now,
    cwd,
    command,
    shell: detectShell(),
    status: 'running',
    pid,
    worker_pid: workerPid,
    queue_length: 0,
    last_exit_code: null,
    last_activity_at: now,
  };
}

/**
 * Write session metadata to disk.
 */
export function writeSession(session: SessionMetadata, projectRoot: string): void {
  const filePath = sessionPath(session.terminal_id, projectRoot);
  atomicWrite(filePath, JSON.stringify(session, null, 2));
}

/**
 * Read session metadata.
 */
export function readSession(terminalId: string, projectRoot: string): SessionMetadata | null {
  const filePath = sessionPath(terminalId, projectRoot);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as SessionMetadata;
  } catch {
    return null;
  }
}

/**
 * Update specific fields in a session.
 */
export function updateSession(
  terminalId: string,
  updates: Partial<SessionMetadata>,
  projectRoot: string
): SessionMetadata | null {
  const session = readSession(terminalId, projectRoot);
  if (!session) return null;

  const updated = { ...session, ...updates };
  writeSession(updated, projectRoot);
  return updated;
}

/**
 * List all session files.
 */
export function listSessions(projectRoot: string): SessionMetadata[] {
  const { sessionsDir } = getClrunPaths(projectRoot);

  if (!fs.existsSync(sessionsDir)) {
    return [];
  }

  const files = fs.readdirSync(sessionsDir).filter((f: string) => f.endsWith('.json'));
  const sessions: SessionMetadata[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(`${sessionsDir}/${file}`, 'utf-8');
      sessions.push(JSON.parse(raw) as SessionMetadata);
    } catch {
      // Skip corrupted session files
    }
  }

  return sessions;
}

/**
 * Check if a PTY process is alive.
 */
export function isPtyAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
