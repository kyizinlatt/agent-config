---
description: Commit the current work and push the current branch, safely.
---

Ship the current working changes. Follow this exactly:

1. Run `git status` and `git diff --stat`. If there is nothing to commit, stop and say so.
2. Read this project's `AGENTS.md` "Commands" and run the check(s) that apply to the change
   (lint / typecheck / test / build). Do not proceed if a check fails — report the failure.
3. Confirm CI is idle on the branch you will push: `gh run list --status in_progress --limit 5`
   and the same with `--status queued` (filter to that branch). If a run is active, wait
   (`gh run watch <id>`) or stop. The guard-push hook enforces this too.
4. **Last CI result (narrow, fail-open).** If `gh` is available and this branch has prior workflow
   runs, check the latest conclusion for that branch. If it is `failure`, stop and report the
   failing run — do not push unless the user explicitly says to proceed anyway. If `gh` is
   missing, unauthenticated, the repo has no Actions, or the query errors, skip this step and
   continue (same fail-open posture as guard-push).
5. Stage the change (plus `PROGRESS.md` if the repo keeps one). Commit with a concise
   Conventional-Commits message. Never bypass hooks.
6. **Branch / merge policy.** Read this project's `AGENTS.md` for branch / merge / release rules.
   - If a policy is defined (e.g. push `dev` then merge to `main`), follow that policy exactly.
   - If none is defined, push only the current branch: `git push origin <current-branch>`.
   - Never invent a merge, two-push flow, or release step. Never force-push.
7. Report what was committed, which checks passed, what was pushed, and (if step 4 ran) the latest
   CI conclusion you saw.

**Remind (do not auto-edit):** Code green and a Progress entry are not closure. If this change
remediates a tracked finding or ships a durable plan section, say what ledger/plan update and
exit-gate evidence remain before the item is `CLOSED` / shipped.
