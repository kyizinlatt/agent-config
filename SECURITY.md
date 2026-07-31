# Security & privacy

`agent-pipx` is designed to be safe to run on any repository, including private and
work codebases. These properties are enforced by tests (`test/safety.test.js`).

## What it does not do (check / report / init / fix)

- **No network access** for `check`, `report`, `init`, and `fix`. Those commands make zero
  network requests — no telemetry, no analytics, no "phone home". They have zero runtime
  dependencies, so nothing else runs either. Your code and its configuration never leave your
  machine.
- **No code execution** for those commands. They never run shell commands, `eval`, or any
  user-controlled input. Installed CLIs are detected by scanning `PATH` entries on disk, not by
  executing anything.
- **No silent edits.** `check` and `report` are strictly **read-only** — they do not create,
  modify, or delete a single file in your repository.

## What writes (only `init` and `fix`)

`agent-pipx init` scaffolds a starter `AGENTS.md` and, for Claude Code / Gemini, a thin bridge
file. It **only ever creates files that do not already exist**, and it prints every file it
creates. It will never overwrite or edit an existing `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`.

`agent-pipx fix` applies only safe, mechanical remediations (e.g. rewriting Gemini's
unresolvable `@~/…` import). It is a **dry run unless you pass `--yes`**, it **backs up any file
it changes to `*.bak`** before writing, and it prints every change. It never merges, deletes, or
guesses at your content — content drift is reported for you to resolve by hand.

## Opt-in network: `upgrade` (CLI) and publish (CI)

`agent-pipx upgrade` is the only **CLI** command that contacts the network. It asks the npm
registry for the latest version (`npm view`). With `--yes` it may run
`npm install -g agent-pipx@<version>`. Dry-run (default) only prints the suggested command.
`check` / `report` remain offline.

npm package publishes from GitHub Actions use **Trusted Publishing (OIDC)** — no `NPM_TOKEN`,
no GitHub Environment. On npmjs.com → package Settings → Trusted Publisher, set workflow
`publish.yml` and leave **Environment name blank**.

## What it reads

To produce findings the tool reads text config and source files (`AGENTS.md`, `CLAUDE.md`,
`GEMINI.md`, `.cursor/rules`, `.claude/settings.json`, and `.ts`/`.js`/`.swift` sources for the
style scan). It reports only **counts, paths, and pass/warn/fail messages** — never the contents
of your files. It does not read `.env` files, credentials, or secret stores.

## Reporting a vulnerability

Open a private security advisory on the repository, or a regular issue if it is not sensitive.
