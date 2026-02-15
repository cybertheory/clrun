import * as fs from 'fs';
import { bufferPath } from '../utils/paths';

/**
 * Append raw PTY output to the terminal's buffer log.
 * This is append-only — no truncation.
 */
export function appendToBuffer(terminalId: string, data: string, projectRoot: string): void {
  const filePath = bufferPath(terminalId, projectRoot);
  fs.appendFileSync(filePath, data, 'utf-8');
}

/**
 * Initialize an empty buffer file for a terminal.
 */
export function initBuffer(terminalId: string, projectRoot: string): void {
  const filePath = bufferPath(terminalId, projectRoot);
  fs.writeFileSync(filePath, '', 'utf-8');
}

/**
 * Read the last N lines from the buffer.
 */
export function tailBuffer(terminalId: string, lines: number, projectRoot: string): string[] {
  const filePath = bufferPath(terminalId, projectRoot);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const allLines = content.split('\n');

  // Remove trailing empty line from split
  if (allLines.length > 0 && allLines[allLines.length - 1] === '') {
    allLines.pop();
  }

  return allLines.slice(-lines);
}

/**
 * Read the first N lines from the buffer.
 */
export function headBuffer(terminalId: string, lines: number, projectRoot: string): string[] {
  const filePath = bufferPath(terminalId, projectRoot);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const allLines = content.split('\n');

  if (allLines.length > 0 && allLines[allLines.length - 1] === '') {
    allLines.pop();
  }

  return allLines.slice(0, lines);
}

/**
 * Get total line count of a buffer.
 */
export function bufferLineCount(terminalId: string, projectRoot: string): number {
  const filePath = bufferPath(terminalId, projectRoot);

  if (!fs.existsSync(filePath)) {
    return 0;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  if (content === '') return 0;

  const allLines = content.split('\n');
  if (allLines[allLines.length - 1] === '') {
    return allLines.length - 1;
  }
  return allLines.length;
}

/**
 * Get the raw buffer content.
 */
export function readRawBuffer(terminalId: string, projectRoot: string): string {
  const filePath = bufferPath(terminalId, projectRoot);

  if (!fs.existsSync(filePath)) {
    return '';
  }

  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Get the current buffer file size in bytes.
 * Used to snapshot the position before sending a command.
 */
export function getBufferSize(terminalId: string, projectRoot: string): number {
  const filePath = bufferPath(terminalId, projectRoot);

  if (!fs.existsSync(filePath)) {
    return 0;
  }

  return fs.statSync(filePath).size;
}

/**
 * Read only NEW content appended to the buffer since a given byte offset.
 * Returns the new content split into lines.
 */
export function readBufferSince(terminalId: string, offset: number, projectRoot: string): string[] {
  const filePath = bufferPath(terminalId, projectRoot);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const fd = fs.openSync(filePath, 'r');
  const stat = fs.fstatSync(fd);
  const newBytes = stat.size - offset;

  if (newBytes <= 0) {
    fs.closeSync(fd);
    return [];
  }

  const buf = Buffer.alloc(newBytes);
  fs.readSync(fd, buf, 0, newBytes, offset);
  fs.closeSync(fd);

  const content = buf.toString('utf-8');
  const lines = content.split('\n');

  // Remove trailing empty line from split
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines;
}
