#!/usr/bin/env node

import { Command } from 'commander';
import { runCommand } from './commands/run';
import { inputCommand } from './commands/input';
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

// ─── Default: treat unknown args as a command to run ────────────────────────

const knownCommands = new Set(['run', 'input', 'tail', 'head', 'status', 'kill', 'help']);

const firstArg = process.argv[2];

if (firstArg && !firstArg.startsWith('-') && !knownCommands.has(firstArg)) {
  // Everything after `clrun` is the command: clrun echo hello world → "echo hello world"
  const command = process.argv.slice(2).join(' ');
  withErrorHandling(async () => {
    await runCommand(command);
  })();
} else {
  program.parse();
}
