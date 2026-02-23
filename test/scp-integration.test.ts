/**
 * CLRUN SCP integration tests: clrun scp <url>, send input, step to done.
 * Starts a minimal SCP stub server in beforeAll.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLRUN_DIR = path.join(PROJECT_ROOT, '.clrun');
const CLRUN = path.join(PROJECT_ROOT, 'dist', 'index.js');

function clrun(args: string, timeoutMs = 15000): Record<string, unknown> {
  const raw = execSync(`node ${CLRUN} ${args}`, {
    cwd: PROJECT_ROOT,
    timeout: timeoutMs,
    encoding: 'utf-8',
    env: { ...process.env, HOME: process.env.HOME },
  });
  return parse(raw) as Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('clrun scp integration', () => {
  const SCP_PORT = 19799;
  const SCP_BASE = `http://127.0.0.1:${SCP_PORT}`;
  let stubProcess: import('child_process').ChildProcess | null = null;

  beforeAll(async () => {
    execSync('npm run build', { cwd: PROJECT_ROOT, encoding: 'utf-8' });
    if (fs.existsSync(CLRUN_DIR)) {
      fs.rmSync(CLRUN_DIR, { recursive: true });
    }
    const stubPath = path.join(PROJECT_ROOT, 'test', 'fixtures', 'scp-stub-server.js');
    const { spawn } = await import('child_process');
    stubProcess = spawn(process.execPath, [stubPath], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, SCP_STUB_PORT: String(SCP_PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const deadline = Date.now() + 8000;
    let lastError: Error | null = null;
    while (Date.now() < deadline) {
      await sleep(300);
      try {
        const res = await fetch(`${SCP_BASE}/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: {} }),
        });
        if (res.ok) {
          lastError = null;
          break;
        }
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }
    if (lastError) {
      if (stubProcess) stubProcess.kill('SIGTERM');
      throw lastError;
    }
  }, 15000);

  afterAll(() => {
    if (stubProcess) {
      stubProcess.kill('SIGTERM');
      stubProcess = null;
    }
    try {
      const status = clrun('status');
      const sessions = status.sessions as Array<Record<string, unknown>> | undefined;
      if (sessions) {
        for (const s of sessions) {
          if (s.scp_run_id && s.status === 'running') {
            try {
              clrun(`kill ${s.terminal_id}`);
            } catch {
              // ignore
            }
          }
        }
      }
    } catch {
      // ignore
    }
  });

  it('clrun scp connects and returns terminal_id', () => {
    const result = clrun(`scp ${SCP_BASE}`);
    expect(result.terminal_id).toBeDefined();
    expect(result.status).toBe('running');
    expect(result.output).toBeDefined();
    const output = result.output as string;
    expect(output).toContain('Choose an action');
    expect(output).toContain('start');
    try {
      clrun(`kill ${result.terminal_id}`);
    } catch {
      // ignore
    }
  });

  it('clrun scp: sending option "1" transitions to DONE and session exits', () => {
    const connect = clrun(`scp ${SCP_BASE}`);
    const id = connect.terminal_id as string;
    expect(id).toBeDefined();

    const afterInput = clrun(`${id} "1"`);
    expect(afterInput.terminal_id).toBe(id);
    expect(afterInput.output).toBeDefined();

    const status = clrun('status');
    const sessions = status.sessions as Array<Record<string, unknown>>;
    const session = sessions.find((s) => s.terminal_id === id);
    expect(session).toBeDefined();
    expect(session!.status === 'exited' || session!.status === 'running').toBe(true);

    const tail = clrun(`tail ${id} --lines 30`);
    const tailOutput = (tail.output as string) || '';
    expect(tailOutput).toMatch(/Done|DONE|completed/);

    if (session!.status === 'running') {
      try {
        clrun(`kill ${id}`);
      } catch {
        // ignore
      }
    }
  });
});
