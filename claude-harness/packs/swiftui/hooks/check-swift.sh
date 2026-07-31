#!/usr/bin/env bash
# PostToolUse(Edit|Write) — advisory. Surface Swift/SwiftUI hygiene problems in the file just
# written: stray print(), force-try/force-cast, fatalError, and hand-edits to Xcode/SPM
# managed files.
#
# swiftui pack: generic to any Swift project. Never blocks — injects context.
set -uo pipefail

payload=$(cat)
path=$(printf '%s' "$payload" | jq -r '.tool_response.filePath // .tool_input.file_path // ""')
[ -z "$path" ] || [ ! -f "$path" ] && exit 0
base=$(basename "$path")

# Xcode / SPM managed files: hand-edits are error-prone.
case "$base" in
  project.pbxproj|Package.resolved|*.xcworkspacedata|contents.xcworkspacedata)
    jq -n --arg p "$path" '{
      suppressOutput: true,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: ($p + " is an Xcode/SPM managed file — prefer editing it through Xcode or `swift package`, hand-edits corrupt easily.")
      }
    }'
    exit 0 ;;
esac

case "$path" in *.swift) ;; *) exit 0 ;; esac

# Tests legitimately use force-unwrap, print, fatalError.
case "$path" in
  *Tests.swift|*/Tests/*|*/*Tests/*) exit 0 ;;
esac

findings=""
add() { findings="${findings}${findings:+$'\n'}  • $1"; }

if grep -nE '(^|[^[:alnum:]_.])print\(' "$path" >/dev/null 2>&1; then
  lines=$(grep -nE '(^|[^[:alnum:]_.])print\(' "$path" | cut -d: -f1 | paste -sd, -)
  add "print() on line(s) $lines — use os.Logger / a logger instead"
fi

if grep -nE '(^|[^[:alnum:]_])try!' "$path" >/dev/null 2>&1; then
  lines=$(grep -nE '(^|[^[:alnum:]_])try!' "$path" | cut -d: -f1 | paste -sd, -)
  add "force-try \`try!\` on line(s) $lines — handle the error"
fi

if grep -nE '[[:space:]]as!([[:space:]]|$)' "$path" >/dev/null 2>&1; then
  lines=$(grep -nE '[[:space:]]as!([[:space:]]|$)' "$path" | cut -d: -f1 | paste -sd, -)
  add "force-cast \`as!\` on line(s) $lines — use \`as?\` with handling"
fi

if grep -nE '(^|[^[:alnum:]_])fatalError\(' "$path" >/dev/null 2>&1; then
  lines=$(grep -nE '(^|[^[:alnum:]_])fatalError\(' "$path" | cut -d: -f1 | paste -sd, -)
  add "fatalError() on line(s) $lines — confirm this is a true unrecoverable path"
fi

[ -z "$findings" ] && exit 0

jq -n --arg p "$path" --arg f "$findings" '{
  suppressOutput: true,
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("Swift hygiene in " + $p + ":\n" + $f + "\nReview before moving on.")
  }
}'
exit 0
