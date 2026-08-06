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

## Repository layout

- [Entry point — e.g. `bin/`, `src/main`, `app/`]
- [Where domain logic lives]
- [Tests / generated / do-not-edit trees]
- List real paths in this repo (backticks); do not copy another stack's tree.

## Commands

- Install: `[…]`
- Test: `[…]`
- Lint / typecheck: `[…]`
- Build: `[…]`

## Rules

- [A domain rule or invariant the agent must not weaken]
- [Where business logic lives; what stays out of it]
- Plan and show risks before non-trivial changes; ask when unsure.

## Tracked findings (when this repository has audits or reviews)

- Keep stable finding IDs and one current remediation ledger in the finding document. The ledger is
  current status authority; treat progress or changelog files as chronological evidence, not status.
- Explicit states help handoffs: `OPEN`, `IN_PROGRESS`, `CODE_COMPLETE`, `PRODUCTION_PENDING`,
  `CLOSED`, `BLOCKED_DECISION`, `ACCEPTED_RISK`, `SUPERSEDED`. Distinguish `CODE_COMPLETE` /
  `PRODUCTION_PENDING` from `CLOSED`; close only after every applicable acceptance test and
  live/external exit gate has evidence.
- Check the ledger and current implementation before starting. Update the ledger with the fix, and
  never silently redo a closed finding—reopen it with contradictory evidence.
- Accepted risks need an owner, decision date, compensating controls, and review/expiry date.
- Optional: if this repo keeps a durable plan, use one live plan file plus one lifecycle archive
  (shipped index). Every tracked section needs a stable ID and an exit gate; "shipped" means that
  gate has evidence — code green or a progress entry alone is not enough.

## Boundaries (do not touch)

- [Generated files / directories the agent must not edit]
- [Unrelated areas to leave alone]

## Sensitive data

- Never put secrets, credentials, tokens, or `.env` contents in this repo or in prompts.
- [Where real config/secrets actually live, e.g. a secret manager]
