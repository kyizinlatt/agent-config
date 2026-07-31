# Agent PipX

Audit a repository's **AI-agent configuration** — config, rules, styles, environment — against the
[`AGENTS.md`](https://agents.md) standard. Works for whatever coding agent your team uses: Claude
Code, Codex, Kimi, Cursor, Antigravity, Gemini, Copilot.

```sh
npx agent-pipx
```

Zero dependencies, no API key. `check` / `report` / `init` / `fix` run fully offline;
`upgrade` is the opt-in exception (queries npm).

## Why

Every agent tool has its own instruction files — `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/`,
`.agents/rules/` — but they should all express **one** set of rules. `AGENTS.md` is the emerging
cross-tool standard (stewarded by the Linux Foundation's Agentic AI Foundation) that most tools now
read natively. `agent-pipx` checks that your repo has a single source of truth and that every
tool-specific file **bridges to it** instead of drifting into a second, conflicting copy.

## Install

```sh
npm install -g agent-pipx
npx agent-pipx
```

Requires Node ≥ 18.

## Usage

```sh
agent-pipx                 # check the current repo (live progress + summary, exit 0/1/2)
agent-pipx check --json    # machine-readable findings
agent-pipx check --sarif   # SARIF 2.1.0 for GitHub code scanning
agent-pipx check --strict  # treat warnings as failures (exit 2) — good for CI
agent-pipx report          # status + fix cards + judgement + agent prompt
agent-pipx fix             # dry-run safe fixes; add --yes to apply (backs up originals)
agent-pipx init            # scaffold AGENTS.md + a bridge file for your detected tool(s)
agent-pipx init --tool claude
agent-pipx upgrade         # query npm for a newer release (always network); --yes installs globally
```

Exit codes: `0` pass · `1` warnings · `2` failures — drop it into CI or a pre-commit hook.

## What it checks

| Category | Checks |
|---|---|
| **Secrets** | Scans committed config/instruction files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.claude`, `.cursor/rules`, …) for accidentally-committed credentials (AWS/GitHub/Slack/Google/AI keys, private keys). Reports the type and line — never the secret value. |
| **Config** | Each tool adapter present (CLAUDE.md, GEMINI.md, `.cursor/rules`, `.agents/rules`, …) bridges to `AGENTS.md` by import or symlink — no duplication or drift. `GEMINI.md` doesn't use an unresolvable `@~/…` import. `.cursor/rules` are `.mdc` with frontmatter. `.claude/settings.json` + hooks are valid and live. Surfaces configured MCP servers to review their scope. |
| **Rules** | `AGENTS.md` exists as the single source of truth, no leftover template placeholders, not empty, under ~200 lines, no empty sections, and documents Commands / boundaries / sensitive-data. Missing SSOT while adapters exist is a failure. |
| **Styles** | Stack-detected antipattern scan (TypeScript `any`/`console.log`/`@ts-ignore`; Swift `try!`/`as!`/`print`). Advisory. |
| **Environment** | Which agent CLIs are installed; package manager matches its lockfile; base tooling present; a CI or pre-commit quality gate exists. |

Supported tools: Claude Code, Codex, Kimi, Cursor, Antigravity, Gemini, Copilot, Windsurf, Aider,
Zed, Continue, Amazon Q, Jules.

## The AGENTS.md model

```
AGENTS.md  ← the single source of truth (your rules live here)
├── CLAUDE.md        →  @AGENTS.md   (Claude Code reads CLAUDE.md; import or symlink bridges it)
├── GEMINI.md        →  @./AGENTS.md (or a symlink)
├── .cursor/rules/   →  optional scoped .mdc; Cursor also reads AGENTS.md natively
├── .agents/rules/   →  optional scoped rules (Antigravity)
└── Codex / Kimi / Copilot  →  read AGENTS.md directly, no bridge needed
```

Only Claude Code requires a bridge file (`CLAUDE.md` → `@AGENTS.md`). Gemini reads `AGENTS.md`
natively; if you also keep a `GEMINI.md`, it must `@`-import or symlink `AGENTS.md` (never `@~/…`,
which Gemini cannot resolve). Every other listed tool reads `AGENTS.md` directly.

## Claude Code integration (optional)

The [`claude-harness/`](claude-harness/) directory ships an optional Claude Code harness — hooks,
`/ship` `/plan` `/handoff` `/config-check` commands, and reusable subagents — that any repo can
link. The `/config-check` command and `config-auditor` subagent drive this same CLI. See
[claude-harness/README.md](claude-harness/README.md).

## Privacy & safety

Safe to run on any repo, including private ones — enforced by tests (`test/safety.test.js`):

| Guarantee | Detail |
|---|---|
| **Offline by default** | `check` / `report` / `init` / `fix` make zero network requests. Zero runtime deps. |
| **Opt-in network** | Only `upgrade` contacts npm (`npm view`; `--yes` may `npm install -g`). |
| **No silent code execution** | Offline commands never spawn a shell. CLIs are detected via a `PATH` scan. |
| **Read-only audit** | `check` and `report` never create, modify, or delete a file. |
| **Explicit writes only** | `init` creates missing files only; `fix` writes only with `--yes` (+ `*.bak`). |
| **No content leaks** | Findings report counts, paths, and messages — never your file contents. |

See [SECURITY.md](SECURITY.md) for the full policy (including CI Trusted Publishing).

## License

See [LICENSE](LICENSE).
