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

# Stage all download binaries before web build (they get nested in dist otherwise).
APK_STAGING_DIR="$(mktemp -d)"
CURRENT_APK="$(node -e "const {readAppVersion}=require('./scripts/read-app-version.mjs'); const v=readAppVersion(); process.stdout.write(\`sac-buy-nothing-beta-v\${v.versionName}.\${v.build}.apk\`)")"
CURRENT_AAB="$(node -e "const {readAppVersion}=require('./scripts/read-app-version.mjs'); const v=readAppVersion(); process.stdout.write(\`sac-buy-nothing-beta-v\${v.versionName}.\${v.build}.aab\`)")"
if compgen -G "public/downloads/*.apk" > /dev/null; then
  mv public/downloads/*.apk "$APK_STAGING_DIR/"
fi
if compgen -G "public/downloads/*.aab" > /dev/null; then
  mv public/downloads/*.aab "$APK_STAGING_DIR/"
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
mkdir -p dist/android public/downloads
cp "$AAB_PATH" "dist/android/sac-buy-nothing-release.aab"
node scripts/sync-android-version.mjs
VERSION_NAME="$(node -e "const m=require('./public/android-version.json'); process.stdout.write(m.versionName)")"
VERSION_CODE="$(node -e "const m=require('./public/android-version.json'); process.stdout.write(String(m.versionCode))")"
AAB_FILE="$(node -e "const m=require('./public/android-version.json'); process.stdout.write(m.aabFileName)")"
BUILD="$(printf '%04d' "$VERSION_CODE")"
VERSIONED_AAB="dist/android/sac-buy-nothing-beta-v${VERSION_NAME}.${BUILD}.aab"
cp "$AAB_PATH" "$VERSIONED_AAB"
cp "$AAB_PATH" "public/downloads/${AAB_FILE}"
cp "$AAB_PATH" "public/downloads/sac-buy-nothing.aab"
node scripts/sync-android-version.mjs
if compgen -G "$APK_STAGING_DIR/*.apk" > /dev/null; then
  for staged in "$APK_STAGING_DIR"/*.apk; do
    base="$(basename "$staged")"
    if [[ "$base" == "$CURRENT_APK" || "$base" == "sac-buy-nothing.apk" ]]; then
      continue
    fi
    mv "$staged" public/downloads/
  done
  for f in public/downloads/buynothing*.apk; do
    [[ -f "$f" ]] && mv "$f" public/ 2>/dev/null || true
  done
fi
if compgen -G "$APK_STAGING_DIR/*.aab" > /dev/null; then
  for staged in "$APK_STAGING_DIR"/*.aab; do
    base="$(basename "$staged")"
    if [[ "$base" == "$AAB_FILE" || "$base" == "sac-buy-nothing.aab" ]]; then
      continue
    fi
    mv "$staged" public/downloads/
  done
fi
rm -rf "$APK_STAGING_DIR"

echo "AAB ready for Google Play: dist/android/sac-buy-nothing-release.aab"
echo "Public download: public/downloads/${AAB_FILE}"
echo "Legacy alias: public/downloads/sac-buy-nothing.aab"
echo "Versioned copy: $VERSIONED_AAB"
echo "Release notes: play-store-assets/release-notes-v${VERSION_NAME}-${BUILD}.txt"
ls -lh "dist/android/sac-buy-nothing-release.aab" "public/downloads/${AAB_FILE}" "public/downloads/sac-buy-nothing.aab"
