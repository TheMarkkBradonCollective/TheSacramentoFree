#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OUT_DIR="$ROOT_DIR/play-store-assets"
APP_ICON="$ROOT_DIR/public/app-icon.png"
FEATURE_LOGO="$APP_ICON"

mkdir -p "$OUT_DIR"

if [[ ! -f "$APP_ICON" ]]; then
  echo "Missing app icon at $APP_ICON"
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to generate Play Store graphics."
  exit 1
fi

# Google Play: 512×512 store icon — same green rounded-square as the app and website.
node "$ROOT_DIR/scripts/generate-play-store-icon.mjs" "$APP_ICON" "$OUT_DIR/icon-512.png"

# Google Play: 1024×500 feature graphic (logo + name + tagline).
FONT_BOLD="${PLAY_STORE_FONT_BOLD:-/usr/share/fonts/truetype/macos/Inter-Bold.ttf}"
FONT_SEMI="${PLAY_STORE_FONT_SEMI:-/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf}"
if [[ ! -f "$FONT_BOLD" ]]; then FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; fi
if [[ ! -f "$FONT_SEMI" ]]; then FONT_SEMI="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; fi

FEATURE_BG="0xffffff"

ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=${FEATURE_BG}:s=1024x500" \
  -i "$FEATURE_LOGO" \
  -frames:v 1 \
  -filter_complex "[1:v]scale=360:-1,format=rgba[logo];\
[0:v][logo]overlay=48:(H-h)/2,\
drawtext=fontfile=${FONT_BOLD}:text='The Sacramento Free':fontsize=44:fontcolor=0x0b0b0c:x=448:y=148,\
drawtext=fontfile=${FONT_SEMI}:text='Give freely. Ask kindly.':fontsize=32:fontcolor=0x0a0a0a:x=448:y=214,\
drawtext=fontfile=${FONT_SEMI}:text='No selling  ·  No ads  ·  Sacramento neighbors':fontsize=22:fontcolor=0x52525B:x=448:y=278" \
  "$OUT_DIR/feature-graphic-1024x500.png"

if [[ -d "$OUT_DIR/screenshots" ]]; then
  cp "$OUT_DIR/icon-512.png" "$OUT_DIR/screenshots/00-app-icon-512.png"
  cp "$OUT_DIR/feature-graphic-1024x500.png" "$OUT_DIR/screenshots/00-feature-graphic-1024x500.png"
fi

echo "Play Store assets written to play-store-assets/"
ls -lh "$OUT_DIR"/icon-512.png "$OUT_DIR"/feature-graphic-1024x500.png
