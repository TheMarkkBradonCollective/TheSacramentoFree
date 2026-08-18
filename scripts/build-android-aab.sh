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

# APKs in public/ get copied into dist/ and then nested inside the next AAB.
APK_STAGING_DIR="$(mktemp -d)"
if compgen -G "public/downloads/*.apk" > /dev/null; then
  mv public/downloads/*.apk "$APK_STAGING_DIR/"
fi
if compgen -G "public/buynothing*.apk" > /dev/null; then
  mv public/buynothing*.apk "$APK_STAGING_DIR/"
fi
rm -rf dist/downloads

npm run build:android
node scripts/generate-android-assets.mjs
node scripts/sync-android-version.mjs
npx cap sync android

bash scripts/setup-android-keystore.sh

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
./gradlew bundleRelease
cd ..

AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
mkdir -p dist/android
cp "$AAB_PATH" "dist/android/sac-buy-nothing-release.aab"
VERSIONED_AAB="dist/android/sac-buy-nothing-beta-v${VERSION_NAME}.${BUILD}.aab"
cp "$AAB_PATH" "$VERSIONED_AAB"
if compgen -G "$APK_STAGING_DIR/*.apk" > /dev/null; then
  mkdir -p public/downloads
  mv "$APK_STAGING_DIR"/*.apk public/downloads/ 2>/dev/null || true
  for f in public/downloads/buynothing*.apk; do
    [[ -f "$f" ]] && mv "$f" public/ 2>/dev/null || true
  done
fi
rm -rf "$APK_STAGING_DIR"

echo "AAB ready for Google Play: dist/android/sac-buy-nothing-release.aab"
echo "Versioned copy: $VERSIONED_AAB"
echo "Release notes: play-store-assets/release-notes-v${VERSION_NAME}-${BUILD}.txt"
ls -lh "dist/android/sac-buy-nothing-release.aab" "$VERSIONED_AAB"
