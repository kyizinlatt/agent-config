// AGENTS.md quality checks: size and empty sections.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runChecks } from '../src/cli.js';
import { WARN } from '../src/findings.js';

function mkrepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-qual-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}
const has = (f, sev, re) => f.items.some((x) => x.severity === sev && re.test(x.message));

test('empty section in AGENTS.md → warning naming it', () => {
  const md = [
    '# Project',
    '',
    'A real intro line long enough to clear the near-empty threshold comfortably here.',
    '',
    '## Filled',
    '',
    'Has content.',
    '',
    '## Empty',
    '',
    '## Also filled',
    '',
    'Yes.',
    '',
  ].join('\n');
  const f = runChecks(mkrepo({ 'AGENTS.md': md }));
  assert.ok(has(f, WARN, /empty section.*Empty/), JSON.stringify(f.items.filter((i) => i.category === 'Rules'), null, 2));
});

test('oversized AGENTS.md (>200 lines) → warning', () => {
  const md = '# Project\n\n' + Array.from({ length: 210 }, (_, i) => `- rule ${i}`).join('\n') + '\n';
  const f = runChecks(mkrepo({ 'AGENTS.md': md }));
  assert.ok(has(f, WARN, /lines — agent adherence drops/), 'size warning fires');
});

test('well-formed AGENTS.md → no quality warnings', () => {
  const md = '# Project\n\n## Rules\n\n- Always run tests before committing.\n- Keep the diff focused.\n';
  const f = runChecks(mkrepo({ 'AGENTS.md': md }));
  assert.ok(!has(f, WARN, /empty section|adherence drops/), 'no false-positive quality warnings');
});
