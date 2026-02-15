import * as path from 'path';
import * as fs from 'fs';

const CLRUN_DIR = '.clrun';

/**
 * Resolve the project root by walking up from cwd looking for common
 * project indicators, falling back to cwd itself.
 */
export function resolveProjectRoot(): string {
  let dir = process.cwd();
  const root = path.parse(dir).root;

  while (dir !== root) {
    const indicators = ['package.json', '.git', 'Cargo.toml', 'go.mod', 'pyproject.toml', 'Makefile'];
    for (const indicator of indicators) {
      if (fs.existsSync(path.join(dir, indicator))) {
        return dir;
      }
    }
    // Also check if .clrun already exists
    if (fs.existsSync(path.join(dir, CLRUN_DIR))) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  return process.cwd();
}

/**
 * Get all .clrun paths for the project.
 */
export function getClrunPaths(projectRoot?: string) {
  const root = projectRoot ?? resolveProjectRoot();
  const clrunDir = path.join(root, CLRUN_DIR);

  return {
    root: clrunDir,
    runtimeLock: path.join(clrunDir, 'runtime.lock'),
    runtimePid: path.join(clrunDir, 'runtime.pid'),
    runtimeJson: path.join(clrunDir, 'runtime.json'),
    sessionsDir: path.join(clrunDir, 'sessions'),
    queuesDir: path.join(clrunDir, 'queues'),
    buffersDir: path.join(clrunDir, 'buffers'),
    ledgerDir: path.join(clrunDir, 'ledger'),
    eventsLog: path.join(clrunDir, 'ledger', 'events.log'),
    skillsDir: path.join(clrunDir, 'skills'),
  } as const;
}

/**
 * Ensure all .clrun directories exist.
 */
export function ensureClrunDirs(projectRoot?: string): void {
  const paths = getClrunPaths(projectRoot);
  const dirs = [
    paths.root,
    paths.sessionsDir,
    paths.queuesDir,
    paths.buffersDir,
    paths.ledgerDir,
    paths.skillsDir,
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get session file path for a terminal.
 */
export function sessionPath(terminalId: string, projectRoot?: string): string {
  const paths = getClrunPaths(projectRoot);
  return path.join(paths.sessionsDir, `${terminalId}.json`);
}

/**
 * Get queue file path for a terminal.
 */
export function queuePath(terminalId: string, projectRoot?: string): string {
  const paths = getClrunPaths(projectRoot);
  return path.join(paths.queuesDir, `${terminalId}.json`);
}

/**
 * Get buffer file path for a terminal.
 */
export function bufferPath(terminalId: string, projectRoot?: string): string {
  const paths = getClrunPaths(projectRoot);
  return path.join(paths.buffersDir, `${terminalId}.log`);
}
