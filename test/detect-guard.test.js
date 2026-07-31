// Detect helpers + harness guard-env hook — regression gates for the quality fixes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDangling, isSymlink } from '../src/detect.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUARD_ENV = path.join(ROOT, 'claude-harness/core/hooks/guard-env.sh');

function runGuard(payload) {
  const r = spawnSync('bash', [GUARD_ENV], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr || 'guard-env non-zero');
  return r.stdout || '';
}

const denied = (out) => /"permissionDecision":\s*"deny"/.test(out);

test('isSymlink / isDangling: real and dangling links', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-detect-'));
  const target = path.join(tmp, 'target');
  const link = path.join(tmp, 'link');
  const dang = path.join(tmp, 'dang');
  fs.writeFileSync(target, 'x');
  fs.symlinkSync(target, link);
  fs.symlinkSync(path.join(tmp, 'missing'), dang);

  assert.equal(isSymlink(link), true);
  assert.equal(isSymlink(target), false);
  assert.equal(isDangling(dang), true);
  assert.equal(isDangling(link), false);
});

test('guard-env: Read .env → deny', () => {
  const out = runGuard({ tool_name: 'Read', tool_input: { file_path: '.env' } });
  assert.ok(denied(out), out);
});

test('guard-env: Glob path=. pattern=.env* → deny', () => {
  const out = runGuard({ tool_name: 'Glob', tool_input: { path: '.', pattern: '.env*' } });
  assert.ok(denied(out), out || '(empty = allowed, bug)');
});

test('guard-env: Bash python open(.env) → deny', () => {
  const out = runGuard({
    tool_name: 'Bash',
    tool_input: { command: "python3 -c \"print(open('.env').read())\"" },
  });
  assert.ok(denied(out), out || '(empty = allowed, bug)');
});

test('guard-env: Bash ls src → allow', () => {
  const out = runGuard({ tool_name: 'Bash', tool_input: { command: 'ls src' } });
  assert.ok(!denied(out), out);
});
