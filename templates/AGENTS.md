# {{PROJECT_NAME}}

> Single source of truth for AI coding agents. Every tool (Codex, Cursor, Gemini, Kimi,
> Antigravity) reads this file directly; Claude Code reads it via a `CLAUDE.md` that imports it.
> Keep tool-specific bridge files thin — the rules live here.

## Project

{{PROJECT_NAME}} — [one-line description]. Package manager: [pnpm | npm | pip | swift | …].

## Stack

- [Framework + language]
- [UI / entry layer]
- [State / data]
- [Backend / DB]

## Commands

- Install: `[…]`
- Dev: `[…]`
- Test: `[…]`
- Build: `[…]`
- Lint / typecheck: `[…]`

## Rules

- [A domain rule or invariant the agent must not weaken]
- [Where business logic lives; what stays out of it]
- [Release / branch / push policy for this repo]
