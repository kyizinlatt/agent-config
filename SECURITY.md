# Security & privacy

`agent-config` is designed to be safe to run on any repository, including private and
work codebases. These properties are enforced by tests (`test/safety.test.js`).

## What it does not do

- **No network access.** The tool makes zero network requests — no telemetry, no analytics, no
  "phone home". It has zero runtime dependencies, so nothing else runs either. Your code and its
  configuration never leave your machine.
- **No code execution.** It never runs shell commands, `eval`, or any user-controlled input. It
  detects installed CLIs by scanning `PATH` entries on disk, not by executing anything.
- **No silent edits.** `check` and `report` are strictly **read-only** — they do not create,
  modify, or delete a single file in your repository.

## What `init` writes (the only command that writes)

`agent-config init` scaffolds a starter `AGENTS.md` and, for Claude Code / Gemini, a thin bridge
file. It **only ever creates files that do not already exist**, and it prints every file it
creates. It will never overwrite or edit an existing `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` —
if one is present, it is left exactly as you wrote it.

## What it reads

To produce findings the tool reads text config and source files (`AGENTS.md`, `CLAUDE.md`,
`GEMINI.md`, `.cursor/rules`, `.claude/settings.json`, and `.ts`/`.js`/`.swift` sources for the
style scan). It reports only **counts, paths, and pass/warn/fail messages** — never the contents
of your files. It does not read `.env` files, credentials, or secret stores.

## Reporting a vulnerability

Open a private security advisory on the repository, or a regular issue if it is not sensitive.
