#!/usr/bin/env bash
# PreToolUse(Read|Grep|Glob|Bash) — keep .env* out of model context.
#
# permissions.deny on Read alone is not enough: Bash(cat/grep/…) and Grep/Glob
# can still load credentials. This hook is the enforcement layer.
#
# Stack-agnostic — belongs in core. Fail closed on match; fail open on parse errors.
set -uo pipefail

payload=$(cat)

deny() {
  jq -n --arg r "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

is_env_basename() {
  case "$1" in
    .env|.env.*) return 0 ;;
    *) return 1 ;;
  esac
}

# Path-ish reference to .env / .env.* (shared by path fields and Bash commands).
refers_to_env() {
  printf '%s' "$1" | grep -Eq '(^|[[:space:]'\''\"=/])\.env($|\.|[[:space:]'\''\"|&;<>])'
}

# Read uses file_path; Grep/Glob use path. Also scan Grep/Glob pattern (.env*).
path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)
if [ -n "${path:-}" ]; then
  base=$(basename -- "$path")
  if is_env_basename "$base"; then
    deny "Refusing access to ${path} — .env files must stay out of agent context. Use a secret store or ask the user."
  fi
  # Symlink rename bypass: public.txt → .env
  if [ -e "$path" ] || [ -L "$path" ]; then
    resolved=$(realpath "$path" 2>/dev/null || true)
    if [ -n "${resolved:-}" ]; then
      rbase=$(basename -- "$resolved")
      if is_env_basename "$rbase"; then
        deny "Refusing access to ${path} (resolves to an .env file) — credentials stay out of agent context."
      fi
    fi
  fi
fi

pattern=$(printf '%s' "$payload" | jq -r '.tool_input.pattern // empty' 2>/dev/null || true)
if [ -n "${pattern:-}" ]; then
  case "$pattern" in
    .env|.env*|*\/.env|*\/.env*)
      deny "Refusing Grep/Glob pattern that targets .env — keep credentials out of agent context."
      ;;
  esac
  if refers_to_env "$pattern"; then
    deny "Refusing Grep/Glob pattern that targets .env — keep credentials out of agent context."
  fi
fi

tool=$(printf '%s' "$payload" | jq -r '.tool_name // empty' 2>/dev/null || true)
if [ "$tool" = "Bash" ]; then
  cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
  # Any path-ish .env reference in Bash — including interpreters (python/node/…) and redirects.
  if refers_to_env "$cmd"; then
    deny "Refusing Bash command that references .env — keep credentials out of agent context."
  fi
fi

exit 0
