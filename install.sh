#!/usr/bin/env bash
# Install and start the local Forge Design bridge.
# The Chrome extension is only the UI. This service talks to local Grok.
set -euo pipefail

REPO="https://github.com/forge-ui/forge-design-extension"
LABEL="com.forge-ui.forge-design-bridge"
PORT="${BRIDGE_PORT:-3847}"
HOME_DIR="${HOME:?}"
INSTALL_ROOT="${FORGE_DESIGN_HOME:-$HOME_DIR/.forge-design}"
PLIST="$HOME_DIR/Library/LaunchAgents/${LABEL}.plist"

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: missing $1" >&2
    echo "Install Node.js and the Grok CLI first, then run this again." >&2
    exit 1
  fi
}

need node
need npm

if ! command -v grok >/dev/null 2>&1 && [ ! -x "$HOME_DIR/.grok/bin/grok" ]; then
  echo "warning: grok CLI not found. Install Grok first, or the side panel cannot chat." >&2
fi

if [ -f "$script_dir/server/server.js" ]; then
  app_dir="$script_dir"
else
  app_dir="$INSTALL_ROOT/src"
  mkdir -p "$INSTALL_ROOT"
  if [ -d "$app_dir/.git" ]; then
    git -C "$app_dir" pull --ff-only
  else
    if command -v git >/dev/null 2>&1; then
      git clone --depth 1 "$REPO.git" "$app_dir"
    else
      curl -fsSL "$REPO/archive/refs/heads/main.tar.gz" | tar -xz -C "$INSTALL_ROOT"
      rm -rf "$app_dir"
      mv "$INSTALL_ROOT/forge-design-extension-main" "$app_dir"
    fi
  fi
fi

(
  cd "$app_dir/server"
  npm install --omit=dev
)

node_bin="$(command -v node)"
log_dir="$INSTALL_ROOT/logs"
mkdir -p "$log_dir"

if [ "$(uname -s)" = "Darwin" ]; then
  mkdir -p "$HOME_DIR/Library/LaunchAgents"
  launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>WorkingDirectory</key>
  <string>${app_dir}/server</string>
  <key>ProgramArguments</key>
  <array>
    <string>${node_bin}</string>
    <string>${app_dir}/server/server.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${HOME_DIR}/.grok/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    <key>HOME</key>
    <string>${HOME_DIR}</string>
    <key>BRIDGE_PORT</key>
    <string>${PORT}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>${log_dir}/bridge.out.log</string>
  <key>StandardErrorPath</key>
  <string>${log_dir}/bridge.err.log</string>
</dict>
</plist>
EOF
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  launchctl enable "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
  launchctl kickstart -k "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
else
  mkdir -p "$INSTALL_ROOT"
  nohup "$node_bin" "$app_dir/server/server.js" >"$log_dir/bridge.out.log" 2>"$log_dir/bridge.err.log" &
fi

ok=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 0.4
done

echo
if [ "$ok" -eq 1 ]; then
  echo "Forge Design bridge is running at http://127.0.0.1:${PORT}"
  echo "Open the Chrome extension side panel. It will connect by itself."
else
  echo "error: bridge did not become healthy on port ${PORT}" >&2
  echo "logs: $log_dir" >&2
  exit 1
fi
