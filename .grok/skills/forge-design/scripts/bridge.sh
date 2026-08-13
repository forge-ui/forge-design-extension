#!/bin/sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
skill_dir="$(CDPATH= cd -- "$script_dir/.." && pwd)"

resolve_bridge_home() {
  if [ -n "${FORGE_DESIGN_HOME:-}" ] && [ -f "${FORGE_DESIGN_HOME}/server/cli.js" ]; then
    printf '%s\n' "$FORGE_DESIGN_HOME"
    return 0
  fi

  repo_root="$(CDPATH= cd -- "$script_dir/../../../.." && pwd)"
  if [ -f "$repo_root/server/cli.js" ]; then
    printf '%s\n' "$repo_root"
    return 0
  fi

  if [ -f "$skill_dir/.bridge-home" ]; then
    home="$(tr -d '\r\n' < "$skill_dir/.bridge-home")"
    if [ -n "$home" ] && [ -f "$home/server/cli.js" ]; then
      printf '%s\n' "$home"
      return 0
    fi
  fi

  return 1
}

if ! bridge_home="$(resolve_bridge_home)"; then
  echo "forge-design: could not find the repository root." >&2
  echo "Set FORGE_DESIGN_HOME, or run ./install-skill.sh from the repo." >&2
  exit 1
fi

cli="$bridge_home/server/cli.js"

if [ ! -f "$cli" ]; then
  echo "forge-design CLI not found at: $cli" >&2
  echo "Set FORGE_DESIGN_HOME to the repository root." >&2
  exit 1
fi

exec node "$cli" "$@"
