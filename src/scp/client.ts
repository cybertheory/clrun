/**
 * Minimal SCP client using fetch. No dependency on scp-sdk so CLRUN works when SCP folder is gitignored.
 * Canonical CLI format: snake_case (prompt, hint, options, input_hint).
 */

const TIMEOUT_MS = 30_000;

export interface CliResponse {
  prompt?: string;
  hint?: string;
  options?: { action: string; label: string; keys?: string }[];
  input_hint?: string;
}

export interface StateFrame {
  run_id: string;
  workflow_id: string;
  state: string;
  status: string;
  hint: string;
  next_states: { action: string; href: string; expects?: Record<string, string> }[];
}

export class SCPClient {
  private baseUrl: string;
  private runId: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async startRun(data?: Record<string, unknown>): Promise<StateFrame> {
    const res = await fetch(`${this.baseUrl}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: data ?? {} }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`SCP startRun: ${res.status} ${await res.text()}`);
    const frame = (await res.json()) as StateFrame;
    this.runId = frame.run_id;
    return frame;
  }

  async getFrame(runId?: string): Promise<StateFrame> {
    const id = runId ?? this.runId;
    if (!id) throw new Error('No run_id');
    const res = await fetch(`${this.baseUrl}/runs/${id}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`SCP getFrame: ${res.status} ${await res.text()}`);
    return (await res.json()) as StateFrame;
  }

  async getCli(runId?: string): Promise<CliResponse> {
    const id = runId ?? this.runId;
    if (!id) throw new Error('No run_id');
    const res = await fetch(`${this.baseUrl}/runs/${id}/cli`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`SCP getCli: ${res.status} ${await res.text()}`);
    return (await res.json()) as CliResponse;
  }

  async transition(action: string, body?: Record<string, unknown>, runId?: string): Promise<StateFrame> {
    const id = runId ?? this.runId;
    if (!id) throw new Error('No run_id');
    const frame = await this.getFrame(id);
    const ns = frame.next_states.find((x) => x.action === action);
    if (!ns) throw new Error(`Action '${action}' not in next_states`);
    const url = ns.href.startsWith('http') ? ns.href : `${this.baseUrl}${ns.href.startsWith('/') ? '' : '/'}${ns.href}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`SCP transition: ${res.status} ${await res.text()}`);
    return (await res.json()) as StateFrame;
  }

  getRunId(): string | null {
    return this.runId;
  }
}

/** Format CLI response as display text for the buffer. */
export function formatCliForBuffer(cli: CliResponse): string {
  const lines: string[] = [];
  if (cli.prompt) lines.push(cli.prompt);
  if (cli.hint) lines.push(cli.hint);
  if (cli.options && cli.options.length > 0) {
    cli.options.forEach((opt, i) => {
      lines.push(`  ${i + 1}. ${opt.label} (${opt.action})`);
    });
  }
  if (cli.input_hint) lines.push(cli.input_hint);
  return lines.join('\n') + '\n';
}

/** Resolve user input to an action: "1" -> options[0].action, "action_name" -> action_name, else pass as body. */
export function resolveInputToActionOrBody(
  input: string,
  options: { action: string; label: string }[]
): { action: string; body?: Record<string, unknown> } | null {
  const trimmed = input.trim();
  const n = parseInt(trimmed, 10);
  if (!Number.isNaN(n) && n >= 1 && n <= options.length) {
    return { action: options[n - 1].action };
  }
  const byAction = options.find((o) => o.action === trimmed);
  if (byAction) return { action: byAction.action };
  if (options.length === 1 && trimmed) {
    return { action: options[0].action, body: { value: trimmed } };
  }
  return null;
}
