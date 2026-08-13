#!/bin/sh
set -eu

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
source_dir="$repo_root/.grok/skills/forge-design"
skills_root="${GROK_SKILLS_DIR:-${GROK_HOME:-$HOME/.grok}/skills}"
target_dir="$skills_root/forge-design"

if [ ! -f "$source_dir/SKILL.md" ]; then
  echo "Skill source not found: $source_dir" >&2
  exit 1
fi

mkdir -p "$skills_root"
if [ -e "$target_dir" ]; then
  echo "Skill already exists: $target_dir" >&2
  echo "Remove or relocate it before reinstalling." >&2
  exit 1
fi

cp -R "$source_dir" "$target_dir"
printf '%s\n' "$repo_root" > "$target_dir/.bridge-home"
chmod +x "$target_dir/scripts/bridge.sh"
echo "Installed forge-design skill at: $target_dir"
