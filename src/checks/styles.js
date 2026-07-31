// STYLES checks: repo-wide static scan for the antipatterns the language packs enforce, chosen by
// detected stack. Advisory (warnings) — a logger wrapper or a deliberate boundary `any` may be
// fine; the AI/report layer weighs them in context.
import path from 'node:path';
import { detectStack, readText, walk } from '../detect.js';

// Files where these patterns are legitimate.
const isTestOrDep = (f) =>
  /(^|\/)(tests?|__tests__|scripts)(\/|$)/i.test(f) ||
  /\.(test|spec)\.[jt]sx?$/.test(f) ||
  /\.d\.ts$/.test(f) ||
  /Tests\.swift$/.test(f) ||
  /(^|\/)logger\.[jt]sx?$/.test(f);

function countMatches(files, repo, re) {
  let n = 0;
  for (const f of files) {
    const rel = path.relative(repo, f);
    if (isTestOrDep(rel)) continue;
    const text = readText(f);
    const g = new RegExp(re.source, 'gm');
    const m = text.match(g);
    if (m) n += m.length;
  }
  return n;
}

export function checkStyles(repo, findings) {
  const { webTs, swift } = detectStack(repo);

  if (webTs) {
    const files = walk(repo, { exts: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx'] });
    const consoleN = countMatches(files, repo, /(^|[^.\w])console\.(log|debug|info)\(/);
    if (consoleN > 0) findings.warn('Styles', `${consoleN} console.log/debug/info call(s) outside tests`);
    else findings.pass('Styles', 'no stray console logging');

    const anyN = countMatches(files, repo, /:\s*any\b|<any>|as any\b/);
    if (anyN > 0) findings.warn('Styles', `${anyN} use(s) of \`any\` outside tests`);

    const ignoreN = countMatches(files, repo, /@ts-ignore|@ts-nocheck/);
    if (ignoreN > 0) findings.warn('Styles', `${ignoreN} @ts-ignore/@ts-nocheck outside tests`);
  }

  if (swift) {
    const files = walk(repo, { exts: ['.swift'] });
    const tryN = countMatches(files, repo, /(^|[^\w])try!/);
    if (tryN > 0) findings.warn('Styles', `${tryN} force-try (try!) outside tests`);

    const castN = countMatches(files, repo, /\sas!(\s|$)/);
    if (castN > 0) findings.warn('Styles', `${castN} force-cast (as!) outside tests`);

    const printN = countMatches(files, repo, /(^|[^\w.])print\(/);
    if (printN > 0) findings.warn('Styles', `${printN} print() call(s) outside tests`);
  }

  if (!webTs && !swift) {
    findings.pass('Styles', 'no TypeScript/Swift sources to scan');
  }
}
