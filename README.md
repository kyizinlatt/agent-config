# agent-config

Audit a repository's **AI-agent configuration** — config, rules, styles, environment — against the
[`AGENTS.md`](https://agents.md) standard. Works for whatever coding agent your team uses: Claude
Code, Codex, Kimi, Cursor, Antigravity, Gemini, Copilot.

```sh
npx agent-config
```

Zero dependencies, no API key, runs offline.

## Why

Every agent tool has its own instruction files — `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/`,
`.agents/rules/` — but they should all express **one** set of rules. `AGENTS.md` is the emerging
cross-tool standard (stewarded by the Linux Foundation's Agentic AI Foundation) that most tools now
read natively. `agent-config` checks that your repo has a single source of truth and that every
tool-specific file **bridges to it** instead of drifting into a second, conflicting copy.

## Install

```sh
npm install -g agent-config      # then: agent-config
# or, no install:
npx agent-config
```

Requires Node ≥ 18.

## Usage

```sh
agent-config                 # check the current repo (human summary, exit 0/1/2)
agent-config check --json    # machine-readable findings
agent-config check --sarif   # SARIF 2.1.0 for GitHub code scanning
agent-config check --strict  # treat warnings as failures (exit 2) — good for CI
agent-config report          # findings + a judgement prompt for your agent to act on
agent-config fix             # dry-run safe fixes; add --yes to apply (backs up originals)
agent-config init            # scaffold AGENTS.md + a bridge file for your detected tool(s)
agent-config init --tool claude
```

Exit codes: `0` pass · `1` warnings · `2` failures — drop it into CI or a pre-commit hook.

## What it checks

| Category | Checks |
|---|---|
| **Secrets** | Scans committed config/instruction files (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.claude`, `.cursor/rules`, …) for accidentally-committed credentials (AWS/GitHub/Slack/Google/AI keys, private keys). Reports the type and line — never the secret value. |
| **Config** | Each tool adapter present (CLAUDE.md, GEMINI.md, `.cursor/rules`, `.agents/rules`, …) bridges to `AGENTS.md` by import or symlink — no duplication or drift. `GEMINI.md` doesn't use an unresolvable `@~/…` import. `.cursor/rules` are `.mdc` with frontmatter. `.claude/settings.json` + hooks are valid and live. |
| **Rules** | `AGENTS.md` exists as the single source of truth, no leftover template placeholders, not empty, under ~200 lines (agent adherence drops past that), no empty sections. Missing SSOT while adapters exist is a failure. |
| **Styles** | Stack-detected antipattern scan (TypeScript `any`/`console.log`/`@ts-ignore`; Swift `try!`/`as!`/`print`). Advisory. |
| **Environment** | Which agent CLIs are installed; package manager matches its lockfile; base tooling present. |

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

Only Claude Code needs a bridge file; every other tool reads `AGENTS.md` directly.

## Claude Code integration (optional)

The [`claude-harness/`](claude-harness/) directory ships an optional Claude Code harness — hooks,
`/ship` `/plan` `/handoff` `/config-check` commands, and reusable subagents — that any repo can
link. The `/config-check` command and `config-auditor` subagent drive this same CLI. See
[claude-harness/README.md](claude-harness/README.md).

## Privacy & safety

Safe to run on any repo, including private ones — and enforced by tests:

- **No network, no telemetry.** Zero runtime dependencies and zero network calls; your code never
  leaves your machine.
- **No code execution.** It never runs shell commands or `eval`; installed CLIs are detected by a
  `PATH` scan, not by executing anything.
- **`check` and `report` are read-only.** They never create, modify, or delete a file.
- **`init` only creates missing files**; **`fix` only writes with `--yes`** and always backs up
  the original to `*.bak` first. Neither ever silently overwrites your files.
- Findings report only counts, paths, and messages — never your file contents.

See [SECURITY.md](SECURITY.md) for details.

## License

See [LICENSE](LICENSE).
