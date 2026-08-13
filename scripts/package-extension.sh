#!/usr/bin/env bash
# Package only the Chrome extension for Chrome Web Store upload.
# The zip root MUST contain manifest.json (not the whole monorepo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT="$ROOT/extension"
OUT_DIR="$ROOT/dist"
VERSION="$(python3 -c "import json; print(json.load(open('$EXT/manifest.json'))['version'])")"
OUT_ZIP="$OUT_DIR/forge-design-extension-v${VERSION}.zip"

if [[ ! -f "$EXT/manifest.json" ]]; then
  echo "error: missing $EXT/manifest.json" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
rm -f "$OUT_ZIP"

# Zip contents of extension/ so manifest.json is at the zip root.
(
  cd "$EXT"
  zip -r "$OUT_ZIP" . \
    -x "*.DS_Store" \
    -x "**/.DS_Store" \
    -x "*/.git/*"
)

echo "Created: $OUT_ZIP"
echo "Size:    $(du -h "$OUT_ZIP" | awk '{print $1}')"
echo
echo "Zip root (must include manifest.json):"
unzip -l "$OUT_ZIP" | head -30
echo
echo "Upload this file to Chrome Web Store — not the whole repo."
