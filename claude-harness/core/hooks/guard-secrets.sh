#!/usr/bin/env bash
# PreToolUse(Write|Edit) — refuse to write what looks like a LIVE credential into a file.
#
# High-confidence, low-false-positive patterns only. Placeholder tokens (sk-xxx, AKIA...,
# BEGIN PRIVATE KEY with no body) do not match. Stack-agnostic — belongs in core.
#
# Blocks the write. If a real secret is genuinely needed (test fixture recorded on purpose),
# the user can say so explicitly and the model can note it.
set -uo pipefail

payload=$(cat)

# Write carries .content; Edit carries .new_string. Scan whichever is present.
content=$(printf '%s' "$payload" | jq -r '.tool_input.content // .tool_input.new_string // ""')
path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // ""')
[ -z "$content" ] && exit 0

hit=""
flag() { hit="${hit:+$hit, }$1"; }

# PEM private key block (RSA/EC/OPENSSH/PGP …) with an actual base64 body line.
printf '%s' "$content" | grep -qE -- '-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----' \
  && printf '%s' "$content" | grep -qE '^[A-Za-z0-9+/]{40,}={0,2}$' \
  && flag "private key block"

# Cloud / provider tokens with distinctive prefixes.
printf '%s' "$content" | grep -qE 'AKIA[0-9A-Z]{16}'            && flag "AWS access key id"
printf '%s' "$content" | grep -qE 'gh[pousr]_[A-Za-z0-9]{36,}'  && flag "GitHub token"
printf '%s' "$content" | grep -qE 'github_pat_[A-Za-z0-9_]{40,}' && flag "GitHub fine-grained PAT"
printf '%s' "$content" | grep -qE 'xox[baprs]-[A-Za-z0-9-]{12,}' && flag "Slack token"
printf '%s' "$content" | grep -qE 'sk-(ant-)?[A-Za-z0-9_-]{24,}' && flag "AI provider API key (sk-)"
printf '%s' "$content" | grep -qE 'AIza[0-9A-Za-z_-]{35}'       && flag "Google API key"

[ -z "$hit" ] && exit 0

jq -n --arg p "$path" --arg h "$hit" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: (
      "This write into " + $p + " contains what looks like a LIVE credential (" + $h + ").\n"
      + "Refusing — secrets must not be written into files. Use an env var / secret store, or "
      + "a placeholder. If this is a deliberate test fixture, say so explicitly and I will note it."
    )
  }
}'
exit 0
