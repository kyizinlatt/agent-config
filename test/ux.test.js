// Progress callbacks, remediations, and upgrade (mocked — no real network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runChecks, run } from '../src/cli.js';
import { renderHuman, renderReport, selectJudgementItems } from '../src/report.js';
import { tipForFinding, remediationsFor } from '../src/remediate.js';
import { cmpVersion, currentVersion, doUpgrade } from '../src/upgrade.js';
import { WARN, FAIL, PASS } from '../src/findings.js';
import { Findings } from '../src/findings.js';

function mkrepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-ux-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

const AGENTS = '# rules\n\nreal content long enough to pass the emptiness check here.\n';

test('runChecks invokes progress start/done for every category', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS });
  const events = [];
  runChecks(repo, {
    onProgress: {
      begin: (r) => events.push(['begin', r]),
      start: (name) => events.push(['start', name]),
      done: (name) => events.push(['done', name]),
      end: () => events.push(['end']),
    },
  });
  assert.equal(events[0][0], 'begin');
  const starts = events.filter((e) => e[0] === 'start').map((e) => e[1]);
  const dones = events.filter((e) => e[0] === 'done').map((e) => e[1]);
  assert.deepEqual(starts, ['Secrets', 'Config', 'Rules', 'Styles', 'Environment']);
  assert.deepEqual(dones, starts);
  assert.equal(events.at(-1)[0], 'end');
});

test('human output includes Checked summary', () => {
  const repo = mkrepo({ 'AGENTS.md': AGENTS });
  const out = renderHuman(runChecks(repo), repo);
  assert.match(out, /Checked: Secrets/);
  assert.match(out, /Environment/);
});

test('report includes Fix cards for warnings', () => {
  const repo = mkrepo({
    'AGENTS.md': AGENTS,
    'package.json': '{"name":"x","dependencies":{"left-pad":"1.0.0"}}\n',
  });
  const out = renderReport(runChecks(repo), repo);
  assert.match(out, /\bFix\b/);
  assert.match(out, /Status/);
  assert.match(out, /Judgement/);
  assert.match(out, /Agent prompt/);
  assert.match(out, /no lockfile|Commit the lockfile/i);
  assert.match(out, /Checked: Secrets/);
  // Issue-aware: Environment lockfile → Tool fit + quality; prompt lists the open issue.
  assert.match(out, /Tool fit/);
  assert.match(out, /AGENTS\.md quality/);
  assert.match(out, /\[WARN\].*lockfile|open issues/i);
  // Prompt body must be copy-paste clean — no │ / box corners (section rules may use ─).
  const promptSection = out.slice(out.indexOf('Agent prompt'));
  assert.doesNotMatch(promptSection, /[\u2502\u250C\u2510\u2514\u2518]/);
});

test('hybrid judgement: PASS uses nuance set; issues add matching topics', () => {
  const clean = new Findings();
  clean.add(PASS, 'Secrets', 'ok');
  const passIds = selectJudgementItems(clean).map((j) => j.id);
  assert.deepEqual(passIds, ['quality', 'drift', 'fit', 'health']);

  const envOnly = new Findings();
  envOnly.add(WARN, 'Environment', 'package.json but no lockfile — dependency versions unpinned');
  const envIds = selectJudgementItems(envOnly).map((j) => j.id);
  assert.deepEqual(envIds, ['quality', 'fit']);

  const cfg = new Findings();
  cfg.add(WARN, 'Config', '.claude/ exists but settings.json is missing');
  assert.deepEqual(
    selectJudgementItems(cfg).map((j) => j.id),
    ['quality', 'drift'],
  );

  const secret = new Findings();
  secret.add(FAIL, 'Secrets', 'possible GitHub token committed in AGENTS.md:3');
  assert.deepEqual(
    selectJudgementItems(secret).map((j) => j.id),
    ['quality', 'secrets'],
  );
});

test('remediate: known patterns get specific tips', () => {
  assert.match(
    tipForFinding({ severity: WARN, category: 'Styles', message: '21 use(s) of `any` outside tests' }),
    /Replace `any`/,
  );
  assert.match(
    tipForFinding({ severity: WARN, category: 'Config', message: 'core hook guard-secrets.sh not wired (harness baseline) — re-run install-harness.sh' }),
    /install-harness/,
  );
  assert.match(
    tipForFinding({ severity: FAIL, category: 'Secrets', message: 'possible GitHub token committed in AGENTS.md:3' }),
    /Rotate/,
  );
});

test('remediationsFor orders fails before warns', () => {
  const findings = {
    items: [
      { severity: WARN, category: 'Styles', message: '1 console.log/debug/info call(s) outside tests' },
      { severity: FAIL, category: 'Secrets', message: 'possible AWS access key id committed in x:1' },
    ],
  };
  const list = remediationsFor(findings);
  assert.equal(list[0].finding.severity, FAIL);
  assert.equal(list[1].finding.severity, WARN);
});

test('cmpVersion orders semver', () => {
  assert.equal(cmpVersion('0.3.0', '0.3.0'), 0);
  assert.equal(cmpVersion('0.3.0', '0.4.0'), -1);
  assert.equal(cmpVersion('1.0.0', '0.9.9'), 1);
});

test('upgrade dry-run does not spawn install when behind', () => {
  const calls = [];
  const log = [];
  const code = doUpgrade({
    apply: false,
    fetchLatest: () => '9.9.9',
    run: (...args) => {
      calls.push(args);
      return { status: 0, stdout: '', stderr: '' };
    },
    log: (s) => log.push(String(s)),
  });
  assert.equal(code, 0);
  assert.equal(calls.length, 0, 'dry-run must not call npm install');
  assert.ok(log.some((l) => /Update available|9\.9\.9/.test(l)));
  assert.ok(log.some((l) => /--yes/.test(l)));
});

test('upgrade --yes runs npm install -g', () => {
  const calls = [];
  const code = doUpgrade({
    apply: true,
    fetchLatest: () => '9.9.9',
    run: (cmd, args) => {
      calls.push([cmd, ...args]);
      return { status: 0, stdout: 'ok\n', stderr: '' };
    },
    log: () => {},
  });
  assert.equal(code, 0);
  assert.ok(calls.some((c) => c[0] === 'npm' && c[1] === 'install' && c.includes('-g')));
});

test('upgrade when already current exits 0', () => {
  const v = currentVersion();
  const code = doUpgrade({
    apply: true,
    fetchLatest: () => v,
    run: () => {
      throw new Error('should not install');
    },
    log: () => {},
  });
  assert.equal(code, 0);
});

test('help lists upgrade command', async () => {
  let out = '';
  const orig = console.log;
  console.log = (s) => {
    out += String(s) + '\n';
  };
  try {
    assert.equal(await run(['--help']), 0);
    assert.match(out, /upgrade/);
  } finally {
    console.log = orig;
  }
});
