#!/usr/bin/env bash
set -euo pipefail

SDK_ROOT="${ANDROID_HOME:-$HOME/Android/Sdk}"
mkdir -p "$SDK_ROOT/cmdline-tools"

if ! command -v sdkmanager >/dev/null 2>&1; then
  TMP_DIR="$(mktemp -d)"
  curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o "$TMP_DIR/cmdline-tools.zip"
  unzip -q "$TMP_DIR/cmdline-tools.zip" -d "$TMP_DIR"
  rm -rf "$SDK_ROOT/cmdline-tools/latest"
  mkdir -p "$SDK_ROOT/cmdline-tools/latest"
  mv "$TMP_DIR/cmdline-tools"/* "$SDK_ROOT/cmdline-tools/latest/"
  rm -rf "$TMP_DIR"
fi

export ANDROID_HOME="$SDK_ROOT"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

yes | sdkmanager --licenses >/dev/null || true
sdkmanager \
  "platform-tools" \
  "platforms;android-35" \
  "platforms;android-36" \
  "build-tools;35.0.0" \
  "build-tools;36.0.0"

echo "Android SDK installed at $ANDROID_HOME"
