import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { parse } from 'yaml';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLRUN_DIR = path.join(PROJECT_ROOT, '.clrun');
const CLRUN = path.join(PROJECT_ROOT, 'dist', 'index.js');

function clrun(args: string, timeoutMs = 15000): Record<string, unknown> {
  try {
    const raw = execSync(`node ${CLRUN} ${args}`, {
      cwd: PROJECT_ROOT,
      timeout: timeoutMs,
      encoding: 'utf-8',
      env: { ...process.env, HOME: process.env.HOME },
    });
    return parse(raw) as Record<string, unknown>;
  } catch (err: unknown) {
    // execSync throws on non-zero exit; parse stderr/stdout from the error
    const e = err as { stdout?: string; stderr?: string };
    if (e.stdout) {
      return parse(e.stdout) as Record<string, unknown>;
    }
    throw err;
  }
}

beforeAll(() => {
  execSync('npm run build', { cwd: PROJECT_ROOT, encoding: 'utf-8' });
  if (fs.existsSync(CLRUN_DIR)) {
    fs.rmSync(CLRUN_DIR, { recursive: true });
  }
});

afterAll(() => {
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

describe('runtime validation', () => {

  // ── Session not found gives rich error ────────────────────────────────

  it('session not found error includes hints with active sessions', async () => {
    // Start a session first so we have an active one
    const run = clrun("run 'sleep 60'");
    const activeId = run.terminal_id as string;

    // Try a fake session ID
    const result = clrun('input aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee "hello"');
    expect(result.error).toContain('Session not found');
    expect(result.hints).toBeDefined();

    const hints = result.hints as Record<string, string>;
    expect(hints.list_sessions).toBe('clrun status');
    expect(hints.active_sessions).toContain(activeId);

    try { clrun(`kill ${activeId}`); } catch {}
  });

  // ── Session not running gives contextual error ────────────────────────

  it('input to killed session shows helpful error', async () => {
    const run = clrun("run 'sleep 60'");
    const id = run.terminal_id as string;

    clrun(`kill ${id}`);

    const result = clrun(`input ${id} "hello"`);
    expect(result.error).toContain('not running');
    expect(result.hints).toBeDefined();

    const hints = result.hints as Record<string, string>;
    expect(hints.note).toContain('killed');
    expect(hints.start_new).toBeDefined();
  });

  // ── Empty input warns about shell expansion ───────────────────────────

  it('empty input produces shell expansion warning', async () => {
    const run = clrun("run 'sleep 60'");
    const id = run.terminal_id as string;

    // Send empty string (simulates $UNDEFINED_VAR being expanded to nothing)
    const result = clrun(`input ${id} ""`);
    expect(result.warnings).toBeDefined();

    const warnings = result.warnings as string[];
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('single quotes');

    try { clrun(`kill ${id}`); } catch {}
  });

  // ── All hints use single quotes for variable examples ─────────────────

  it('hints use single quotes for shell variable examples', () => {
    const run = clrun("run 'echo hint_test'");
    const id = run.terminal_id as string;

    if (run.hints) {
      const hints = run.hints as Record<string, string>;
      // The note should mention single quotes
      if (hints.note) {
        expect(hints.note).toContain("single quotes");
      }
    }

    try { clrun(`kill ${id}`); } catch {}
  });

  // ── Kill already-killed session gives good error ──────────────────────

  it('killing an already-killed session gives corrective hint', () => {
    const run = clrun("run 'sleep 60'");
    const id = run.terminal_id as string;

    clrun(`kill ${id}`);

    const result = clrun(`kill ${id}`);
    expect(result.error).toContain('already terminated');
    expect(result.hints).toBeDefined();

    const hints = result.hints as Record<string, string>;
    expect(hints.start_new).toBeDefined();
  });

  // ── Output never contains ANSI after validation ───────────────────────

  it('validated output contains no ANSI escape codes', () => {
    const result = clrun("run 'echo validated_test'");

    if (result.output) {
      const output = result.output as string;
      // eslint-disable-next-line no-control-regex
      expect(output).not.toMatch(/\x1b/);
      expect(output).not.toMatch(/\[\?2004/);
    }

    const id = result.terminal_id as string;
    try { clrun(`kill ${id}`); } catch {}
  });
});
