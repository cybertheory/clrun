// ─── Session ────────────────────────────────────────────────────────────────

export type SessionStatus = 'running' | 'exited' | 'detached' | 'killed' | 'suspended';

export interface SavedState {
  cwd: string;
  env: Record<string, string>;
  captured_at: string;
}

export interface SessionMetadata {
  terminal_id: string;
  created_at: string;
  cwd: string;
  command: string;
  shell: string;
  status: SessionStatus;
  pid: number;
  worker_pid: number;
  queue_length: number;
  last_exit_code: number | null;
  last_activity_at: string;
  saved_state?: SavedState;
}

// ─── Queue ──────────────────────────────────────────────────────────────────

export type QueueMode = 'normal' | 'override';
export type QueueStatus = 'queued' | 'sent' | 'cancelled';

export interface QueueEntry {
  queue_id: string;
  input: string;
  priority: number;
  mode: QueueMode;
  status: QueueStatus;
  created_at: string;
  sent_at: string | null;
}

export interface QueueFile {
  terminal_id: string;
  entries: QueueEntry[];
}

// ─── Runtime ────────────────────────────────────────────────────────────────

export interface RuntimeState {
  pid: number;
  started_at: string;
  version: string;
  project_root: string;
  port?: number;
}

// ─── Ledger ─────────────────────────────────────────────────────────────────

export type LedgerEventType =
  | 'runtime.started'
  | 'runtime.stopped'
  | 'session.created'
  | 'session.exited'
  | 'session.killed'
  | 'session.detached'
  | 'session.suspended'
  | 'session.restored'
  | 'input.queued'
  | 'input.sent'
  | 'input.cancelled'
  | 'input.override'
  | 'key.sent'
  | 'skills.installed'
  | 'skills.global_installed'
  | 'error';

export interface LedgerEvent {
  timestamp: string;
  event: LedgerEventType;
  terminal_id?: string;
  data?: Record<string, unknown>;
}

// ─── CLI Output ─────────────────────────────────────────────────────────────

export interface CLIResponse<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}
