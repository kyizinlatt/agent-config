#!/usr/bin/env bash
# PostToolUse(Edit|Write) — advisory only. Surface universal, language-agnostic hygiene
# problems in the file just written, so they are fixed in the same turn.
#
# Stack-agnostic core: unresolved merge-conflict markers and explicit do-not-commit flags.
# Language-specific checks (console.log, `any`, print, …) live in the per-stack packs.
set -uo pipefail

payload=$(cat)
path=$(printf '%s' "$payload" | jq -r '.tool_response.filePath // .tool_input.file_path // ""')
[ -z "$path" ] || [ ! -f "$path" ] && exit 0

findings=""
add() { findings="${findings}${findings:+$'\n'}  • $1"; }

if grep -nE '^(<<<<<<< |>>>>>>> |=======$)' "$path" >/dev/null 2>&1; then
  lines=$(grep -nE '^(<<<<<<< |>>>>>>> |=======$)' "$path" | cut -d: -f1 | paste -sd, -)
  add "unresolved merge-conflict markers on line(s) $lines"
fi

if grep -niE 'DO[ _-]?NOT[ _-]?COMMIT' "$path" >/dev/null 2>&1; then
  lines=$(grep -niE 'DO[ _-]?NOT[ _-]?COMMIT' "$path" | cut -d: -f1 | paste -sd, -)
  add "\"do not commit\" marker on line(s) $lines"
fi

[ -z "$findings" ] && exit 0

jq -n --arg p "$path" --arg f "$findings" '{
  suppressOutput: true,
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("Hygiene issues in " + $p + ":\n" + $f + "\nResolve them before moving on.")
  }
}'
exit 0
