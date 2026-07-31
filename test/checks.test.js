// End-to-end checks over synthetic repos built in a temp dir. No fixtures committed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runChecks } from '../src/cli.js';
import { FAIL, WARN } from '../src/findings.js';

function mkrepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-test-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    if (content === '@symlink:AGENTS.md') fs.symlinkSync(path.join(dir, 'AGENTS.md'), full);
    else fs.writeFileSync(full, content);
  }
  return dir;
}

const AGENTS = '# Test project\n\nReal rules here that are clearly long enough to pass the emptiness check.\n';
const has = (f, sev, re) => f.items.some((x) => x.severity === sev && re.test(x.message));

test('clean repo: AGENTS.md + CLAUDE.md=@AGENTS.md → no failures', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS, 'CLAUDE.md': '@AGENTS.md\n' });
  const f = runChecks(repo);
  assert.equal(f.count(FAIL), 0, JSON.stringify(f.items, null, 2));
  assert.ok(has(f, 'pass', /imports AGENTS\.md/), 'CLAUDE.md recognized as bridged');
});

test('symlinked bridge: CLAUDE.md -> AGENTS.md → recognized as no-duplication', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS, 'CLAUDE.md': '@symlink:AGENTS.md' });
  const f = runChecks(repo);
  assert.ok(has(f, 'pass', /symlink to AGENTS\.md/), 'symlink bridge recognized');
  assert.equal(f.count(FAIL), 0);
});

test('drift: CLAUDE.md with its own rules (no import) → Config warning', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS, 'CLAUDE.md': '# Claude\n\nSeparate duplicated rules.\n' });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /may be duplicated and drift/), 'drift warned');
});

test('missing SSOT: adapters present but no AGENTS.md → Rules failure', () => {
  const repo = mkrepo({ 'CLAUDE.md': '# Claude\n\nrules\n' });
  const f = runChecks(repo);
  assert.ok(has(f, FAIL, /no single source of truth/), 'SSOT-missing failure');
});

test('gemini tilde import: @~/… → Config failure (unresolvable)', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS, 'GEMINI.md': '@~/somewhere/AGENTS.md\n' });
  const f = runChecks(repo);
  assert.ok(has(f, FAIL, /cannot resolve.*~ expansion|~ expansion/), 'tilde import failure');
});

test('template placeholders in AGENTS.md → Rules failure', () => {
  const repo = mkrepo({ 'AGENTS.md': '# {{PROJECT_NAME}}\n\nstub content long enough to exist here.\n' });
  const f = runChecks(repo);
  assert.ok(has(f, FAIL, /PLACEHOLDER/), 'placeholder failure');
});

test('cursor: plain .md in .cursor/rules → warned as ignored', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS, '.cursor/rules/foo.md': '# not a real rule\n' });
  const f = runChecks(repo);
  assert.ok(has(f, WARN, /Cursor ignores it/), 'plain md warned');
});
