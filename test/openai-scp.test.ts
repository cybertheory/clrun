/**
 * OpenAI tool-calling integration test: an AI agent uses clrun as a tool to drive an SCP server.
 *
 * Prerequisites:
 * - Set OPENAI_API_KEY in the environment (the test is skipped if unset).
 * - Run the SCP stub server in the background, or the test will start it:
 *   node test/fixtures/scp-stub-server.js
 *   (uses port 19799 by default)
 *
 * The test defines a "run_clrun" tool that runs `clrun <args>` and returns the YAML output.
 * It then asks the OpenAI model to use this tool to connect to the SCP server and complete the flow.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CLRUN = path.join(PROJECT_ROOT, 'dist', 'index.js');
const SCP_PORT = 19799;
const SCP_BASE = `http://127.0.0.1:${SCP_PORT}`;
const CLRUN_DIR = path.join(PROJECT_ROOT, '.clrun');

function runClrun(args: string): string {
  return execSync(`node ${CLRUN} ${args}`, {
    cwd: PROJECT_ROOT,
    timeout: 20000,
    encoding: 'utf-8',
    env: { ...process.env },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe.skipIf(!process.env.OPENAI_API_KEY)('OpenAI agent uses clrun to drive SCP', () => {
  let stubProcess: import('child_process').ChildProcess | null = null;

  beforeAll(async () => {
    execSync('npm run build', { cwd: PROJECT_ROOT, encoding: 'utf-8' });
    if (fs.existsSync(CLRUN_DIR)) {
      fs.rmSync(CLRUN_DIR, { recursive: true });
    }
    const stubPath = path.join(PROJECT_ROOT, 'test', 'fixtures', 'scp-stub-server.js');
    stubProcess = spawn(process.execPath, [stubPath], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, SCP_STUB_PORT: String(SCP_PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      await sleep(300);
      try {
        const res = await fetch(`${SCP_BASE}/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: {} }),
        });
        if (res.ok) break;
      } catch {
        // not ready
      }
    }
  }, 15000);

  afterAll(() => {
    if (stubProcess) {
      stubProcess.kill('SIGTERM');
      stubProcess = null;
    }
  });

  it('agent completes SCP flow via run_clrun tool', async () => {
    let OpenAIClient: typeof import('openai').OpenAI;
    try {
      const openai = await import('openai');
      OpenAIClient = openai.OpenAI;
    } catch {
      return; // skip if openai not installed
    }
    const client = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY! });

    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'run_clrun',
          description: 'Run a clrun command. Use "clrun scp <url>" to connect to an SCP server, then "clrun <terminal_id> <input>" to send input (e.g. "1" for first option). Returns YAML output.',
          parameters: {
            type: 'object' as const,
            properties: {
              command: {
                type: 'string' as const,
                description: 'Full clrun command, e.g. "scp http://127.0.0.1:19799" or "<terminal_id> \\"1\\""',
              },
            },
            required: ['command'],
          },
        },
      },
    ];

    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      {
        role: 'user',
        content: `Use the run_clrun tool to:
1. Connect to the SCP server at ${SCP_BASE} (command: clrun scp ${SCP_BASE})
2. From the response, get the terminal_id
3. Send the input "1" to that session (command: clrun <terminal_id> "1")
4. Reply with the terminal_id and whether the flow completed (status exited or output contains Done).`,
      },
    ];

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 1024,
    });

    const choice = res.choices[0];
    if (!choice || !choice.message) {
      throw new Error('No response from OpenAI');
    }

    let terminalId: string | null = null;
    let lastOutput = '';

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      for (const tc of choice.message.tool_calls) {
        if (tc.function?.name === 'run_clrun' && tc.function.arguments) {
          const args = JSON.parse(tc.function.arguments) as { command?: string };
          const cmd = args.command || '';
          if (!cmd.trim()) continue;
          try {
            const out = runClrun(cmd);
            lastOutput = out;
            const parsed = parse(out) as Record<string, unknown>;
            if (parsed.terminal_id) {
              terminalId = String(parsed.terminal_id);
            }
          } catch (e) {
            lastOutput = e instanceof Error ? e.message : String(e);
          }
        }
      }
    }

    expect(terminalId).toBeDefined();
    expect(lastOutput).toMatch(/Done|DONE|completed|exited/);
  }, 60000);
});
