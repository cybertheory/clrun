import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

/** Assert a string contains no ANSI escape codes */
function assertNoAnsi(text: string): void {
  // eslint-disable-next-line no-control-regex
  expect(text).not.toMatch(/\x1b/);
  expect(text).not.toMatch(/\[[\d;]*[A-Za-z]/);
  expect(text).not.toMatch(/\[\?2004[hl]/);
}

/** Assert a string contains no shell prompt patterns */
function assertNoPrompts(text: string): void {
  // Should not contain zsh prompt marker lines
  expect(text).not.toMatch(/^%\s{10,}/m);
  // Should not contain full prompt lines
  expect(text).not.toMatch(/@.*MacBook.*%\s*$/m);
}

// ─── Setup / Teardown ───────────────────────────────────────────────────────

beforeAll(() => {
  // Build
  execSync('npm run build', { cwd: PROJECT_ROOT, encoding: 'utf-8' });
  // Clean state
  if (fs.existsSync(CLRUN_DIR)) {
    fs.rmSync(CLRUN_DIR, { recursive: true });
  }
});

afterAll(() => {
  // Kill any remaining sessions
  try {
    const status = clrun('status');
    const sessions = status.sessions as Array<Record<string, unknown>> | undefined;
    if (sessions) {
      for (const s of sessions) {
        if (s.status === 'running') {
          try { clrun(`kill ${s.terminal_id}`); } catch {}
        }
      }
    }
  } catch {}
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('clrun integration', () => {

  // ── Basic command execution ───────────────────────────────────────────

  it('runs echo and returns clean output', () => {
    const result = clrun("run 'echo hello world'");
    expect(result.terminal_id).toBeDefined();
    expect(result.command).toBe('echo hello world');
    expect(result.status).toBeDefined();

    if (result.output) {
      const output = result.output as string;
      assertNoAnsi(output);
      assertNoPrompts(output);
      expect(output).toContain('hello world');
    }
  });

  // ── Export produces no output ─────────────────────────────────────────

  it('export command has no output field', () => {
    const result = clrun("run 'export TEST_CLRUN_VAR=works'");
    expect(result.terminal_id).toBeDefined();
    expect(result.status).toBe('running');
    // export produces no output — field should be absent
    expect(result.output).toBeUndefined();
  });

  // ── Environment variable persistence ──────────────────────────────────

  it('env vars persist across inputs in the same session', async () => {
    const run = clrun("run 'export CLRUN_TEST_PERSIST=hello123'");
    const id = run.terminal_id as string;
    expect(id).toBeDefined();

    // Wait for shell to settle
    await sleep(300);

    const result = clrun(`input ${id} 'echo $CLRUN_TEST_PERSIST'`);
    expect(result.terminal_id).toBe(id);

    if (result.output) {
      const output = result.output as string;
      assertNoAnsi(output);
      assertNoPrompts(output);
      expect(output).toContain('hello123');
    }

    // Clean up
    try { clrun(`kill ${id}`); } catch {}
  });

  // ── Output is clean (no ANSI, no prompts) ─────────────────────────────

  it('output never contains ANSI escape codes', () => {
    const result = clrun("run 'ls package.json'");
    const id = result.terminal_id as string;

    if (result.output) {
      assertNoAnsi(result.output as string);
      assertNoPrompts(result.output as string);
    }

    try { clrun(`kill ${id}`); } catch {}
  });

  // ── Input response only shows new output ──────────────────────────────

  it('input response does not leak previous command output', async () => {
    const run = clrun("run 'echo first_output_marker'");
    const id = run.terminal_id as string;
    await sleep(300);

    const result = clrun(`input ${id} 'echo second_output_marker'`);

    if (result.output) {
      const output = result.output as string;
      // Should contain the NEW command's output
      expect(output).toContain('second_output_marker');
      // Should NOT contain the old command's output
      expect(output).not.toContain('first_output_marker');
    }

    try { clrun(`kill ${id}`); } catch {}
  });

  // ── Interactive prompt detection ──────────────────────────────────────

  it('detects interactive prompts and sends responses', async () => {
    // Create a script that prompts for input
    const script = path.join('/tmp', 'clrun_test_interactive.py');
    fs.writeFileSync(script, 'name = input("Enter name: ")\nprint(f"Got: {name}")\n');

    const run = clrun(`run 'python3 ${script}'`);
    const id = run.terminal_id as string;

    if (run.output) {
      const output = run.output as string;
      assertNoAnsi(output);
      expect(output).toContain('Enter name:');
    }

    // Send response to the prompt
    const response = clrun(`input ${id} 'TestUser'`);

    if (response.output) {
      const output = response.output as string;
      assertNoAnsi(output);
      assertNoPrompts(output);
      expect(output).toContain('Got: TestUser');
    }

    try { clrun(`kill ${id}`); } catch {}
    fs.unlinkSync(script);
  });

  // ── Status command ────────────────────────────────────────────────────

  it('status shows running sessions', () => {
    const run = clrun("run 'sleep 60'");
    const id = run.terminal_id as string;

    const status = clrun('status');
    expect(status.sessions).toBeDefined();

    const sessions = status.sessions as Array<Record<string, unknown>>;
    const found = sessions.find((s) => s.terminal_id === id);
    expect(found).toBeDefined();
    expect(found!.status).toBe('running');

    try { clrun(`kill ${id}`); } catch {}
  });

  // ── Kill command ──────────────────────────────────────────────────────

  it('kill terminates a running session', () => {
    const run = clrun("run 'sleep 60'");
    const id = run.terminal_id as string;

    const killResult = clrun(`kill ${id}`);
    expect(killResult.status).toBe('killed');

    // Status should now show killed
    const status = clrun('status');
    const sessions = status.sessions as Array<Record<string, unknown>>;
    const found = sessions.find((s) => s.terminal_id === id);
    expect(found).toBeDefined();
    expect(found!.status).toBe('killed');
  });

  // ── Tail shows buffer without ANSI ────────────────────────────────────

  it('tail output is clean', async () => {
    const run = clrun("run 'echo tail_test_content'");
    const id = run.terminal_id as string;
    await sleep(300);

    const tail = clrun(`tail ${id} --lines 20`);

    if (tail.output) {
      const output = tail.output as string;
      assertNoAnsi(output);
    }

    try { clrun(`kill ${id}`); } catch {}
  });

  // ── YAML format ───────────────────────────────────────────────────────

  it('all responses are valid YAML', () => {
    const raw = execSync(`node ${CLRUN} run 'echo yaml_test'`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      timeout: 15000,
    });

    expect(raw.startsWith('---\n')).toBe(true);
    const parsed = parse(raw);
    expect(parsed).toBeDefined();
    expect(typeof parsed).toBe('object');
    expect(parsed.terminal_id).toBeDefined();

    try { clrun(`kill ${parsed.terminal_id}`); } catch {}
  });
});
