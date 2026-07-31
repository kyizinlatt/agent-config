#!/usr/bin/env bash
# PreToolUse(Bash) — block `git push` while a GitHub Action is in flight on the branch
# being pushed. Many CI configs use `cancel-in-progress: true`, so a second push cancels
# the first run and multiplies one change into several Actions.
#
# Stack-agnostic (any repo with GitHub Actions). Fails OPEN: if gh is missing, unauthenticated,
# offline, or the repo has no Actions, the push is allowed rather than wedged.
set -uo pipefail

payload=$(cat)
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""')

case "$cmd" in *"git push"*) ;; *) exit 0 ;; esac
case "$cmd" in *--dry-run*) exit 0 ;; esac
command -v gh >/dev/null 2>&1 || exit 0

# Branch being pushed: an explicit ref in the command wins, else the current branch.
branch=$(printf '%s' "$cmd" | sed -nE 's/.*git push[[:space:]]+[^[:space:]]+[[:space:]]+([^[:space:]:]+).*/\1/p')
[ -z "$branch" ] && branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
[ -z "$branch" ] && exit 0

runs=$(gh run list --limit 20 --json databaseId,headBranch,workflowName,status 2>/dev/null || echo '[]')
busy=$(printf '%s' "$runs" | jq --arg b "$branch" \
  '[ .[] | select(.headBranch == $b and (.status == "in_progress" or .status == "queued")) ]' 2>/dev/null || echo '[]')

count=$(printf '%s' "$busy" | jq 'length' 2>/dev/null || echo 0)
[ "$count" -eq 0 ] && exit 0

detail=$(printf '%s' "$busy" | jq -r '.[] | "  • run \(.databaseId) — \(.workflowName) [\(.status)]"')

jq -n --arg b "$branch" --arg d "$detail" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: (
      "GitHub Actions are still running on `" + $b + "` — pushing now can cancel them "
      + "(cancel-in-progress).\n" + $d
      + "\n\nWait with `gh run watch <id>`, then push."
    )
  }
}'
exit 0
