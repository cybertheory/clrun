import * as fs from 'fs';
import * as path from 'path';
import { getClrunPaths, ensureClrunDirs } from '../utils/paths';
import { logEvent } from '../ledger/ledger';
import { CLRUN_SKILL, CLAUDE_CODE_SKILL, OPENCLAW_SKILL } from './templates';

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
 * Install all skill files into .clrun/skills/.
 * Only writes files that don't already exist (idempotent).
 */
export function installSkills(projectRoot: string): string[] {
  ensureClrunDirs(projectRoot);
  const paths = getClrunPaths(projectRoot);
  const installed: string[] = [];

  for (const skill of SKILLS) {
    const filePath = path.join(paths.skillsDir, skill.filename);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, skill.content.trim() + '\n', 'utf-8');
      installed.push(skill.filename);
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

  return SKILLS.every((skill) =>
    fs.existsSync(path.join(paths.skillsDir, skill.filename))
  );
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

  logEvent('skills.installed', projectRoot, undefined, {
    files: installed,
    force: true,
  });

  return installed;
}
