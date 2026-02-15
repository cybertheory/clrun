import * as fs from 'fs';
import * as path from 'path';
import { getClrunPaths, ensureClrunDirs } from '../utils/paths';
import type { RuntimeState } from '../types';

const PACKAGE_VERSION = '1.0.0';

/**
 * Check if a process with the given PID is alive.
 */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Atomically write a file by writing to a temp file then renaming.
 */
function atomicWrite(filePath: string, content: string): void {
  const tmp = filePath + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, filePath);
}

export interface LockResult {
  acquired: boolean;
  attached: boolean;
  existingPid?: number;
  message: string;
}

/**
 * Acquire the runtime lock for this project.
 *
 * - If no lock exists → create it
 * - If lock exists with dead PID → steal it
 * - If lock exists with alive PID → attach
 */
export function acquireLock(projectRoot: string): LockResult {
  ensureClrunDirs(projectRoot);
  const paths = getClrunPaths(projectRoot);

  // Check existing lock
  if (fs.existsSync(paths.runtimeLock)) {
    try {
      const existingPid = parseInt(fs.readFileSync(paths.runtimePid, 'utf-8').trim(), 10);

      if (isProcessAlive(existingPid)) {
        // Process is alive — attach to existing runtime
        return {
          acquired: false,
          attached: true,
          existingPid,
          message: `Attached to existing runtime (PID: ${existingPid})`,
        };
      }

      // Process is dead — steal the lock
      cleanupLock(paths);
    } catch {
      // Corrupted lock files — clean up and recreate
      cleanupLock(paths);
    }
  }

  // Create new lock
  const pid = process.pid;
  const runtime: RuntimeState = {
    pid,
    started_at: new Date().toISOString(),
    version: PACKAGE_VERSION,
    project_root: projectRoot,
  };

  atomicWrite(paths.runtimeLock, `${pid}\n${Date.now()}`);
  atomicWrite(paths.runtimePid, String(pid));
  atomicWrite(paths.runtimeJson, JSON.stringify(runtime, null, 2));

  return {
    acquired: true,
    attached: false,
    message: `Runtime lock acquired (PID: ${pid})`,
  };
}

/**
 * Release the runtime lock.
 */
export function releaseLock(projectRoot: string): void {
  const paths = getClrunPaths(projectRoot);
  cleanupLock(paths);
}

/**
 * Read current runtime state. Returns null if no valid runtime.
 */
export function readRuntimeState(projectRoot: string): RuntimeState | null {
  const paths = getClrunPaths(projectRoot);

  if (!fs.existsSync(paths.runtimeJson)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(paths.runtimeJson, 'utf-8');
    return JSON.parse(raw) as RuntimeState;
  } catch {
    return null;
  }
}

/**
 * Check if the runtime is active (lock exists and PID alive).
 */
export function isRuntimeActive(projectRoot: string): boolean {
  const paths = getClrunPaths(projectRoot);

  if (!fs.existsSync(paths.runtimePid)) {
    return false;
  }

  try {
    const pid = parseInt(fs.readFileSync(paths.runtimePid, 'utf-8').trim(), 10);
    return isProcessAlive(pid);
  } catch {
    return false;
  }
}

function cleanupLock(paths: ReturnType<typeof getClrunPaths>): void {
  const files = [paths.runtimeLock, paths.runtimePid, paths.runtimeJson];
  for (const f of files) {
    try {
      fs.unlinkSync(f);
    } catch {
      // Ignore — file may not exist
    }
  }
}
