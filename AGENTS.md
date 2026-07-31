# agent-config

> This file is the single source of truth for AI coding agents working on this repo. Every tool
> (Codex, Cursor, Gemini, Kimi, Antigravity) reads it directly; Claude Code reads it via a
> `CLAUDE.md` that imports it. It also dogfoods the tool this repo builds.

## Project

`agent-config` — a zero-dependency Node CLI that audits a repository's AI-agent configuration
(config, rules, styles, environment) against the `AGENTS.md` standard, for any coding agent.
Package manager: npm.

## Stack

- Node.js ≥ 18, ES modules (`"type": "module"`)
- **No runtime dependencies** — Node built-ins only (`fs`, `path`, `child_process`, `node:test`)
- CLI entry `bin/agent-config.js` → `src/cli.js`; checks in `src/checks/`; tool knowledge in
  `adapters/tools.js`

## Commands

- Run: `node bin/agent-config.js check` (or `report`, `init`)
- Test: `node --test`
- Package dry-run: `npm pack --dry-run`

## Rules

- Keep runtime dependencies at **zero** — reach for a Node built-in before ever adding a package.
- `adapters/tools.js` is the authority for every per-tool convention; each entry must cite the
  tool's official docs. Update it here, never hard-code tool facts in the checks.
- Findings are advisory data, not enforcement: `fail` = mechanically broken, `warn` = judgement
  needed, `pass` = verified. Exit codes 0/1/2 must stay stable (CI depends on them).
- Every new check needs a test in `test/` that builds a synthetic repo and asserts the finding.
- Never commit anything private (personal names, machine paths, private repo names) — this repo
  is public. Run the grep gate before shipping.
