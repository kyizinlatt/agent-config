---
description: Produce a focused implementation plan for a task before coding.
---

Produce an implementation plan for: $ARGUMENTS

This command is a **pre-code implementation plan** for the current task (steps, files, risks,
verification). It is not the repo's durable plan/ledger lifecycle — if `AGENTS.md` describes
tracked findings or a durable plan + archive, follow those documents for status and shipping;
do not invent a second status registry here.

1. Orient: read this project's `AGENTS.md` and the code that owns the behavior. State the key
   assumptions you are making. If the task remediates a tracked finding, open that finding's
   remediation ledger first.
2. Plan in proportion to risk: list the concrete steps, the files each step touches, and the
   order to do them in.
3. Call out the data / auth / security / state-machine boundaries the change must not weaken.
4. Give a verification path: which checks or tests prove it works, including failure cases.
   Note any live/external exit gate the durable protocol would still require after code lands.
5. Flag open questions that would change the approach.

Keep it lean — enough to execute, no filler. Do not start editing until the plan is agreed.
