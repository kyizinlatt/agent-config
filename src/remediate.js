// Map warn/fail findings to concrete remediation steps for the report UI.
// Match on category + message pattern; keep tips short and actionable.
import { FAIL, WARN } from './findings.js';

const TIPS = [
  {
    re: /possible .+ committed/i,
    tip: 'Rotate the credential immediately, remove it from the file (and git history if committed), then re-run check.',
  },
  {
    re: /core hook .+ not wired/i,
    tip: 'Re-run the harness installer (`claude-harness/install-harness.sh`) so the core hooks are wired in Claude settings.',
  },
  {
    re: /settings\.json is missing/i,
    tip: 'Add Claude settings under `.claude/` (or remove an unused `.claude/` dir). Optional: `claude-harness/install-harness.sh`.',
  },
  {
    re: /settings\.json is not valid JSON/i,
    tip: 'Fix syntax in Claude settings under `.claude/` (no trailing commas, comments, or unquoted keys).',
  },
  {
    re: /dangling symlink/i,
    tip: 'Repair or remove the broken symlink so the target exists, or re-run the harness installer.',
  },
  {
    re: /hook script missing|hook script not executable/i,
    tip: 'Restore the missing hook file and `chmod +x` it, or re-run `claude-harness/install-harness.sh`.',
  },
  {
    re: /@~\/|cannot resolve.*~ expansion/i,
    tip: 'Run `agent-pipx fix` (dry-run) then `agent-pipx fix --yes` to rewrite `@~/…` → `@./AGENTS.md`, or symlink GEMINI.md → AGENTS.md.',
  },
  {
    re: /may be duplicated and drift/i,
    tip: 'Replace the adapter body with a one-line `@AGENTS.md` (or `@./AGENTS.md` for Gemini) import, or symlink it to AGENTS.md.',
  },
  {
    re: /plain \.md in \.cursor\/rules|Cursor ignores it/i,
    tip: 'Rename to `.mdc` and add YAML frontmatter (`description`, `globs` / `alwaysApply`).',
  },
  {
    re: /\.mdc rule with no frontmatter/i,
    tip: 'Add a YAML frontmatter block at the top of the `.mdc` file with `description` and `globs` or `alwaysApply`.',
  },
  {
    re: /no AGENTS\.md|no single source of truth|project rules are undocumented/i,
    tip: 'Run `agent-pipx init` to scaffold AGENTS.md (and a Claude/Gemini bridge if needed).',
  },
  {
    re: /PLACEHOLDER|unfilled template stubs|nearly empty/i,
    tip: 'Replace template stubs in AGENTS.md with real project rules, commands, and boundaries.',
  },
  {
    re: /missing recommended section/i,
    tip: 'Add short Commands, Boundaries (do not touch), and Sensitive data sections to AGENTS.md.',
  },
  {
    re: /empty section/i,
    tip: 'Fill each empty heading in AGENTS.md with real guidance, or delete the unused heading.',
  },
  {
    re: /lines — agent adherence drops|oversize|split into scoped/i,
    tip: 'Trim AGENTS.md toward ~200 lines; move scoped detail into `.cursor/rules/*.mdc` or similar.',
  },
  {
    re: /console\.log\/debug\/info/i,
    tip: 'Remove debug `console.log`/`debug`/`info` from non-test code, or route through a shared logger module.',
  },
  {
    re: /use\(s\) of `any`/i,
    tip: 'Replace `any` with a concrete type, `unknown` + narrowing, or a shared domain type.',
  },
  {
    re: new RegExp('@ts-' + '(ignore|nocheck)', 'i'),
    tip: 'Remove the suppressions and fix the underlying type error, or isolate them behind a typed boundary.',
  },
  {
    re: /force-try|force-cast|print\(\) call/i,
    tip: 'Replace force-try/force-cast with typed error handling; swap `print` for a logger in non-test Swift.',
  },
  {
    re: /no lockfile/i,
    tip: 'Commit the lockfile for your package manager (`pnpm install` / `npm install` / `yarn`) so dependency versions stay pinned.',
  },
  {
    re: /no CI workflow or pre-commit/i,
    tip: 'Add a CI workflow under `.github/workflows/` (or pre-commit / husky / lefthook) that runs tests.',
  },
  {
    re: /git not on PATH/i,
    tip: 'Install git and ensure it is on PATH.',
  },
  {
    re: /node not on PATH/i,
    tip: 'Install Node.js ≥ 18 and ensure `node` is on PATH.',
  },
  {
    re: /pnpm-lock\.yaml present but pnpm not/i,
    tip: 'Install pnpm (`corepack enable` or `npm i -g pnpm`) to match the lockfile.',
  },
  {
    re: /Swift sources present but neither swift nor xcodebuild/i,
    tip: 'Install Xcode / Swift toolchain, or run checks on a machine that has them.',
  },
  {
    re: /not valid JSON/i,
    tip: 'Fix the JSON syntax in the reported file and re-run check.',
  },
];

/** @returns {string|null} remediation tip, or null if none matched */
export function tipForFinding(finding) {
  if (finding.severity !== WARN && finding.severity !== FAIL) return null;
  for (const { re, tip } of TIPS) {
    if (re.test(finding.message)) return tip;
  }
  return 'Review the finding, fix the underlying config/source, then re-run `agent-pipx check`.';
}

/** Pair each warn/fail with its tip (stable order: fails first, then warns). */
export function remediationsFor(findings) {
  const order = { [FAIL]: 0, [WARN]: 1 };
  return findings.items
    .filter((f) => f.severity === FAIL || f.severity === WARN)
    .sort((a, b) => order[a.severity] - order[b.severity] || a.category.localeCompare(b.category))
    .map((f) => ({ finding: f, tip: tipForFinding(f) }));
}
