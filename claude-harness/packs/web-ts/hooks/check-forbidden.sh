#!/usr/bin/env bash
# PostToolUse(Edit|Write) — advisory. Surface TypeScript hygiene problems in the file just
# written: `any`, `@ts-ignore`/`@ts-nocheck`, and stray console logging.
#
# web-ts pack: generic to any TypeScript project. Never blocks — injects context so the
# issue is fixed in the same turn.
set -uo pipefail

payload=$(cat)
path=$(printf '%s' "$payload" | jq -r '.tool_response.filePath // .tool_input.file_path // ""')
[ -z "$path" ] || [ ! -f "$path" ] && exit 0

case "$path" in
  *.ts|*.tsx|*.mts|*.cts) ;;
  *) exit 0 ;;
esac

# Places where these patterns are legitimate.
case "$path" in
  */scripts/*|*/tests/*|*.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx) exit 0 ;;
  *.d.ts|*/generated/*|*/node_modules/*|*/logger.ts|*/logger.tsx) exit 0 ;;
esac

findings=""
add() { findings="${findings}${findings:+$'\n'}  • $1"; }

if grep -nE '(^|[^.[:alnum:]])console\.(log|debug|info)\(' "$path" >/dev/null 2>&1; then
  lines=$(grep -nE '(^|[^.[:alnum:]])console\.(log|debug|info)\(' "$path" | cut -d: -f1 | paste -sd, -)
  add "console.log/debug/info on line(s) $lines — use a logger"
fi

if grep -nE ':[[:space:]]*any\b|<any>|as any\b' "$path" >/dev/null 2>&1; then
  lines=$(grep -nE ':[[:space:]]*any\b|<any>|as any\b' "$path" | cut -d: -f1 | paste -sd, -)
  add "\`any\` on line(s) $lines — give it a real type"
fi

if grep -n '@ts-ignore\|@ts-nocheck' "$path" >/dev/null 2>&1; then
  lines=$(grep -n '@ts-ignore\|@ts-nocheck' "$path" | cut -d: -f1 | paste -sd, -)
  add "@ts-ignore/@ts-nocheck on line(s) $lines — fix the type instead"
fi

[ -z "$findings" ] && exit 0

jq -n --arg p "$path" --arg f "$findings" '{
  suppressOutput: true,
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("TypeScript hygiene in " + $p + ":\n" + $f + "\nFix before moving on.")
  }
}'
exit 0
