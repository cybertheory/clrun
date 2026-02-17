import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getClrunPaths, ensureClrunDirs } from '../utils/paths';
import { logEvent } from '../ledger/ledger';
import {
  CLRUN_SKILL,
  CLAUDE_CODE_SKILL,
  OPENCLAW_SKILL,
  AGENT_SKILL_MD,
  AGENT_SKILL_TUI_PATTERNS,
} from './templates';

interface SkillDefinition {
  filename: string;
  content: string;
}

const SKILLS: SkillDefinition[] = [
  { filename: 'clrun-skill.md', content: CLRUN_SKILL },
  { filename: 'claude-code-skill.md', content: CLAUDE_CODE_SKILL },
  { filename: 'openclaw-skill.md', content: OPENCLAW_SKILL },
];

/**
 * Agent Skills spec files (agentskills.io format).
 * Installed into .clrun/skills/clrun/SKILL.md and references/.
 */
const AGENT_SKILLS: { filepath: string; content: string }[] = [
  { filepath: 'clrun/SKILL.md', content: AGENT_SKILL_MD },
  { filepath: 'clrun/references/tui-patterns.md', content: AGENT_SKILL_TUI_PATTERNS },
];

// ─── Cursor rule content ─────────────────────────────────────────────────────

const CURSOR_RULE = `---
description: Always use clrun for terminal command execution instead of running commands directly
alwaysApply: true
---

# Use clrun for All Terminal Commands

When executing terminal commands, **always use \\\`clrun\\\`** instead of running commands directly in the shell. This gives persistent, observable, interactive sessions.

## How to Run Commands

\\\`\\\`\\\`bash
# Start a new session
clrun <command>

# Send input to an existing session
clrun <terminal_id> "<text>"

# Navigate TUI prompts (select lists, checkboxes, confirms)
clrun key <terminal_id> down down enter
clrun key <terminal_id> space down space enter

# Read output
clrun tail <terminal_id> --lines 50

# Check all sessions
clrun status

# Kill a session
clrun kill <terminal_id>
\\\`\\\`\\\`

## Rules

1. **Never run shell commands directly** — always wrap them with \\\`clrun\\\`
2. **Store the \\\`terminal_id\\\`** from every \\\`clrun\\\` response
3. **Use \\\`clrun key\\\`** for TUI prompts with select lists or checkboxes
4. **Use \\\`clrun <id> "text"\\\`** for text input prompts
5. **Use \\\`clrun key <id> enter\\\`** to accept defaults in TUI prompts
6. **Single-quote \\\`$\\\` variables** — \\\`clrun <id> 'echo $VAR'\\\`
7. **Read the \\\`hints\\\`** in every response — they tell you exactly what to do next
8. **Parse YAML** — all clrun responses are structured YAML

## Prompt Types

| You see | Action |
|---------|--------|
| \\\`◆ Name: │ default\\\` | \\\`clrun <id> "value"\\\` or \\\`clrun key <id> enter\\\` |
| \\\`● Option1 ○ Option2\\\` | \\\`clrun key <id> down... enter\\\` |
| \\\`◻ Check1 ◻ Check2\\\` | \\\`clrun key <id> space down space enter\\\` |
| \\\`● Yes / ○ No\\\` | \\\`clrun key <id> enter\\\` or \\\`clrun key <id> right enter\\\` |
| \\\`(y/n)\\\` | \\\`clrun <id> "y"\\\` or \\\`clrun <id> "n"\\\` |
`;

// ─── Cline rule content ──────────────────────────────────────────────────────

const CLINE_RULE = `# clrun — Use for All Terminal Commands

Always use \\\`clrun\\\` instead of running commands directly. This gives persistent, observable, interactive terminal sessions with structured YAML responses.

## Commands

| Action | Command |
|--------|---------|
| Run a command | \\\`clrun <command>\\\` |
| Send text + Enter | \\\`clrun <id> "text"\\\` |
| Send keystrokes | \\\`clrun key <id> down enter\\\` |
| Toggle checkbox | \\\`clrun key <id> space\\\` |
| Accept default | \\\`clrun key <id> enter\\\` |
| View output | \\\`clrun tail <id>\\\` |
| Check sessions | \\\`clrun status\\\` |
| Kill session | \\\`clrun kill <id>\\\` |
| Interrupt | \\\`clrun key <id> ctrl-c\\\` |

## Rules

1. Never run shell commands directly — always use \\\`clrun\\\`
2. Store the \\\`terminal_id\\\` from every response
3. Use \\\`clrun key\\\` for TUI prompts (select lists, checkboxes, confirms)
4. Use \\\`clrun <id> "text"\\\` for text input prompts
5. Accept defaults with \\\`clrun key <id> enter\\\`
6. Single-quote \\\`$\\\` variables: \\\`clrun <id> 'echo $VAR'\\\`
7. Read the \\\`hints\\\` in every response
8. Parse YAML — all responses are structured YAML
`;

// ─── Global agent skill targets ──────────────────────────────────────────────

interface GlobalTarget {
  name: string;
  detect: string;
  filepath: string;
  content: string;
  mkdirPath?: string;
}

function getGlobalTargets(): GlobalTarget[] {
  const home = os.homedir();
  return [
    {
      name: 'Claude Code',
      detect: path.join(home, '.claude'),
      filepath: path.join(home, '.claude', 'skills', 'clrun', 'SKILL.md'),
      content: AGENT_SKILL_MD,
      mkdirPath: path.join(home, '.claude', 'skills', 'clrun'),
    },
    {
      name: 'Cursor',
      detect: path.join(home, '.cursor'),
      filepath: path.join(home, '.cursor', 'rules', 'use-clrun.mdc'),
      content: CURSOR_RULE,
      mkdirPath: path.join(home, '.cursor', 'rules'),
    },
    {
      name: 'Cline',
      detect: path.join(home, 'Documents', 'Cline'),
      filepath: path.join(home, 'Documents', 'Cline', 'Rules', 'clrun.md'),
      content: CLINE_RULE,
      mkdirPath: path.join(home, 'Documents', 'Cline', 'Rules'),
    },
  ];
}

/**
 * Install skills into global agent directories (Claude Code, Cursor, Cline).
 * Only installs if the agent's config directory exists (i.e., agent is installed).
 * Idempotent — skips files that already exist.
 */
function installGlobalSkills(projectRoot: string): string[] {
  const installed: string[] = [];

  for (const target of getGlobalTargets()) {
    try {
      if (!fs.existsSync(target.detect)) continue;
      if (fs.existsSync(target.filepath)) continue;

      if (target.mkdirPath) {
        fs.mkdirSync(target.mkdirPath, { recursive: true });
      }
      fs.writeFileSync(target.filepath, target.content.trim() + '\n', 'utf-8');
      installed.push(`${target.name}: ${target.filepath}`);
    } catch {
      // Silently skip — permission errors, read-only dirs, etc.
    }
  }

  if (installed.length > 0) {
    logEvent('skills.global_installed', projectRoot, undefined, {
      agents: installed,
    });
  }

  return installed;
}

/**
 * Install all skill files into .clrun/skills/ and global agent directories.
 * Only writes files that don't already exist (idempotent).
 */
export function installSkills(projectRoot: string): string[] {
  ensureClrunDirs(projectRoot);
  const paths = getClrunPaths(projectRoot);
  const installed: string[] = [];

  // Flat skill files
  for (const skill of SKILLS) {
    const filePath = path.join(paths.skillsDir, skill.filename);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, skill.content.trim() + '\n', 'utf-8');
      installed.push(skill.filename);
    }
  }

  // Agent Skills spec format (agentskills.io)
  for (const agentSkill of AGENT_SKILLS) {
    const filePath = path.join(paths.skillsDir, agentSkill.filepath);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, agentSkill.content.trim() + '\n', 'utf-8');
      installed.push(agentSkill.filepath);
    }
  }

  // Global agent directories (Claude Code, Cursor, Cline)
  const globalInstalled = installGlobalSkills(projectRoot);
  installed.push(...globalInstalled);

  if (installed.length > 0) {
    logEvent('skills.installed', projectRoot, undefined, {
      files: installed,
    });
  }

  return installed;
}

/**
 * Check if skills are already installed.
 */
export function skillsInstalled(projectRoot: string): boolean {
  const paths = getClrunPaths(projectRoot);

  const flatInstalled = SKILLS.every((skill) =>
    fs.existsSync(path.join(paths.skillsDir, skill.filename))
  );
  const agentInstalled = AGENT_SKILLS.every((agentSkill) =>
    fs.existsSync(path.join(paths.skillsDir, agentSkill.filepath))
  );

  return flatInstalled && agentInstalled;
}

/**
 * Force reinstall all skills (overwrites existing).
 */
export function reinstallSkills(projectRoot: string): string[] {
  ensureClrunDirs(projectRoot);
  const paths = getClrunPaths(projectRoot);
  const installed: string[] = [];

  for (const skill of SKILLS) {
    const filePath = path.join(paths.skillsDir, skill.filename);
    fs.writeFileSync(filePath, skill.content.trim() + '\n', 'utf-8');
    installed.push(skill.filename);
  }

  for (const agentSkill of AGENT_SKILLS) {
    const filePath = path.join(paths.skillsDir, agentSkill.filepath);
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, agentSkill.content.trim() + '\n', 'utf-8');
    installed.push(agentSkill.filepath);
  }

  logEvent('skills.installed', projectRoot, undefined, {
    files: installed,
    force: true,
  });

  return installed;
}
