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
