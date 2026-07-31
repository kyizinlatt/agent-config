// Tests for secret scanning, --strict, SARIF output, expanded tool coverage, and `fix`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runChecks, run } from '../src/cli.js';
import { renderSarif } from '../src/report.js';
import { doFix } from '../src/fix.js';
import { FAIL } from '../src/findings.js';

function mkrepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-feat-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}
const AGENTS = '# rules\n\nreal content long enough to pass the emptiness check here.\n';
const has = (f, sev, re) => f.items.some((x) => x.severity === sev && re.test(x.message));

test('secret scanning: a token committed in AGENTS.md → Secrets failure', () => {
  // Fake, pattern-shaped token — not a real credential.
  const fake = 'ghp_' + 'A'.repeat(36);
  const repo = mkrepo({ 'AGENTS.md': `${AGENTS}\ntoken: ${fake}\n` });
  const f = runChecks(repo);
  assert.ok(has(f, FAIL, /GitHub token committed/), JSON.stringify(f.items, null, 2));
});

test('secret scanning: clean config → Secrets pass, no false positive', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS });
  const f = runChecks(repo);
  assert.ok(has(f, 'pass', /no credentials found/));
  assert.equal(f.count(FAIL), 0);
});

test('--strict: a warning becomes a failure (exit 2)', async () => {
  // package.json without a lockfile → an Environment warning.
  const repo = mkrepo({ 'AGENTS.md': AGENTS, 'package.json': '{"name":"x"}\n' });
  const normal = await run(['check', '--path', repo]);
  const strict = await run(['check', '--strict', '--path', repo]);
  assert.equal(normal, 1, 'warnings → exit 1 normally');
  assert.equal(strict, 2, 'warnings → exit 2 under --strict');
});

test('SARIF: valid 2.1.0 shape, passes omitted, warn/fail mapped', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS, 'package.json': '{"name":"x"}\n' });
  const f = runChecks(repo);
  const sarif = JSON.parse(renderSarif(f, repo));
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].tool.driver.name, 'agent-config');
  assert.ok(sarif.runs[0].results.every((r) => ['error', 'warning'].includes(r.level)), 'only error/warning levels');
});

test('expanded coverage: Windsurf/Aider/Zed recognized as native readers', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS, '.windsurfrules': 'x\n' });
  const f = runChecks(repo);
  assert.ok(has(f, 'pass', /read natively by:.*Windsurf/), 'windsurf listed among native readers');
});

test('fix: dry-run does not modify; --yes rewrites @~/ and backs up', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS, 'GEMINI.md': '@~/somewhere/AGENTS.md\n' });
  const gem = path.join(repo, 'GEMINI.md');

  doFix(repo, { apply: false });
  assert.equal(fs.readFileSync(gem, 'utf8'), '@~/somewhere/AGENTS.md\n', 'dry-run must not modify');
  assert.ok(!fs.existsSync(gem + '.bak'), 'dry-run must not create a backup');

  doFix(repo, { apply: true });
  assert.equal(fs.readFileSync(gem, 'utf8'), '@./AGENTS.md\n', 'apply rewrites the import');
  assert.equal(fs.readFileSync(gem + '.bak', 'utf8'), '@~/somewhere/AGENTS.md\n', 'original backed up');

  const f = runChecks(repo);
  assert.equal(f.count(FAIL), 0, 'no failures after fix');
});
