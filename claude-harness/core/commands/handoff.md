---
description: Write a PROGRESS.md session entry for the work just finished (no commit, no push).
---

Write a handoff entry for the work completed this session. Do not commit or push.

If the repo has `PROGRESS.md`, prepend a new entry at the top (newest first):

```
**Done (YYYY-MM-DD, <short title>)**
- **Ask:** <what was requested>
- **Change:** <what changed, briefly>
- **Files:** <key files touched>
- **Next:** <the next action, if any>
```

Keep it terse — facts, no filler. Convert relative dates to absolute. If `PROGRESS.md` does
not exist, propose creating one and show the entry you would add.

**Remind (do not auto-edit):** Progress is chronological evidence, not status authority. If this
session remediates a tracked finding, say whether the finding document's remediation ledger still
needs an update — and that `CODE_COMPLETE` is not `CLOSED` until exit-gate evidence exists.
