---
description: Commit the current work and push the current branch, safely.
---

Ship the current working changes. Follow this exactly:

1. Run `git status` and `git diff --stat`. If there is nothing to commit, stop and say so.
2. Read this project's `AGENTS.md` "Commands" and run the check(s) that apply to the change
   (lint / typecheck / test / build). Do not proceed if a check fails — report the failure.
3. Confirm CI is idle: `gh run list --status in_progress --limit 5` and the same with
   `--status queued`. If a run is active on the branch you will push, wait (`gh run watch <id>`)
   or stop. The guard-push hook enforces this too.
4. Stage the change (plus `PROGRESS.md` if the repo keeps one). Commit with a concise
   Conventional-Commits message. Never bypass hooks.
5. Push the current branch: `git push origin <current-branch>`. Never force-push.
6. If this project's `AGENTS.md` defines a specific branch / merge / release policy
   (e.g. dev→main), follow that policy instead of a plain push.

Report what was committed, which checks passed, and what was pushed.
