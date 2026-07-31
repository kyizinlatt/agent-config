# Security & privacy

`agent-pipx` is designed to be safe to run on any repository, including private and work
codebases. The properties below are enforced by tests (`test/safety.test.js`).

## Offline by default

These commands make **zero network requests** — no telemetry, no analytics, no phone-home:

- `check`
- `report`
- `init`
- `fix`

They have zero runtime dependencies, so nothing else runs either. Your code and its
configuration never leave your machine.

## No silent edits

| Command | Writes? |
|---|---|
| `check` | Never — read-only |
| `report` | Never — read-only |
| `init` | Only **creates missing** files; never overwrites or edits existing ones |
| `fix` | Dry-run by default; writes only with `--yes`, and backs up to `*.bak` first |
| `upgrade` | Does not touch the target repo; with `--yes` may change the **global** npm install |

`init` scaffolds a starter `AGENTS.md` and, for Claude Code / Gemini, a thin bridge file. It
prints every file it creates.

`fix` applies only safe, mechanical remediations (e.g. rewriting Gemini's unresolvable
`@~/…` import). It never merges, deletes, or guesses at your content — content drift is
reported for you to resolve by hand.

## No code execution (except opt-in `upgrade`)

`check` / `report` / `init` / `fix` never run shell commands, `eval`, or user-controlled
input. Installed CLIs are detected by scanning `PATH` entries on disk, not by executing
anything.

## Opt-in network: `upgrade` (CLI) and publish (CI)

`agent-pipx upgrade` is the **only CLI command** that contacts the network. Invoking it
always asks the npm registry for the latest version (`npm view agent-pipx version`). With
`--yes` it may also run `npm install -g agent-pipx@<version>`. Without `--yes` it still
queries npm, then only prints the suggested install command.

In the codebase, `node:child_process` / `spawnSync` appear only in `src/upgrade.js`, and
`cli.js` calls `doUpgrade` solely for the `upgrade` command.

npm package publishes from GitHub Actions use **Trusted Publishing (OIDC)** — no
`NPM_TOKEN`, no GitHub Environment. On npmjs.com → package Settings → Trusted Publisher,
set workflow `publish.yml` and leave **Environment name blank**.

## What it reads

To produce findings the tool reads text config and source files (`AGENTS.md`, `CLAUDE.md`,
`GEMINI.md`, `.cursor/rules`, `.claude/settings.json`, and `.ts` / `.js` / `.swift` sources
for the style scan). It reports only **counts, paths, and pass/warn/fail messages** — never
the contents of your files. It does not read `.env` files, credentials, or secret stores.

## Reporting a vulnerability

Open a private security advisory on the repository, or a regular issue if it is not sensitive.
