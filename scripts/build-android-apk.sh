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

# APKs and AABs in public/ get copied into dist/ and then nested inside the next APK.
# Stage them out before the web build, then restore only the fresh build at the end.
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
if compgen -G "public/downloads/*.zip" > /dev/null; then
  mv public/downloads/*.zip "$APK_STAGING_DIR/"
fi
if compgen -G "public/buynothing*.apk" > /dev/null; then
  mv public/buynothing*.apk "$APK_STAGING_DIR/"
fi
rm -rf dist/downloads

npm run build:android
node scripts/generate-android-assets.mjs
node scripts/sync-android-version.mjs
npx cap sync android

BUILD_TYPE="${1:-release}"
GRADLE_TASK="assembleRelease"
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [[ "$BUILD_TYPE" == "debug" ]]; then
  GRADLE_TASK="assembleDebug"
  APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
fi

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
./gradlew "$GRADLE_TASK"
cd ..

mkdir -p dist/android public/downloads
cp "$APK_PATH" "dist/android/sac-buy-nothing-${BUILD_TYPE}.apk"
# Keep manifest in sync before copy so fileName is current.
node scripts/sync-android-version.mjs
VERSIONED_FILE="$(node -e "const m=require('./public/android-version.json'); process.stdout.write(m.fileName)")"
VERSION_NAME="$(node -e "const m=require('./public/android-version.json'); process.stdout.write(m.versionName)")"
cp "$APK_PATH" "public/downloads/${VERSIONED_FILE}"
# Legacy URL — always points at the latest build too.
cp "$APK_PATH" "public/downloads/sac-buy-nothing.apk"
node scripts/sync-android-version.mjs
if compgen -G "$APK_STAGING_DIR/*.apk" > /dev/null; then
  for staged in "$APK_STAGING_DIR"/*.apk; do
    base="$(basename "$staged")"
    if [[ "$base" == "$VERSIONED_FILE" || "$base" == "sac-buy-nothing.apk" ]]; then
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
    if [[ "$base" == "$CURRENT_AAB" || "$base" == "sac-buy-nothing.aab" ]]; then
      continue
    fi
    mv "$staged" public/downloads/
  done
fi
# Keep the current AAB (built separately) when this script only rebuilds APK.
for keep_aab in "$CURRENT_AAB" "sac-buy-nothing.aab"; do
  if [[ -f "$APK_STAGING_DIR/$keep_aab" ]]; then
    mv "$APK_STAGING_DIR/$keep_aab" public/downloads/
  fi
done
if compgen -G "$APK_STAGING_DIR/*.zip" > /dev/null; then
  mv "$APK_STAGING_DIR"/*.zip public/downloads/
fi
rm -rf "$APK_STAGING_DIR"
# MBC App Market (Findr pattern): root-level slug APK + versioned copy — after restore.
cp "$APK_PATH" "public/buynothing.apk"
cp "$APK_PATH" "public/buynothing-v${VERSION_NAME}.apk"

echo "APK ready: dist/android/sac-buy-nothing-${BUILD_TYPE}.apk"
echo "Public download: public/downloads/${VERSIONED_FILE}"
echo "Legacy alias: public/downloads/sac-buy-nothing.apk"
echo "MBC App Market: public/buynothing.apk (and buynothing-v${VERSION_NAME}.apk)"
ls -lh "public/downloads/${VERSIONED_FILE}" "public/downloads/sac-buy-nothing.apk" "public/buynothing.apk"
