// `agent-pipx upgrade` — compare the installed version to npm registry and optionally install.
// Opt-in network + process spawn (npm only). check/report stay offline.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = 'agent-pipx';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.dirname(HERE);

export function currentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));
  return pkg.version;
}

/** Semver-ish compare: a < b → -1, a = b → 0, a > b → 1. Enough for npm publish tags. */
export function cmpVersion(a, b) {
  const pa = String(a).replace(/^v/, '').split(/[.+-]/).map((x) => parseInt(x, 10) || 0);
  const pb = String(b).replace(/^v/, '').split(/[.+-]/).map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

/**
 * Ask the npm registry for the latest published version.
 * @param {{ run?: typeof spawnSync }} deps  injectable for tests
 */
export function fetchLatestVersion(deps = {}) {
  const run = deps.run || spawnSync;
  const r = run('npm', ['view', PKG, 'version'], {
    encoding: 'utf8',
    timeout: 30_000,
    env: process.env,
  });
  if (r.error) throw new Error(`npm view failed: ${r.error.message}`);
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim() || `exit ${r.status}`;
    throw new Error(`npm view ${PKG} version failed: ${err}`);
  }
  const v = String(r.stdout || '').trim();
  if (!/^\d+\.\d+\.\d+/.test(v)) throw new Error(`unexpected version from npm: ${v}`);
  return v;
}

/**
 * @param {{ apply?: boolean, run?: typeof spawnSync, fetchLatest?: Function, log?: Function }} opts
 * @returns {number} exit code
 */
export function doUpgrade({ apply = false, run = spawnSync, fetchLatest = fetchLatestVersion, log = console.log } = {}) {
  const current = currentVersion();
  log(`agent-pipx ${current}`);

  let latest;
  try {
    latest = fetchLatest({ run });
  } catch (err) {
    log(`Could not reach npm registry: ${err.message}`);
    log('Try again when online, or: npm install -g agent-pipx@latest');
    return 1;
  }

  log(`latest on npm: ${latest}`);
  const cmp = cmpVersion(current, latest);

  if (cmp >= 0) {
    log(cmp === 0 ? 'Already up to date.' : `Local build (${current}) is newer than npm (${latest}).`);
    return 0;
  }

  const cmd = `npm install -g ${PKG}@${latest}`;
  if (!apply) {
    log(`Update available: ${current} → ${latest}`);
    log(`Dry run. Re-run with --yes to apply:`);
    log(`  ${cmd}`);
    log(`Or one-shot: npx ${PKG}@latest`);
    return 0;
  }

  log(`Installing ${PKG}@${latest} …`);
  const r = run('npm', ['install', '-g', `${PKG}@${latest}`], {
    encoding: 'utf8',
    timeout: 120_000,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (r.stdout) log(String(r.stdout).trimEnd());
  if (r.stderr) log(String(r.stderr).trimEnd());
  if (r.error) {
    log(`Upgrade failed: ${r.error.message}`);
    return 2;
  }
  if (r.status !== 0) {
    log(`Upgrade failed (exit ${r.status}). You can still run: ${cmd}`);
    return 2;
  }
  log(`Upgraded to ${latest}. Verify with: agent-pipx --version`);
  return 0;
}
