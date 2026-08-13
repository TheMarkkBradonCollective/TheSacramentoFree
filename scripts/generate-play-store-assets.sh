#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OUT_DIR="$ROOT_DIR/play-store-assets"
LOGO="$ROOT_DIR/public/Logo.jpeg"
BRAND_BG="0x0b0b0c"

mkdir -p "$OUT_DIR"

if [[ ! -f "$LOGO" ]]; then
  echo "Missing logo at $LOGO"
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to generate Play Store graphics."
  exit 1
fi

# Google Play: 512×512 app icon (32-bit PNG).
ffmpeg -y -loglevel error -i "$LOGO" \
  -frames:v 1 \
  -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=${BRAND_BG}" \
  "$OUT_DIR/icon-512.png"

# Google Play: 1024×500 feature graphic.
ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=${BRAND_BG}:s=1024x500" \
  -i "$LOGO" \
  -frames:v 1 \
  -filter_complex '[1:v]scale=420:-1[logo];[0:v][logo]overlay=(W-w)/2:(H-h)/2' \
  "$OUT_DIR/feature-graphic-1024x500.png"

echo "Play Store assets written to play-store-assets/"
ls -lh "$OUT_DIR"/icon-512.png "$OUT_DIR"/feature-graphic-1024x500.png
