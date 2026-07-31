#!/usr/bin/env bash
# Install the shared agent harness into a project's .claude/ directory.
#
# Usage:
#   install-harness.sh <repo-path> [--pack <name>] [--mode link|vendor]
#   install-harness.sh <repo-path> --update
#
#   --pack    core-only if omitted; otherwise overlays harness/packs/<name>
#   --mode    link   (default) symlink hooks/commands/tools/skills/agents back to agent-pipx
#             vendor copy them in, so the repo's .claude/ resolves without agent-pipx present
#   --update  re-run the install using the pack and mode recorded in the repo's
#             .claude/.harness-manifest (refreshes a vendored repo to the current harness)
#
# Idempotent. Never overwrites an existing AGENTS.md or PROGRESS.md. Merges (does not
# clobber) an existing .claude/settings.json. Records what it installed in
# .claude/.harness-manifest so a later --update knows what to refresh.
set -euo pipefail

HARNESS_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
CORE="$HARNESS_DIR/core"
TEMPLATE_DIR="$(dirname -- "$HARNESS_DIR")/project-template"

repo="" ; pack="" ; mode="" ; update=0
while [ $# -gt 0 ]; do
  case "$1" in
    --pack)   pack="${2:-}" ; shift 2 ;;
    --mode)   mode="${2:-}" ; shift 2 ;;
    --update) update=1 ; shift ;;
    -h|--help) grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//' ; exit 0 ;;
    -*) echo "unknown option: $1" >&2 ; exit 2 ;;
    *)  repo="$1" ; shift ;;
  esac
done

[ -n "$repo" ] || { echo "error: <repo-path> is required" >&2 ; exit 2 ; }
[ -d "$repo" ] || { echo "error: no such directory: $repo" >&2 ; exit 2 ; }
repo=$(CDPATH= cd -- "$repo" && pwd)
MANIFEST="$repo/.claude/.harness-manifest"

# --update: recover pack + mode from the manifest an earlier install wrote. Explicit
# --pack/--mode on the command line still win, so an update can also re-target.
if [ "$update" -eq 1 ]; then
  [ -f "$MANIFEST" ] || { echo "error: --update needs an existing $MANIFEST (run a normal install first)" >&2 ; exit 2 ; }
  command -v jq >/dev/null 2>&1 || { echo "error: jq is required to read the manifest" >&2 ; exit 2 ; }
  [ -z "$pack" ] && pack=$(jq -r '.pack // ""' "$MANIFEST")
  [ -z "$mode" ] && mode=$(jq -r '.mode // "link"' "$MANIFEST")
fi

[ -n "$mode" ] || mode="link"
case "$mode" in link|vendor) ;; *) echo "error: --mode must be link or vendor" >&2 ; exit 2 ;; esac

# "core-only" is the manifest sentinel for no pack — not a directory under packs/.
[ "$pack" = "core-only" ] && pack=""

PACK_DIR=""
if [ -n "$pack" ]; then
  PACK_DIR="$HARNESS_DIR/packs/$pack"
  [ -d "$PACK_DIR" ] || { echo "error: unknown pack: $pack (looked in $HARNESS_DIR/packs/)" >&2 ; exit 2 ; }
fi

TARGET="$repo/.claude"
mkdir -p "$TARGET/hooks" "$TARGET/commands" "$TARGET/skills" "$TARGET/agents"

# Place one file into the repo, honouring the install mode.
place() {
  src="$1" ; dest="$2"
  if [ "$mode" = "link" ]; then
    ln -sfn "$src" "$dest"
  else
    rm -rf "$dest" ; cp -R "$src" "$dest"
  fi
}

# Wire every entry of a harness subdir (core first, then pack overlays on top).
wire_dir() {
  subdir="$1"
  for base in "$CORE/$subdir" "${PACK_DIR:+$PACK_DIR/$subdir}"; do
    [ -n "$base" ] && [ -d "$base" ] || continue
    for f in "$base"/*; do
      [ -e "$f" ] || continue
      place "$f" "$TARGET/$subdir/$(basename "$f")"
    done
  done
}

wire_dir hooks
wire_dir commands
wire_dir skills
wire_dir agents

# settings.json — fold the effective harness settings (core, overlaid with pack) into the
# project's. First arg to merge() wins on scalars; permission arrays union; hooks concatenate
# per event and dedup (idempotent).
JQ_MERGE='
  def uniq: reduce .[] as $x ([]; if any(.[]; . == $x) then . else . + [$x] end);
  def merge($a; $b):
    ($b * $a)
    | .permissions.allow = ((($a.permissions.allow // []) + ($b.permissions.allow // [])) | uniq)
    | .permissions.deny  = ((($a.permissions.deny  // []) + ($b.permissions.deny  // [])) | uniq)
    | .hooks = (
        ((($a.hooks // {}) | keys) + (($b.hooks // {}) | keys) | unique)
        | map({ key: ., value: (((($a.hooks[.]) // []) + (($b.hooks[.]) // [])) | uniq) })
        | from_entries
      );
'

base_settings="$CORE/settings.json"
proj_settings="$TARGET/settings.json"
pack_settings=""
[ -n "$PACK_DIR" ] && [ -f "$PACK_DIR/settings.json" ] && pack_settings="$PACK_DIR/settings.json"

# Effective harness settings = core, with the pack overlaid on top.
if [ -n "$pack_settings" ]; then
  effective=$(jq -s "$JQ_MERGE"' merge(.[0]; .[1])' "$base_settings" "$pack_settings")
else
  effective=$(cat "$base_settings")
fi

if [ ! -f "$proj_settings" ]; then
  printf '%s\n' "$effective" > "$proj_settings"
  echo "settings.json: created from harness (${pack:-core-only})"
else
  merged=$(printf '%s' "$effective" | jq -s "$JQ_MERGE"' merge(.[0]; .[1])' "$proj_settings" -) \
    || { echo "warn: settings merge failed; left project settings untouched" >&2 ; merged="" ; }
  if [ -n "$merged" ]; then
    printf '%s\n' "$merged" > "$proj_settings"
    echo "settings.json: merged harness (${pack:-core-only}); existing entries preserved"
  fi
fi

# Seed AGENTS.md / PROGRESS.md only when absent.
seed() {
  tmpl="$1" ; out="$2"
  [ -f "$out" ] && { echo "$(basename "$out"): kept existing"; return; }
  sed -e "s/{{PROJECT_NAME}}/$(basename "$repo")/g" -e "s/{{DATE}}/$(date +%Y-%m-%d)/g" "$tmpl" > "$out"
  echo "$(basename "$out"): seeded from template"
}
[ -f "$TEMPLATE_DIR/AGENTS.md.tmpl" ]   && seed "$TEMPLATE_DIR/AGENTS.md.tmpl"   "$repo/AGENTS.md"
[ -f "$TEMPLATE_DIR/PROGRESS.md.tmpl" ] && seed "$TEMPLATE_DIR/PROGRESS.md.tmpl" "$repo/PROGRESS.md"

# Manifest — record what was installed so `--update` can refresh it later. Version is the
# agent-pipx commit the harness was installed from (falls back to a date when not a checkout).
harness_version=$(git -C "$HARNESS_DIR" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d)
jq -n --arg mode "$mode" --arg pack "${pack:-core-only}" \
      --arg version "$harness_version" --arg at "$(date +%Y-%m-%dT%H:%M:%S%z)" \
      --arg source "$HARNESS_DIR" \
  '{mode: $mode, pack: $pack, harness_version: $version, installed_at: $at, source: $source}' \
  > "$MANIFEST"

echo
echo "Harness installed → $TARGET"
echo "  mode: $mode    pack: ${pack:-core-only}    version: $harness_version"
echo "  hooks: $(ls -1 "$TARGET/hooks" 2>/dev/null | paste -sd' ' -)"
echo "  manifest: ${MANIFEST#$repo/}"
