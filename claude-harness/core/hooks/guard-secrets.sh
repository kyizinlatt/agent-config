#!/usr/bin/env bash
# PreToolUse(Write|Edit) — refuse to write what looks like a LIVE credential into a file.
#
# High-confidence, low-false-positive patterns only. Placeholder tokens (sk-xxx, AKIA...,
# BEGIN PRIVATE KEY with no body) do not match. Stack-agnostic — belongs in core.
#
# For Edit: reconstruct the post-edit file (old_string → new_string) and scan that, so a
# secret split across multiple edits cannot evade the chunk-only check.
#
# Blocks the write. If a real secret is genuinely needed (test fixture recorded on purpose),
# the user can say so explicitly and the model can note it.
set -uo pipefail

payload=$(cat)

path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // ""')

# Rebuild the body that would exist after this Write/Edit. Prefer node (always present
# where agent-pipx runs); fall back to the raw chunk if reconstruction fails.
content=$(printf '%s' "$payload" | node --input-type=module -e '
import fs from "node:fs";
const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const j = JSON.parse(Buffer.concat(chunks).toString("utf8"));
const ti = j.tool_input || {};
const filePath = ti.file_path || "";
let body = ti.content;
if (body == null) body = ti.new_string ?? "";
const oldStr = ti.old_string;
const newStr = ti.new_string ?? "";
if (filePath && oldStr != null && typeof oldStr === "string" && fs.existsSync(filePath)) {
  try {
    const cur = fs.readFileSync(filePath, "utf8");
    const i = cur.indexOf(oldStr);
    if (i >= 0) {
      process.stdout.write(cur.slice(0, i) + newStr + cur.slice(i + oldStr.length));
      process.exit(0);
    }
  } catch { /* fall through to chunk */ }
}
process.stdout.write(typeof body === "string" ? body : "");
' 2>/dev/null || printf '%s' "$payload" | jq -r '.tool_input.content // .tool_input.new_string // ""')

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
