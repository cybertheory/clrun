"""Install skill files into .clrun/skills/ and global agent directories."""

from __future__ import annotations

import os
from pathlib import Path
from typing import List

from clrun.utils.paths import get_clrun_paths, ensure_clrun_dirs
from clrun.ledger.ledger import log_event
from clrun.skills.templates import (
    CLRUN_SKILL,
    CLAUDE_CODE_SKILL,
    OPENCLAW_SKILL,
    AGENT_SKILL_MD,
    AGENT_SKILL_TUI_PATTERNS,
)

# ─── Flat skill files ────────────────────────────────────────────────────────

SKILLS = [
    {"filename": "clrun-skill.md", "content": CLRUN_SKILL},
    {"filename": "claude-code-skill.md", "content": CLAUDE_CODE_SKILL},
    {"filename": "openclaw-skill.md", "content": OPENCLAW_SKILL},
]

AGENT_SKILLS = [
    {"filepath": "clrun/SKILL.md", "content": AGENT_SKILL_MD},
    {"filepath": "clrun/references/tui-patterns.md", "content": AGENT_SKILL_TUI_PATTERNS},
]

# ─── Cursor rule content ─────────────────────────────────────────────────────

CURSOR_RULE = r"""---
description: Always use clrun for terminal command execution instead of running commands directly
alwaysApply: true
---

# Use clrun for All Terminal Commands

When executing terminal commands, **always use `clrun`** instead of running commands directly in the shell. This gives persistent, observable, interactive sessions.

## How to Run Commands

```bash
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
```

## Rules

1. **Never run shell commands directly** — always wrap them with `clrun`
2. **Store the `terminal_id`** from every `clrun` response
3. **Use `clrun key`** for TUI prompts with select lists or checkboxes
4. **Use `clrun <id> "text"`** for text input prompts
5. **Use `clrun key <id> enter`** to accept defaults in TUI prompts
6. **Single-quote `$` variables** — `clrun <id> 'echo $VAR'`
7. **Read the `hints`** in every response — they tell you exactly what to do next
8. **Parse YAML** — all clrun responses are structured YAML

## Prompt Types

| You see | Action |
|---------|--------|
| `◆ Name: │ default` | `clrun <id> "value"` or `clrun key <id> enter` |
| `● Option1 ○ Option2` | `clrun key <id> down... enter` |
| `◻ Check1 ◻ Check2` | `clrun key <id> space down space enter` |
| `● Yes / ○ No` | `clrun key <id> enter` or `clrun key <id> right enter` |
| `(y/n)` | `clrun <id> "y"` or `clrun <id> "n"` |
"""

# ─── Cline rule content ──────────────────────────────────────────────────────

CLINE_RULE = r"""# clrun — Use for All Terminal Commands

Always use `clrun` instead of running commands directly. This gives persistent, observable, interactive terminal sessions with structured YAML responses.

## Commands

| Action | Command |
|--------|---------|
| Run a command | `clrun <command>` |
| Send text + Enter | `clrun <id> "text"` |
| Send keystrokes | `clrun key <id> down enter` |
| Toggle checkbox | `clrun key <id> space` |
| Accept default | `clrun key <id> enter` |
| View output | `clrun tail <id>` |
| Check sessions | `clrun status` |
| Kill session | `clrun kill <id>` |
| Interrupt | `clrun key <id> ctrl-c` |

## Rules

1. Never run shell commands directly — always use `clrun`
2. Store the `terminal_id` from every response
3. Use `clrun key` for TUI prompts (select lists, checkboxes, confirms)
4. Use `clrun <id> "text"` for text input prompts
5. Accept defaults with `clrun key <id> enter`
6. Single-quote `$` variables: `clrun <id> 'echo $VAR'`
7. Read the `hints` in every response
8. Parse YAML — all responses are structured YAML
"""


# ─── Global agent targets ────────────────────────────────────────────────────

def _get_global_targets() -> list:
    home = str(Path.home())
    return [
        {
            "name": "Claude Code",
            "detect": os.path.join(home, ".claude"),
            "filepath": os.path.join(home, ".claude", "skills", "clrun", "SKILL.md"),
            "content": AGENT_SKILL_MD,
            "mkdir_path": os.path.join(home, ".claude", "skills", "clrun"),
        },
        {
            "name": "Cursor",
            "detect": os.path.join(home, ".cursor"),
            "filepath": os.path.join(home, ".cursor", "rules", "use-clrun.mdc"),
            "content": CURSOR_RULE,
            "mkdir_path": os.path.join(home, ".cursor", "rules"),
        },
        {
            "name": "Cline",
            "detect": os.path.join(home, "Documents", "Cline"),
            "filepath": os.path.join(home, "Documents", "Cline", "Rules", "clrun.md"),
            "content": CLINE_RULE,
            "mkdir_path": os.path.join(home, "Documents", "Cline", "Rules"),
        },
    ]


def _install_global_skills(project_root: str) -> List[str]:
    """Install skills into global agent directories. Silent failure."""
    installed: List[str] = []
    for target in _get_global_targets():
        try:
            if not os.path.exists(target["detect"]):
                continue
            if os.path.exists(target["filepath"]):
                continue
            if target.get("mkdir_path"):
                os.makedirs(target["mkdir_path"], exist_ok=True)
            with open(target["filepath"], "w", encoding="utf-8") as f:
                f.write(target["content"].strip() + "\n")
            installed.append(f"{target['name']}: {target['filepath']}")
        except Exception:
            pass

    if installed:
        log_event("skills.global_installed", project_root, data={"agents": installed})
    return installed


# ─── Public API ──────────────────────────────────────────────────────────────

def install_skills(project_root: str) -> List[str]:
    """Install all skills into .clrun/skills/ and global agent directories."""
    ensure_clrun_dirs(project_root)
    paths = get_clrun_paths(project_root)
    installed: List[str] = []

    for skill in SKILLS:
        fp = os.path.join(paths.skills_dir, skill["filename"])
        if not os.path.exists(fp):
            with open(fp, "w", encoding="utf-8") as f:
                f.write(skill["content"].strip() + "\n")
            installed.append(skill["filename"])

    for agent_skill in AGENT_SKILLS:
        fp = os.path.join(paths.skills_dir, agent_skill["filepath"])
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        if not os.path.exists(fp):
            with open(fp, "w", encoding="utf-8") as f:
                f.write(agent_skill["content"].strip() + "\n")
            installed.append(agent_skill["filepath"])

    global_installed = _install_global_skills(project_root)
    installed.extend(global_installed)

    if installed:
        log_event("skills.installed", project_root, data={"files": installed})

    return installed


def skills_installed(project_root: str) -> bool:
    paths = get_clrun_paths(project_root)
    flat_ok = all(
        os.path.exists(os.path.join(paths.skills_dir, s["filename"])) for s in SKILLS
    )
    agent_ok = all(
        os.path.exists(os.path.join(paths.skills_dir, s["filepath"])) for s in AGENT_SKILLS
    )
    return flat_ok and agent_ok


def reinstall_skills(project_root: str) -> List[str]:
    ensure_clrun_dirs(project_root)
    paths = get_clrun_paths(project_root)
    installed: List[str] = []

    for skill in SKILLS:
        fp = os.path.join(paths.skills_dir, skill["filename"])
        with open(fp, "w", encoding="utf-8") as f:
            f.write(skill["content"].strip() + "\n")
        installed.append(skill["filename"])

    for agent_skill in AGENT_SKILLS:
        fp = os.path.join(paths.skills_dir, agent_skill["filepath"])
        os.makedirs(os.path.dirname(fp), exist_ok=True)
        with open(fp, "w", encoding="utf-8") as f:
            f.write(agent_skill["content"].strip() + "\n")
        installed.append(agent_skill["filepath"])

    log_event("skills.installed", project_root, data={"files": installed, "force": True})
    return installed
