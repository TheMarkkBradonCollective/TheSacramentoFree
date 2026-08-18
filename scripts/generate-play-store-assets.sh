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

# Google Play: 1024×500 feature graphic (logo + name + tagline).
FONT_BOLD="${PLAY_STORE_FONT_BOLD:-/usr/share/fonts/truetype/macos/Inter-Bold.ttf}"
FONT_SEMI="${PLAY_STORE_FONT_SEMI:-/usr/share/fonts/truetype/macos/Inter-SemiBold.ttf}"
if [[ ! -f "$FONT_BOLD" ]]; then FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; fi
if [[ ! -f "$FONT_SEMI" ]]; then FONT_SEMI="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; fi

ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=${BRAND_BG}:s=1024x500" \
  -i "$LOGO" \
  -frames:v 1 \
  -filter_complex "[1:v]scale=360:-1,format=rgba[logo];\
[0:v][logo]overlay=48:(H-h)/2,\
drawtext=fontfile=${FONT_BOLD}:text='SacramentoBuyNothing':fontsize=44:fontcolor=white:x=448:y=148,\
drawtext=fontfile=${FONT_SEMI}:text='Give freely. Ask kindly.':fontsize=32:fontcolor=0xFF4500:x=448:y=214,\
drawtext=fontfile=${FONT_SEMI}:text='No selling  ·  No ads  ·  Sacramento neighbors':fontsize=22:fontcolor=0xA1A1AA:x=448:y=278" \
  "$OUT_DIR/feature-graphic-1024x500.png"

echo "Play Store assets written to play-store-assets/"
ls -lh "$OUT_DIR"/icon-512.png "$OUT_DIR"/feature-graphic-1024x500.png
