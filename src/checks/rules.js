// RULES checks: the AGENTS.md single source of truth exists, is real (not template stubs), and
// is not missing while tool adapters expect it.
import path from 'node:path';
import { detectAdapters, isFile, readText } from '../detect.js';
import { agentsMdPath } from '../ssot.js';

const PLACEHOLDER = /\{\{[A-Z_]+\}\}/; // {{PROJECT_NAME}} etc. left from scaffolding
const STUB = /\[(…|\.\.\.|one-line description|Framework \+ language|Domain rule)/;

export function checkRules(repo, findings) {
  const agents = agentsMdPath(repo);
  const adapters = detectAdapters(repo);

  if (!agents) {
    if (adapters.length > 0) {
      findings.fail('Rules', 'tool adapters are present but there is no AGENTS.md — no single source of truth');
    } else {
      findings.warn('Rules', 'no AGENTS.md — project rules are undocumented');
    }
    return;
  }

  findings.pass('Rules', 'AGENTS.md present (single source of truth)', 'AGENTS.md');
  const content = readText(agents);

  if (PLACEHOLDER.test(content)) {
    const lines = lineNumbers(content, PLACEHOLDER);
    findings.fail('Rules', `AGENTS.md still has {{PLACEHOLDER}} markers on line(s) ${lines}`, 'AGENTS.md');
  }
  if (STUB.test(content)) {
    const lines = lineNumbers(content, STUB);
    findings.warn('Rules', `AGENTS.md has unfilled template stubs ([…]) on line(s) ${lines}`, 'AGENTS.md');
  }
  if (content.trim().length < 80) {
    findings.warn('Rules', 'AGENTS.md is nearly empty — add real project rules', 'AGENTS.md');
  }

  checkQuality(content, findings);
  checkCompleteness(content, findings);
}

// Does AGENTS.md document the essentials an agent needs? One compact advisory line, low
// false-positive: only flags a section as missing when no reasonable signal for it appears.
function checkCompleteness(content, findings) {
  const missing = [];
  const hasCommands =
    /^#{1,6}\s+.*command/im.test(content) ||
    /\b(npm run|pnpm |yarn |make |cargo |go test|pytest|swift (build|test)|xcodebuild|npx )/i.test(content);
  const hasBoundaries =
    /do[\s-]?not[\s-]?touch|out[\s-]?of[\s-]?scope|boundar|must not|never (edit|modify|touch|change)/i.test(content);
  const hasSensitive = /secret|credential|sensitive|\.env|do[\s-]?not[\s-]?commit|token/i.test(content);
  if (!hasCommands) missing.push('Commands (test/lint/build)');
  if (!hasBoundaries) missing.push('boundaries/do-not-touch');
  if (!hasSensitive) missing.push('sensitive-data note');
  if (missing.length) {
    findings.warn('Rules', `AGENTS.md is missing recommended section(s): ${missing.join('; ')}`, 'AGENTS.md');
  }
}

// Quality-of-content checks on AGENTS.md: length and structure.
function checkQuality(content, findings) {
  const lines = content.split('\n');

  // Claude Code's docs recommend keeping instruction files under ~200 lines — longer files
  // consume more context and reduce how reliably the agent follows them.
  if (lines.length > 200) {
    findings.warn(
      'Rules',
      `AGENTS.md is ${lines.length} lines — agent adherence drops past ~200; split into scoped rule files`,
      'AGENTS.md',
    );
  }

  // Empty sections: a leaf heading with no body before the next heading (or EOF) is dead weight.
  // A heading that merely contains sub-headings is a container, not empty; blockquotes count as body.
  const empties = [];
  const headings = [];
  lines.forEach((line, i) => {
    const m = line.match(/^(#{1,6})\s+(\S.*)$/);
    if (m) headings.push({ i, level: m[1].length, title: m[2].trim() });
  });
  headings.forEach((h, idx) => {
    const next = headings[idx + 1];
    const end = next ? next.i : lines.length;
    const hasBody = lines.slice(h.i + 1, end).some((l) => l.trim().length > 0);
    const hasChild = next && next.level > h.level;
    if (!hasBody && !hasChild) empties.push(`"${h.title}" (line ${h.i + 1})`);
  });
  if (empties.length) {
    findings.warn('Rules', `AGENTS.md has empty section(s): ${empties.join(', ')} — fill or remove`, 'AGENTS.md');
  }
}

function lineNumbers(content, re) {
  const g = new RegExp(re.source, 'g');
  const nums = [];
  content.split('\n').forEach((line, i) => {
    if (g.test(line)) nums.push(i + 1);
    g.lastIndex = 0;
  });
  return nums.join(',');
}
