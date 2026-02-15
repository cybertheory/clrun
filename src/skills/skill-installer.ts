import * as fs from 'fs';
import * as path from 'path';
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

/**
 * Install all skill files into .clrun/skills/.
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
