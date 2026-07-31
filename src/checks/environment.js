// ENVIRONMENT checks: which agent-tool CLIs are installed (informational), base tooling, and
// package-manager ↔ lockfile agreement.
import path from 'node:path';
import { detectInstalledClis, detectStack, hasBinary, isFile } from '../detect.js';

export function checkEnvironment(repo, findings) {
  // git is assumed by nearly everything.
  if (hasBinary('git')) findings.pass('Environment', 'git available');
  else findings.warn('Environment', 'git not on PATH');

  // ripgrep speeds scans but is optional — the tool falls back to Node's own walk.
  if (!hasBinary('rg')) findings.pass('Environment', 'ripgrep optional (using built-in scan)');

  // Which agent CLIs are installed? Informational — helps explain which adapters matter.
  const installed = detectInstalledClis();
  if (installed.length) {
    findings.pass('Environment', `agent CLIs installed: ${installed.map((i) => i.tool.name).join(', ')}`);
  }

  const { webTs, swift } = detectStack(repo);
  if (webTs) {
    if (!hasBinary('node')) findings.warn('Environment', 'package.json present but node not on PATH');
    const lockfiles = [
      ['pnpm-lock.yaml', 'pnpm'],
      ['package-lock.json', 'npm'],
      ['yarn.lock', 'yarn'],
      ['bun.lockb', 'bun'],
    ];
    const found = lockfiles.find(([f]) => isFile(path.join(repo, f)));
    if (found) {
      findings.pass('Environment', `${found[1]} lockfile present`);
      if (found[1] === 'pnpm' && !hasBinary('pnpm')) {
        findings.warn('Environment', 'pnpm-lock.yaml present but pnpm not on PATH');
      }
    } else {
      findings.warn('Environment', 'package.json but no lockfile — dependency versions unpinned');
    }
  }
  if (swift) {
    if (!hasBinary('swift') && !hasBinary('xcodebuild')) {
      findings.warn('Environment', 'Swift sources present but neither swift nor xcodebuild on PATH');
    }
  }
}
