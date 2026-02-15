import * as fs from 'fs';
import { getClrunPaths, ensureClrunDirs } from '../utils/paths';
import type { LedgerEvent, LedgerEventType } from '../types';

/**
 * Append a structured event to the ledger log.
 * The ledger is append-only.
 */
export function logEvent(
  event: LedgerEventType,
  projectRoot: string,
  terminalId?: string,
  data?: Record<string, unknown>
): void {
  ensureClrunDirs(projectRoot);
  const paths = getClrunPaths(projectRoot);

  const entry: LedgerEvent = {
    timestamp: new Date().toISOString(),
    event,
    ...(terminalId && { terminal_id: terminalId }),
    ...(data && { data }),
  };

  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(paths.eventsLog, line, 'utf-8');
}

/**
 * Read all ledger events.
 */
export function readEvents(projectRoot: string): LedgerEvent[] {
  const paths = getClrunPaths(projectRoot);

  if (!fs.existsSync(paths.eventsLog)) {
    return [];
  }

  const content = fs.readFileSync(paths.eventsLog, 'utf-8').trim();
  if (!content) return [];

  return content
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as LedgerEvent;
      } catch {
        return null;
      }
    })
    .filter((e): e is LedgerEvent => e !== null);
}

/**
 * Read the last N events.
 */
export function readRecentEvents(projectRoot: string, count: number): LedgerEvent[] {
  const events = readEvents(projectRoot);
  return events.slice(-count);
}
