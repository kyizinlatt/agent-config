// Output renderers: human (default), JSON (--json), and an agent-facing report that pairs the
// deterministic findings with a ready-to-run prompt for whatever agent the project uses.
import { CATEGORIES, FAIL, PASS, WARN } from './findings.js';

const useColor = () => process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColor() ? `[${code}m${s}[0m` : s);

const MARK = { [PASS]: () => c('32', '✓'), [WARN]: () => c('33', '⚠'), [FAIL]: () => c('31', '✗') };
const ORDER = { [FAIL]: 0, [WARN]: 1, [PASS]: 2 };

export function renderHuman(findings, repo) {
  const lines = [];
  lines.push('');
  lines.push(`agent-config conformance — ${repo}`);
  lines.push('');
  for (const cat of CATEGORIES) {
    const items = findings.items
      .filter((f) => f.category === cat)
      .sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
    for (const f of items) {
      const msg = f.severity === PASS ? c('2', f.message) : f.message;
      lines.push(`  ${MARK[f.severity]()} ${cat.padEnd(11)} ${msg}`);
    }
  }
  const s = findings.summary();
  lines.push('');
  lines.push(
    `  ${c('32', s.pass + ' passed')}   ${c('33', s.warn + ' warning(s)')}   ${c('31', s.fail + ' failure(s)')}`,
  );
  lines.push('');
  return lines.join('\n');
}

export function renderJson(findings, repo) {
  return JSON.stringify(
    { repo, summary: findings.summary(), findings: findings.items },
    null,
    2,
  );
}

// Agent-facing: the deterministic result plus a prompt the project's own agent can act on to do
// the judgement pass the deterministic checker deliberately does not.
export function renderReport(findings, repo) {
  const json = renderJson(findings, repo);
  return [
    '# agent-config report',
    '',
    `Repository: ${repo}`,
    '',
    '## Deterministic findings',
    '',
    '```json',
    json,
    '```',
    '',
    '## Judgement prompt (run with your agent)',
    '',
    'You are auditing this repository\'s AI-agent configuration. The deterministic findings above',
    'cover what is mechanically verifiable. Now make the judgement calls a linter cannot:',
    '',
    '- Does `AGENTS.md` contain real, specific project rules — or generic filler?',
    '- Do any per-tool adapters (CLAUDE.md, GEMINI.md, .cursor/rules, .agents/rules) duplicate or',
    '  contradict `AGENTS.md` instead of bridging to it?',
    '- Do the configured tools match the stack and how this project is actually built?',
    '- Are there rules that are unenforceable, outdated, or in conflict with each other?',
    '',
    'Read `AGENTS.md` and each adapter, then report findings grouped under Config / Rules / Styles /',
    'Environment — each with file:line, what is wrong, why it matters, and the fix — then a one-line',
    'verdict. Do not edit anything unless asked.',
    '',
  ].join('\n');
}
