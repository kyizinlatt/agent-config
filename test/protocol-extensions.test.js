// Protocol hygiene + skills/commands/gitignore/layering checks over synthetic repos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runChecks } from '../src/cli.js';
import { FAIL, WARN } from '../src/findings.js';
import { pathIgnoredByGitignore, parseFrontmatter } from '../src/checks/extensions.js';

function mkrepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-proto-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

const has = (f, sev, re) => f.items.some((x) => x.severity === sev && re.test(x.message));

const BASE = [
  '# Project',
  '',
  '## Commands',
  '- Test: `npm test`',
  '',
  '## Boundaries (do not touch)',
  '- generated/',
  '',
  '## Sensitive data',
  '- never commit secrets',
  '',
].join('\n');

const FULL_PROTOCOL = [
  '## Tracked findings (when this repository has audits or reviews)',
  '',
  '- Keep stable finding IDs and one current remediation ledger in the finding document. The ledger is',
  '  current status authority; treat progress or changelog files as chronological evidence, not status.',
  '- Explicit states: `OPEN`, `IN_PROGRESS`, `CODE_COMPLETE`, `PRODUCTION_PENDING`, `CLOSED`,',
  '  `BLOCKED_DECISION`, `ACCEPTED_RISK`, `SUPERSEDED`. Distinguish `CODE_COMPLETE` /',
  '  `PRODUCTION_PENDING` from `CLOSED`; close only after every applicable acceptance test and',
  '  live/external exit gate has evidence.',
  '- Check the ledger before starting; never silently redo a closed finding.',
  '- Accepted risks need an owner, decision date, compensating controls, and review/expiry date.',
  '- Optional durable plan: one live plan + one lifecycle archive; stable ID and exit gate required.',
  '',
].join('\n');

test('protocol: no tracked-findings section → no protocol-signal warning', () => {
  const repo = mkrepo({ 'AGENTS.md': BASE });
  const f = runChecks(repo);
  assert.ok(!has(f, WARN, /tracked-findings section is missing/), 'must not require protocol when absent');
});

test('protocol: incomplete tracked-findings section → warns for missing signals', () => {
  const repo = mkrepo({
    'AGENTS.md': `${BASE}\n## Tracked findings\n\n- We keep findings somewhere.\n`,
  });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /tracked-findings section is missing recommended signal/), JSON.stringify(f.items.filter((i) => /tracked|progress|ledger/i.test(i.message)), null, 2));
});

test('protocol: complete tracked-findings signals → pass', () => {
  const repo = mkrepo({ 'AGENTS.md': BASE + FULL_PROTOCOL });
  const f = runChecks(repo);
  assert.ok(has(f, 'pass', /tracked-findings protocol signals present/));
  assert.ok(!has(f, WARN, /tracked-findings section is missing/));
});

test('protocol: PROGRESS.md without protocol in AGENTS → warn', () => {
  const repo = mkrepo({
    'AGENTS.md': BASE,
    'PROGRESS.md': '# progress\n\n**Done (2026-01-01, x)**\n- Ask: a\n',
  });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /ledger-vs-progress roles/));
});

test('protocol: AGENTS claims progress log but file missing → warn', () => {
  const repo = mkrepo({
    'AGENTS.md': `${BASE}\n## Notes\n\nUpdate PROGRESS.md after each session.\n`,
  });
  const f = runChecks(repo);
  // Without tracked-findings, claimsProgress needs PROGRESS.md mention + claimsProtocol.
  // Bare PROGRESS.md mention alone should not force the "references a progress log" warn.
  assert.ok(!has(f, WARN, /references a progress log but no PROGRESS/), 'PROGRESS.md mention alone is not a protocol claim');
});

test('protocol: tracked findings + PROGRESS.md mention without file → warn', () => {
  const repo = mkrepo({
    'AGENTS.md': `${BASE}${FULL_PROTOCOL}\nKeep PROGRESS.md up to date.\n`,
  });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /references a progress log but no PROGRESS/));
});

test('protocol: long PROGRESS without archive hint → warn', () => {
  const body = Array.from({ length: 260 }, (_, i) => `line ${i}`).join('\n');
  const repo = mkrepo({
    'AGENTS.md': BASE + FULL_PROTOCOL,
    'PROGRESS.md': `# progress\n\n${body}\n`,
  });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /archive\/rotation note/));
});

test('protocol: plan file missing ID/exit gate → warn', () => {
  const repo = mkrepo({
    'AGENTS.md': BASE + FULL_PROTOCOL,
    '.claude/plans/PLAN.md': '# Plan\n\n## Do the thing\n\nLots of prose about shipping something important here.\n',
  });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /missing .+ on tracked sections|stable ID|exit gate/));
});

test('skills: directory without SKILL.md → fail', () => {
  const repo = mkrepo({ 'AGENTS.md': BASE });
  fs.mkdirSync(path.join(repo, '.claude/skills/demo'), { recursive: true });
  const f = runChecks(repo);
  assert.ok(has(f, FAIL, /skill directory missing SKILL\.md/), JSON.stringify(f.items.filter((i) => i.category === 'Config'), null, 2));
});

test('skills: SKILL.md with description → pass', () => {
  const repo = mkrepo({
    'AGENTS.md': BASE,
    '.claude/skills/demo/SKILL.md': '---\nname: demo\ndescription: Use when demoing the checker.\n---\n# Demo\n',
  });
  const f = runChecks(repo);
  assert.ok(has(f, 'pass', /skill ok: \.claude\/skills\/demo/));
  assert.equal(f.count(FAIL), 0);
});

test('skills: name mismatch → warn', () => {
  const repo = mkrepo({
    'AGENTS.md': BASE,
    '.claude/skills/demo/SKILL.md': '---\nname: other\ndescription: Something useful here.\n---\n# X\n',
  });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /does not match directory/));
});

test('commands: missing frontmatter → warn', () => {
  const repo = mkrepo({
    'AGENTS.md': BASE,
    '.claude/commands/ship.md': '# Ship\n\nDo the ship.\n',
  });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /no YAML frontmatter/));
});

test('commands: long body → thin-entry warn', () => {
  const body = Array.from({ length: 50 }, (_, i) => `Step ${i}: do a thing carefully.`).join('\n');
  const repo = mkrepo({
    'AGENTS.md': BASE,
    '.claude/commands/ship.md': `---\ndescription: Ship it\n---\n\n${body}\n`,
  });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /thin entry points/));
});

test('gitignore: settings.local.json not ignored when .claude exists → warn', () => {
  const repo = mkrepo({
    'AGENTS.md': BASE,
    '.claude/settings.json': '{}\n',
    '.gitignore': 'node_modules/\n',
  });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /settings\.local\.json is not covered/));
});

test('gitignore: settings.local.json ignored → pass', () => {
  const repo = mkrepo({
    'AGENTS.md': BASE,
    '.claude/settings.json': '{}\n',
    '.gitignore': 'node_modules/\nsettings.local.json\n',
  });
  const f = runChecks(repo);
  assert.ok(has(f, 'pass', /settings\.local\.json is gitignored/));
  assert.ok(!has(f, WARN, /settings\.local\.json is not covered/));
});

test('layering: long AGENTS + skills → soft warn', () => {
  const long = `${BASE}\n${'x\n'.repeat(210)}`;
  const repo = mkrepo({
    'AGENTS.md': long,
    '.claude/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill for layering check.\n---\n# Demo\n',
  });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /move on-demand workflows into skills/));
});

test('parseFrontmatter: extracts keys', () => {
  const fm = parseFrontmatter('---\nname: a\ndescription: b c\n---\n# Body\n');
  assert.equal(fm.name, 'a');
  assert.equal(fm.description, 'b c');
});

test('pathIgnoredByGitignore: matches settings.local.json', () => {
  const repo = mkrepo({ '.gitignore': 'settings.local.json\n' });
  assert.equal(pathIgnoredByGitignore(repo, '.claude/settings.local.json'), true);
  const repo2 = mkrepo({ '.gitignore': 'node_modules/\n' });
  assert.equal(pathIgnoredByGitignore(repo2, '.claude/settings.local.json'), false);
});
