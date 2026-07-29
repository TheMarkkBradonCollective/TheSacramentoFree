#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEYSTORE="$ROOT_DIR/android/app/sac-buynothing-release.keystore"

if [[ -f "$KEYSTORE" ]]; then
  echo "Release keystore already exists at $KEYSTORE"
  exit 0
fi

keytool -genkeypair -v \
  -keystore "$KEYSTORE" \
  -alias sac-buynothing \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass sacbuynothing \
  -keypass sacbuynothing \
  -dname "CN=Sacramento Buy Nothing, OU=Community, O=Sacramento Buy Nothing, L=Sacramento, ST=CA, C=US"

echo "Created release keystore at $KEYSTORE"
