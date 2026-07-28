#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${VITE_APP_URL:-}" && -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${VITE_APP_URL:-}" ]]; then
  export VITE_APP_URL="${APP_URL:-https://www.sacramentobuynothing.com}"
  echo "Using VITE_APP_URL=${VITE_APP_URL}"
fi

export CAPACITOR_SERVER_URL="${CAPACITOR_SERVER_URL:-$VITE_APP_URL}"
echo "Using CAPACITOR_SERVER_URL=${CAPACITOR_SERVER_URL}"

npm run build:android
node scripts/generate-android-assets.mjs
node scripts/sync-android-version.mjs
npx cap sync android

BUILD_TYPE="${1:-release}"
GRADLE_TASK="assembleRelease"
APK_PATH="android/app/build/outputs/apk/release/app-release-unsigned.apk"

if [[ "$BUILD_TYPE" == "debug" ]]; then
  GRADLE_TASK="assembleDebug"
  APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
fi

if [[ ! -d "${ANDROID_HOME:-}" ]]; then
  if [[ -d "$HOME/Android/Sdk" ]]; then
    export ANDROID_HOME="$HOME/Android/Sdk"
  elif [[ -d "/opt/android-sdk" ]]; then
    export ANDROID_HOME="/opt/android-sdk"
  fi
fi

if [[ -z "${ANDROID_HOME:-}" || ! -d "$ANDROID_HOME" ]]; then
  echo "ANDROID_HOME is not set. Run scripts/setup-android-sdk.sh first."
  exit 1
fi

export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

cd android
./gradlew "$GRADLE_TASK"
cd ..

mkdir -p dist/android public/downloads
cp "$APK_PATH" "dist/android/sac-buy-nothing-${BUILD_TYPE}.apk"
# Public site download — neighbors hit /downloads/sac-buy-nothing.apk (not private GitHub Releases).
cp "$APK_PATH" "public/downloads/sac-buy-nothing.apk"
# Keep manifest in sync after copy (publishedAt refresh).
node scripts/sync-android-version.mjs

echo "APK ready: dist/android/sac-buy-nothing-${BUILD_TYPE}.apk"
echo "Public download: public/downloads/sac-buy-nothing.apk"
ls -lh "public/downloads/sac-buy-nothing.apk"
