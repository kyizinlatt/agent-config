// Single-source-of-truth logic: resolve AGENTS.md and verify every per-tool adapter present in
// the repo bridges back to it (symlink or @import) rather than duplicating rules or drifting.
import path from 'node:path';
import { SSOT } from '../adapters/tools.js';
import { exists, isFile, isDir, readText, sameFile, walk } from './detect.js';

export function agentsMdPath(repo) {
  const p = path.join(repo, SSOT);
  return isFile(p) || exists(p) ? p : null;
}

// An @-import line that references AGENTS.md, e.g. `@AGENTS.md`, `@./AGENTS.md`, `@~/x/AGENTS.md`.
const IMPORTS_AGENTS = /^@\S*AGENTS\.md\s*$/m;
// A tilde import — valid in Claude, but NOT resolvable by Gemini.
const IMPORT_TILDE = /^@~\//m;

// Verify one tool's adapter files against the AGENTS.md SSOT. Emits Config findings.
export function verifyBridge(repo, entry, agents, findings) {
  const { tool, files } = entry;

  if (tool.bridge === 'native') {
    // These tools read AGENTS.md directly; checkConfig emits the SSOT summary.
    // Here we only run tool-specific validations that go beyond "SSOT present".
    if (tool.id === 'cursor') validateCursorRules(repo, findings);
    if (tool.id === 'copilot' && !agents && files.includes('.github/copilot-instructions.md')) {
      findings.warn(
        'Config',
        `${tool.name} has .github/copilot-instructions.md but no AGENTS.md SSOT — rules live only in the Copilot file`,
        '.github/copilot-instructions.md',
      );
    }
    return;
  }

  // bridge === 'import-or-symlink' — Claude (CLAUDE.md) and Gemini (GEMINI.md).
  for (const rel of files) {
    const abs = path.join(repo, rel);
    if (!isFile(abs) && !exists(abs)) continue;
    if (isDir(abs)) continue;
    const content = readText(abs);

    // Gemini's @import cannot expand ~ — this import silently fails to load.
    if (tool.importSupportsTilde === false && IMPORT_TILDE.test(content)) {
      findings.fail(
        'Config',
        `${rel} uses an @~/… import, which ${tool.name} cannot resolve (no ~ expansion) — rules never load; use a relative/absolute path or a symlink`,
        rel,
      );
      continue;
    }

    if (!agents) {
      // No SSOT to bridge to. rules.js reports the missing-SSOT failure; note the dangling adapter.
      findings.warn(
        'Config',
        `${rel} is present but there is no AGENTS.md to bridge to`,
        rel,
      );
      continue;
    }

    if (sameFile(abs, agents)) {
      findings.pass('Config', `${rel} is a symlink to AGENTS.md — single source, no duplication`, rel);
    } else if (IMPORTS_AGENTS.test(content)) {
      findings.pass('Config', `${rel} imports AGENTS.md via @ — bridged to SSOT`, rel);
    } else {
      findings.warn(
        'Config',
        `${rel} does not @-import or symlink AGENTS.md — rules may be duplicated and drift (${tool.name})`,
        rel,
      );
    }
  }
}

// Cursor: .cursor/rules/*.mdc need YAML frontmatter; plain .md there is ignored by Cursor.
function validateCursorRules(repo, findings) {
  const dir = path.join(repo, '.cursor', 'rules');
  if (!isDir(dir)) return;
  const files = walk(dir);
  for (const f of files) {
    const rel = path.relative(repo, f);
    if (f.endsWith('.mdc')) {
      const content = readText(f);
      if (!/^---\s*$/m.test(content.split('\n').slice(0, 1).join('\n')) && !content.startsWith('---')) {
        findings.warn('Config', `${rel} is a .mdc rule with no frontmatter — add description/globs/alwaysApply`, rel);
      } else {
        findings.pass('Config', `${rel} is a valid Cursor rule`, rel);
      }
    } else if (f.endsWith('.md')) {
      findings.warn('Config', `${rel} is a plain .md in .cursor/rules — Cursor ignores it (use .mdc)`, rel);
    }
  }
}
