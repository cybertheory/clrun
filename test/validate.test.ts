import { describe, it, expect } from 'vitest';
import {
  checkOutputQuality,
  validateInput,
  validateCommand,
  sessionNotFoundError,
  sessionNotRunningError,
} from '../src/utils/validate';

describe('checkOutputQuality', () => {
  it('passes clean output through unchanged', () => {
    const { output, warnings } = checkOutputQuality('hello world', 'test');
    expect(output).toBe('hello world');
    expect(warnings).toHaveLength(0);
  });

  it('returns null output as-is with no warnings', () => {
    const { output, warnings } = checkOutputQuality(null, 'test');
    expect(output).toBeNull();
    expect(warnings).toHaveLength(0);
  });

  it('strips ANSI codes and warns if they leak', () => {
    const { output, warnings } = checkOutputQuality('\x1b[31mred text\x1b[0m', 'test');
    expect(output).not.toContain('\x1b');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('ANSI');
  });

  it('strips bracket paste mode and warns', () => {
    const { output, warnings } = checkOutputQuality('text[?2004h more', 'test');
    expect(output).not.toContain('[?2004h');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('bracket paste');
  });
});

describe('validateInput', () => {
  it('returns no warnings for normal input', () => {
    const { warnings } = validateInput('echo hello');
    expect(warnings).toHaveLength(0);
  });

  it('warns on empty input (likely expanded variable)', () => {
    const { warnings } = validateInput('');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('single quotes');
  });

  it('warns on "echo" with no arguments', () => {
    const { warnings } = validateInput('echo');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('missing argument');
  });

  it('does not warn on "echo hello"', () => {
    const { warnings } = validateInput('echo hello');
    expect(warnings).toHaveLength(0);
  });
});

describe('validateCommand', () => {
  it('returns no warnings for normal commands', () => {
    const { warnings } = validateCommand('npm test');
    expect(warnings).toHaveLength(0);
  });

  it('warns on empty command', () => {
    const { warnings } = validateCommand('');
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('sessionNotFoundError', () => {
  it('returns error with hints', () => {
    const err = sessionNotFoundError('fake-id');
    expect(err.error).toContain('fake-id');
    expect(err.hints.list_sessions).toBe('clrun status');
    expect(err.hints.start_new).toBeDefined();
  });
});

describe('sessionNotRunningError', () => {
  it('returns contextual hints for exited sessions', () => {
    const err = sessionNotRunningError('some-id', 'exited');
    expect(err.error).toContain('exited');
    expect(err.hints.read_output).toContain('some-id');
    expect(err.hints.start_new).toBeDefined();
  });

  it('returns contextual hints for killed sessions', () => {
    const err = sessionNotRunningError('some-id', 'killed');
    expect(err.error).toContain('killed');
    expect(err.hints.start_new).toBeDefined();
  });

  it('returns contextual hints for detached sessions', () => {
    const err = sessionNotRunningError('some-id', 'detached');
    expect(err.error).toContain('detached');
    expect(err.hints.note).toContain('crash');
  });
});
