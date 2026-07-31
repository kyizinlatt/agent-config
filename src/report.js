// Output renderers: human (default), JSON (--json), SARIF, and a CLI report that pairs
// deterministic findings with remediations + a judgement prompt for the project's agent.
import { CATEGORIES, FAIL, PASS, WARN } from './findings.js';
import { renderCheckedSummary } from './progress.js';
import { remediationsFor } from './remediate.js';

const useColor = () => process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code, s) => (useColor() ? `\x1b[${code}m${s}\x1b[0m` : s);

// Unicode via escapes so the source stays ASCII-safe across editors/tools.
const CHECK = '\u2713';
const WARN_MARK = '\u26A0';
const CROSS = '\u2717';
const BAR = '\u2500';
const BULLET = '\u2022';
const EM = '\u2014';
const ARROW = '\u2192'; // ?

const MARK = { [PASS]: () => c('32', CHECK), [WARN]: () => c('33', WARN_MARK), [FAIL]: () => c('31', CROSS) };
const ORDER = { [FAIL]: 0, [WARN]: 1, [PASS]: 2 };

function rule(label, width = 56) {
  const title = ` ${label} `;
  const fill = Math.max(0, width - title.length - 1);
  return c('2', `${BAR}${BAR}${title}${BAR.repeat(fill)}`);
}

function renderFindingLines(findings) {
  const lines = [];
  for (const cat of CATEGORIES) {
    const items = findings.items
      .filter((f) => f.category === cat)
      .sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
    for (const f of items) {
      const msg = f.severity === PASS ? c('2', f.message) : f.message;
      const file = f.file ? c('2', `  ${f.file}`) : '';
      lines.push(`  ${MARK[f.severity]()} ${cat.padEnd(11)} ${msg}${file}`);
    }
  }
  return lines;
}

function renderSummary(findings) {
  const s = findings.summary();
  return `  ${c('32', s.pass + ' passed')}   ${c('33', s.warn + ' warning(s)')}   ${c('31', s.fail + ' failure(s)')}`;
}

function renderRemediationLines(findings) {
  const items = remediationsFor(findings);
  if (!items.length) return [];
  const lines = ['', rule('How to fix'), ''];
  for (const { finding: f, tip } of items) {
    lines.push(`  ${MARK[f.severity]()} ${f.category}: ${f.message}`);
    if (f.file) lines.push(`      ${c('2', f.file)}`);
    lines.push(`      ${c('36', ARROW)} ${tip}`);
    lines.push('');
  }
  return lines;
}

export function renderHuman(findings, repo) {
  const lines = [];
  lines.push('');
  lines.push(`agent-pipx conformance ${EM} ${repo}`);
  lines.push(renderCheckedSummary());
  lines.push('');
  lines.push(...renderFindingLines(findings));
  lines.push('');
  lines.push(renderSummary(findings));
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

// SARIF 2.1.0 for GitHub code scanning. Passes are omitted; warn->warning, fail->error.
const SARIF_LEVEL = { [FAIL]: 'error', [WARN]: 'warning' };
export function renderSarif(findings, repo) {
  const results = findings.items
    .filter((f) => f.severity !== PASS)
    .map((f) => ({
      ruleId: `agent-pipx/${f.category.toLowerCase()}`,
      level: SARIF_LEVEL[f.severity],
      message: { text: f.message },
      locations: f.file
        ? [{ physicalLocation: { artifactLocation: { uri: f.file } } }]
        : [],
    }));
  return JSON.stringify(
    {
      version: '2.1.0',
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      runs: [
        {
          tool: { driver: { name: 'agent-pipx', informationUri: 'https://github.com/kyizinlatt/agent-pipx' } },
          results,
        },
      ],
    },
    null,
    2,
  );
}

const JUDGEMENT_BULLETS = [
  'Does `AGENTS.md` contain real, specific project rules ' + EM + ' or generic filler?',
  'Do any per-tool adapters (CLAUDE.md, GEMINI.md, .cursor/rules, .agents/rules) duplicate or contradict `AGENTS.md` instead of bridging to it?',
  'Do the configured tools match the stack and how this project is actually built?',
  'Are there rules that are unenforceable, outdated, or in conflict with each other?',
];

const JUDGEMENT_PROMPT = [
  "You are auditing this repository's AI-agent configuration. The deterministic findings above",
  'cover what is mechanically verifiable. Now make the judgement calls a linter cannot:',
  '',
  ...JUDGEMENT_BULLETS.map((b) => `- ${b}`),
  '',
  'Read `AGENTS.md` and each adapter, then report findings grouped under Config / Rules / Styles /',
  'Environment ' + EM + ' each with file:line, what is wrong, why it matters, and the fix ' + EM + ' then a one-line',
  'verdict. Do not edit anything unless asked.',
].join('\n');

// Agent-facing CLI report: findings + how-to-fix + judgement (no JSON dump).
// Machine-readable output stays on `check --json` / `check --sarif`.
export function renderReport(findings, repo) {
  const s = findings.summary();
  const action =
    s.fail > 0
      ? c('31', 'Fix failures first (see How to fix), then re-run report for judgement.')
      : s.warn > 0
        ? c('33', 'Warnings need attention ' + EM + ' see How to fix, then judgement prompt.')
        : c('32', 'Mechanical checks clean ' + EM + ' still run the judgement prompt for nuance.');

  const lines = [];
  lines.push('');
  lines.push(c('1', 'agent-pipx report'));
  lines.push(c('2', repo));
  lines.push(renderCheckedSummary());
  lines.push('');
  lines.push(rule('Findings'));
  lines.push('');
  lines.push(...renderFindingLines(findings));
  lines.push('');
  lines.push(renderSummary(findings));
  lines.push(`  ${action}`);
  lines.push(...renderRemediationLines(findings));
  lines.push(rule('Needs judgement'));
  lines.push('');
  lines.push(c('2', '  Mechanical checks cannot decide these ' + EM + ' paste into your coding agent:'));
  lines.push('');
  for (const b of JUDGEMENT_BULLETS) {
    lines.push(`  ${c('33', BULLET)} ${b}`);
  }
  lines.push('');
  lines.push(rule('Copy-paste prompt'));
  lines.push('');
  for (const row of JUDGEMENT_PROMPT.split('\n')) {
    lines.push(row ? `  ${row}` : '');
  }
  lines.push('');
  return lines.join('\n');
}
