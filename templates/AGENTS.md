# {{PROJECT_NAME}}

> Single source of truth for AI coding agents. Every tool (Codex, Cursor, Gemini, Kimi,
> Antigravity) reads this file directly; Claude Code reads it via a `CLAUDE.md` that imports it.
> Keep it lean — under ~200 lines. The rules live here; bridge files stay thin.

## Project

{{PROJECT_NAME}} — [one-line description]. Package manager: [pnpm | npm | pip | swift | …].

## Stack

- [Framework + language]
- [UI / entry layer]
- [State / data]

## Commands

- Install: `[…]`
- Test: `[…]`
- Lint / typecheck: `[…]`
- Build: `[…]`

## Rules

- [A domain rule or invariant the agent must not weaken]
- [Where business logic lives; what stays out of it]
- Plan and show risks before non-trivial changes; ask when unsure.

## Boundaries (do not touch)

- [Generated files / directories the agent must not edit]
- [Unrelated areas to leave alone]

## Sensitive data

- Never put secrets, credentials, tokens, or `.env` contents in this repo or in prompts.
- [Where real config/secrets actually live, e.g. a secret manager]
