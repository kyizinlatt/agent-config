#!/usr/bin/env bash
# PreToolUse(Write) — block files that break specific web toolchains, but ONLY when the
# project actually uses that toolchain (detected from package.json). Safe in any web-ts repo:
# if the version can't be confirmed, the write is allowed.
#
#   middleware.ts      → blocked only on Next.js 16+ (which uses proxy.ts instead)
#   tailwind.config.*  → blocked only on Tailwind CSS v4 (CSS-first, no config file)
set -uo pipefail

payload=$(cat)
path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // ""')
[ -z "$path" ] && exit 0
base=$(basename "$path")

# Only two filenames are candidates — bail early otherwise.
case "$base" in
  middleware.ts|middleware.js|middleware.mjs) kind="middleware" ;;
  tailwind.config.ts|tailwind.config.js|tailwind.config.mjs|tailwind.config.cjs) kind="tailwind" ;;
  *) exit 0 ;;
esac

# Find the nearest package.json walking up from the target's directory.
dir=$(CDPATH= cd -- "$(dirname -- "$path")" 2>/dev/null && pwd || echo "")
pkg=""
while [ -n "$dir" ] && [ "$dir" != "/" ]; do
  [ -f "$dir/package.json" ] && { pkg="$dir/package.json"; break; }
  dir=$(dirname -- "$dir")
done
[ -z "$pkg" ] && exit 0   # no package.json → not a node project → don't interfere

reason=""
if [ "$kind" = "middleware" ] && grep -qE '"next"[[:space:]]*:[[:space:]]*"[\^~]?1[6-9]' "$pkg"; then
  reason="This project is on Next.js 16+, which refuses to build when both proxy.ts and $base exist. Edge logic lives in proxy.ts — edit that instead of creating $base."
elif [ "$kind" = "tailwind" ] && grep -qE '"tailwindcss"[[:space:]]*:[[:space:]]*"[\^~]?4' "$pkg"; then
  reason="This project is on Tailwind CSS v4, which is CSS-first — there is no $base. Put theme changes in the @theme block of your global CSS instead."
fi

[ -z "$reason" ] && exit 0

jq -n --arg r "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $r
  }
}'
exit 0
