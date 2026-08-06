---
description: Audit this repo's agent configuration (config, rules, styles, environment) and report conformance.
---

Audit how well this repository conforms to the AGENTS.md standard. Target: $ARGUMENTS
(default: the current repo).

1. **Deterministic pass.** Run the checker:

   ```
   npx agent-pipx report
   ```

   `report` prints the mechanical findings as JSON plus a judgement prompt. Every `fail` is a
   defect; every `warn` needs judgement. (Plain `npx agent-pipx check` gives the human summary
   and an exit code for CI.)

2. **Judgement pass.** Follow the prompt `report` emits, or delegate to the `config-auditor`
   subagent: read `AGENTS.md` and each per-tool adapter (CLAUDE.md, GEMINI.md, `.cursor/rules`,
   `.agents/rules`) and check that the adapters bridge to `AGENTS.md` rather than duplicating or
   contradicting it, that the configured tools match the stack, and that no rules conflict.

   Also weigh the checker's newer advisory findings:

   - **Protocol hygiene** — If Tracked findings / Progress / durable plan artifacts exist, is the
     remediation ledger treated as status authority and Progress as chronological evidence only?
     Would closing a finding require exit-gate evidence (not merely code/tests green)?
   - **Skills / commands** — Do skill packages and slash commands have usable frontmatter? Are
     commands thin entry points rather than copied methodology?
   - **Local settings** — Is `.claude/settings.local.json` gitignored, and are permissions scoped
     sanely (no blanket `Bash(*)`)?

3. **Report** findings grouped under **Config / Rules / Styles / Environment** — each with
   `file:line`, what is wrong, why, and the fix — then a one-line verdict. Report only; do not
   edit unless the user asks.
