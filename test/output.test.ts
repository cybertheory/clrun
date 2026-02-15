import { describe, it, expect } from 'vitest';
import { stripAnsi, cleanOutput } from '../src/utils/output';

// ─── stripAnsi ──────────────────────────────────────────────────────────────

describe('stripAnsi', () => {
  it('strips SGR color codes', () => {
    expect(stripAnsi('\x1b[31mred\x1b[0m')).toBe('red');
  });

  it('strips bold/underline/etc', () => {
    expect(stripAnsi('\x1b[1m\x1b[7m%\x1b[27m\x1b[1m\x1b[0m')).toBe('%');
  });

  it('strips bracket paste mode (?2004h/l)', () => {
    expect(stripAnsi('\x1b[?2004hsome text\x1b[?2004l')).toBe('some text');
  });

  it('strips cursor movement', () => {
    expect(stripAnsi('\x1b[Ksome text\x1b[J')).toBe('some text');
  });

  it('strips OSC sequences (title setting)', () => {
    expect(stripAnsi('\x1b]0;window title\x07actual text')).toBe('actual text');
  });

  it('handles backspace character pairs', () => {
    // Backspace removes the char before it: 'a' stays, 'b\x08' collapses, 'c' stays
    expect(stripAnsi('ab\x08c')).toBe('ac');
  });

  it('strips carriage returns not followed by newline', () => {
    // \r is removed but the text before it is preserved (not overwritten in string ops)
    expect(stripAnsi('old text\rnew text')).toBe('old textnew text');
  });

  it('preserves newlines', () => {
    expect(stripAnsi('line1\nline2\n')).toBe('line1\nline2\n');
  });

  it('handles empty string', () => {
    expect(stripAnsi('')).toBe('');
  });

  it('handles string with no escape codes', () => {
    expect(stripAnsi('hello world')).toBe('hello world');
  });

  it('strips complex zsh prompt sequence', () => {
    const raw = '\x1b[1m\x1b[7m%\x1b[27m\x1b[1m\x1b[0m' +
      '                 ' +
      '\r \r\r' +
      '\x1b[0m\x1b[27m\x1b[24m\x1b[J' +
      'user@host dir % ' +
      '\x1b[K\x1b[?2004h';
    const result = stripAnsi(raw);
    expect(result).not.toContain('\x1b');
    expect(result).not.toContain('[?2004h');
    expect(result).toContain('user@host dir');
  });
});

// ─── cleanOutput ────────────────────────────────────────────────────────────

describe('cleanOutput', () => {
  it('returns null for empty lines', () => {
    expect(cleanOutput([])).toBeNull();
  });

  it('returns null when all lines are shell prompts', () => {
    const lines = [
      'rishabhsingh@Rishabhs-MacBook-Pro commandlinerun % ',
      '%                                                                            ',
    ];
    expect(cleanOutput(lines)).toBeNull();
  });

  it('strips echoed command', () => {
    const lines = [
      'echo hello world',
      'hello world',
      'user@host dir % ',
    ];
    expect(cleanOutput(lines, 'echo hello world')).toBe('hello world');
  });

  it('returns null when only echo and prompts (e.g., export)', () => {
    const lines = [
      'export MY_VAR=hello',
      '%                                                     user@host dir % export MY_VAR=hello',
      '%                                                     user@host dir % ',
    ];
    expect(cleanOutput(lines, 'export MY_VAR=hello')).toBeNull();
  });

  it('extracts actual command output from noisy buffer', () => {
    const lines = [
      'echo $MY_VAR',
      '%                                                     user@host dir % echo $MY_VAR',
      'hello_from_clrun',
      '%                                                     user@host dir % ',
    ];
    expect(cleanOutput(lines, 'echo $MY_VAR')).toBe('hello_from_clrun');
  });

  it('preserves multi-line command output', () => {
    const lines = [
      'ls',
      '%     user@host dir % ls',
      'file1.txt',
      'file2.txt',
      'dir/',
      '%     user@host dir % ',
    ];
    expect(cleanOutput(lines, 'ls')).toBe('file1.txt\nfile2.txt\ndir/');
  });

  it('handles interactive prompt output', () => {
    const lines = [
      'What is your name? ',
    ];
    expect(cleanOutput(lines)).toBe('What is your name?');
  });

  it('handles ANSI codes in lines before filtering', () => {
    const lines = [
      '\x1b[1m\x1b[7m%\x1b[27m\x1b[1m\x1b[0m                  \r \r',
      '\x1b[0m\x1b[27m\x1b[24m\x1b[Juser@host dir % \x1b[K\x1b[?2004hecho hi\x1b[?2004l\r',
      'hi',
      '\x1b[1m\x1b[7m%\x1b[27m\x1b[1m\x1b[0m                  \r \r',
    ];
    expect(cleanOutput(lines, 'echo hi')).toBe('hi');
  });

  it('filters empty lines, preserving only content', () => {
    const lines = [
      'line 1',
      '',
      '',
      '',
      '',
      'line 2',
    ];
    // Empty lines are filtered out as non-meaningful; remaining lines are joined
    expect(cleanOutput(lines)).toBe('line 1\nline 2');
  });
});
