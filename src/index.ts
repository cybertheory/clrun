#!/usr/bin/env node

import { Command } from 'commander';
import { runCommand } from './commands/run';
import { inputCommand } from './commands/input';
import { keyCommand } from './commands/key';
import { tailCommand } from './commands/tail';
import { headCommand } from './commands/head';
import { statusCommand } from './commands/status';
import { killCommand } from './commands/kill';
import { withErrorHandling } from './utils/output';

const program = new Command();

program
  .name('clrun')
  .description('The Interactive CLI for AI Agents — persistent, deterministic, project-scoped execution')
  .version('1.0.0');

// ─── run ────────────────────────────────────────────────────────────────────

program
  .command('run')
  .description('Run a command in a new interactive PTY session')
  .argument('<command>', 'Command to execute')
  .action(withErrorHandling(async (command: string) => {
    await runCommand(command);
  }));

// ─── input ──────────────────────────────────────────────────────────────────

program
  .command('input')
  .description('Queue input to a running terminal session')
  .argument('<terminal_id>', 'Terminal session ID')
  .argument('<input>', 'Input string to send')
  .option('-p, --priority <number>', 'Priority (higher = first)', '0')
  .option('--override', 'Cancel all pending inputs and send immediately')
  .action(withErrorHandling(async (terminalId: string, input: string, opts: { priority: string; override: boolean }) => {
    await inputCommand(terminalId, input, {
      priority: parseInt(opts.priority, 10),
      override: opts.override ?? false,
    });
  }));

// ─── key ─────────────────────────────────────────────────────────────────────

program
  .command('key')
  .description('Send named keystrokes to a terminal (arrow keys, tab, enter, etc.)')
  .argument('<terminal_id>', 'Terminal session ID')
  .argument('<keys...>', 'Key names: up, down, left, right, enter, tab, escape, space, backspace')
  .action(withErrorHandling(async (terminalId: string, keys: string[]) => {
    await keyCommand(terminalId, keys);
  }));

// ─── tail ───────────────────────────────────────────────────────────────────

program
  .command('tail')
  .description('Show the last N lines of terminal output')
  .argument('<terminal_id>', 'Terminal session ID')
  .option('-n, --lines <number>', 'Number of lines', '50')
  .action(withErrorHandling(async (terminalId: string, opts: { lines: string }) => {
    await tailCommand(terminalId, { lines: parseInt(opts.lines, 10) });
  }));

// ─── head ───────────────────────────────────────────────────────────────────

program
  .command('head')
  .description('Show the first N lines of terminal output')
  .argument('<terminal_id>', 'Terminal session ID')
  .option('-n, --lines <number>', 'Number of lines', '50')
  .action(withErrorHandling(async (terminalId: string, opts: { lines: string }) => {
    await headCommand(terminalId, { lines: parseInt(opts.lines, 10) });
  }));

// ─── status ─────────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Show runtime status and all terminal sessions')
  .action(withErrorHandling(async () => {
    await statusCommand();
  }));

// ─── kill ───────────────────────────────────────────────────────────────────

program
  .command('kill')
  .description('Kill a running terminal session')
  .argument('<terminal_id>', 'Terminal session ID')
  .action(withErrorHandling(async (terminalId: string) => {
    await killCommand(terminalId);
  }));

// ─── Smart routing: bare commands & terminal_id shorthand ───────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const knownCommands = new Set(['run', 'input', 'key', 'tail', 'head', 'status', 'kill', 'help']);

const firstArg = process.argv[2];

if (firstArg && !firstArg.startsWith('-') && !knownCommands.has(firstArg)) {
  if (UUID_RE.test(firstArg)) {
    // clrun <terminal_id> echo $MY_VAR  →  send input to that session
    const terminalId = firstArg;
    const rest = process.argv.slice(3);

    if (rest.length === 0) {
      // clrun <terminal_id>  →  shorthand for tail
      withErrorHandling(async () => {
        await tailCommand(terminalId, { lines: 50 });
      })();
    } else {
      // clrun <terminal_id> <anything>  →  send as input
      const input = rest.join(' ');
      withErrorHandling(async () => {
        await inputCommand(terminalId, input, { priority: 0, override: false });
      })();
    }
  } else {
    // clrun echo hello world  →  run a new command
    const command = process.argv.slice(2).join(' ');
    withErrorHandling(async () => {
      await runCommand(command);
    })();
  }
} else {
  program.parse();
}
