#!/usr/bin/env bash
# /runit — full release pipeline: merge open PRs, SQL sync, website, APK, AAB, commit, deploy.
# Usage: npm run runit [-- --dry-run] [-- --skip-merge] [-- --skip-build] [-- --skip-pr-merge]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN=false
SKIP_MERGE=false
SKIP_BUILD=false
SKIP_PR_MERGE=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --skip-merge) SKIP_MERGE=true ;;
    --skip-build) SKIP_BUILD=true ;;
    --skip-pr-merge) SKIP_PR_MERGE=true ;;
  esac
done

run() {
  if [[ "$DRY_RUN" == true ]]; then
    echo "[dry-run] $*"
  else
    echo "→ $*"
    "$@"
  fi
}

echo "═══════════════════════════════════════════════════════════════"
echo "  /runit — Sacramento Buy Nothing full release"
echo "═══════════════════════════════════════════════════════════════"
[[ "$DRY_RUN" == true ]] && echo "(dry-run — no builds, commits, or merges)"

# ── 0. Merge all open PRs into main ─────────────────────────────
echo ""
echo "── Step 0: Merge all open PRs into main ──"
if [[ "$SKIP_PR_MERGE" == true ]]; then
  echo "  (skipped — --skip-pr-merge)"
elif [[ "$DRY_RUN" == true ]]; then
  bash scripts/runit-merge-open-prs.sh --dry-run
else
  bash scripts/runit-merge-open-prs.sh
  git checkout main
  git pull origin main
fi

# ── 1. Pre-flight ───────────────────────────────────────────────
echo ""
echo "── Step 1: Pre-flight checks ──"
run npm run lint
node scripts/runit-check.mjs

VERSION_NAME="$(node -e "const {readAppVersion}=require('./scripts/read-app-version.mjs'); process.stdout.write(readAppVersion().versionName)")"
VERSION_CODE="$(node -e "const {readAppVersion}=require('./scripts/read-app-version.mjs'); process.stdout.write(String(readAppVersion().versionCode))")"
BUILD="$(printf '%04d' "$VERSION_CODE")"
AAB_FILE="sac-buy-nothing-beta-v${VERSION_NAME}.${BUILD}.aab"
APK_FILE="sac-buy-nothing-beta-v${VERSION_NAME}.${BUILD}.apk"
RELEASE_NAME="${VERSION_NAME} (${VERSION_CODE})"
RELEASE_NOTES="play-store-assets/release-notes-v${VERSION_NAME}-${BUILD}.txt"
AAB_URL="https://www.sacramentobuynothing.com/downloads/${AAB_FILE}"
APK_URL="https://www.sacramentobuynothing.com/downloads/${APK_FILE}"

# ── 2. complete-schema.sql must include all migration markers ───
echo ""
echo "── Step 2: Verify complete-schema.sql ──"
echo "  If runit-check reported blocking errors, merge pending scripts/supabase-migration-*.sql"
echo "  into complete-schema.sql before continuing."
echo "  Production DB: run incremental migrations in Supabase SQL editor (not full re-paste)."

# ── 3. Website build ───────────────────────────────────────────
echo ""
echo "── Step 3: Website build ──"
if [[ "$SKIP_BUILD" == false ]]; then
  run npm run build
else
  echo "  (skipped — --skip-build)"
fi

# ── 4. Android AAB (Play Store) ─────────────────────────────────
echo ""
echo "── Step 4: Android AAB (Google Play upload) ──"
if [[ "$SKIP_BUILD" == false ]]; then
  run npm run android:aab
else
  echo "  (skipped — --skip-build)"
fi

# ── 5. Android APK (sideload / download page) ───────────────────
echo ""
echo "── Step 5: Android APK (public download) ──"
if [[ "$SKIP_BUILD" == false ]]; then
  run npm run android:apk
else
  echo "  (skipped — --skip-build)"
fi

# ── 6. Sync release manifest ────────────────────────────────────
echo ""
echo "── Step 6: Update play-store-assets/current-release.json ──"
if [[ "$DRY_RUN" == false ]]; then
  node -e "
const fs = require('fs');
const { readAppVersion } = require('./scripts/read-app-version.mjs');
const { versionName, versionCode, build } = readAppVersion();
const manifest = {
  versionName,
  versionCode,
  betaLabel: \`beta v\${versionName}.\${build}\`,
  releaseName: \`\${versionName} (\${versionCode})\`,
  aabFile: \`public/downloads/sac-buy-nothing-beta-v\${versionName}.\${build}.aab\`,
  aabLegacyFile: 'public/downloads/sac-buy-nothing.aab',
  aabDownloadUrl: \`https://www.sacramentobuynothing.com/downloads/sac-buy-nothing-beta-v\${versionName}.\${build}.aab\`,
  releaseNotesFile: \`play-store-assets/release-notes-v\${versionName}-\${build}.txt\`,
  sideloadApk: \`public/downloads/sac-buy-nothing-beta-v\${versionName}.\${build}.apk\`,
  builtAt: new Date().toISOString(),
};
fs.writeFileSync('play-store-assets/current-release.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Updated play-store-assets/current-release.json');
"
else
  echo "[dry-run] would update play-store-assets/current-release.json"
fi

# ── 7. Manual checklist reminders ───────────────────────────────
echo ""
echo "── Step 7: Manual checklist (agent must verify) ──"
echo "  □ Bump versionCode/versionName in android/app/build.gradle (if new release)"
echo "  □ Merge any new scripts/supabase-migration-*.sql into complete-schema.sql"
echo "  □ Run incremental migrations in Supabase SQL editor"
echo "  □ Add/update ${RELEASE_NOTES}"
echo "  □ Add APK seed entry in shared/changelogSeed.ts (id: $(date +%Y-%m-%d)_apk-${BUILD})"
echo "  □ Deploy website (Vercel auto-deploys on push to main)"

# ── 8. Commit & push ────────────────────────────────────────────
echo ""
echo "── Step 8: Commit release artifacts ──"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$DRY_RUN" == false ]]; then
  git add \
    complete-schema.sql \
    public/android-version.json \
    public/downloads/ \
    public/buynothing*.apk \
    dist/ \
    play-store-assets/current-release.json \
    play-store-assets/play-console-paste.txt \
    play-store-assets/release-notes-*.txt \
    shared/changelogSeed.ts \
    android/app/build.gradle 2>/dev/null || true
  if git diff --cached --quiet; then
    echo "  No staged changes to commit."
  else
    git commit -m "Release ${RELEASE_NAME}: website, APK, AAB, SQL"
    git push -u origin "$BRANCH"
  fi
else
  echo "[dry-run] would git add + commit + push on branch $BRANCH"
fi

# ── 9. Merge to main ────────────────────────────────────────────
echo ""
echo "── Step 9: Merge to main ──"
if [[ "$SKIP_MERGE" == true ]]; then
  echo "  (skipped — --skip-merge)"
elif [[ "$BRANCH" == "main" ]]; then
  echo "  Already on main — Vercel deploys on push."
elif [[ "$DRY_RUN" == false ]]; then
  git fetch origin main
  git checkout main
  git pull origin main
  git merge --no-ff "$BRANCH" -m "Merge ${BRANCH}: release ${RELEASE_NAME}"
  git push origin main
  echo "  Merged $BRANCH → main and pushed."
else
  echo "[dry-run] would merge $BRANCH → main and push"
fi

# ── 10. Play Console summary ────────────────────────────────────
echo ""
node scripts/runit-play-console-summary.mjs --write

# ── 11. Supabase reminder ───────────────────────────────────────
echo ""
echo "Supabase SQL:"
echo "  Run any new scripts/supabase-migration-*.sql in SQL editor"
echo "  (or wait for cron /api/cron/publish-changelog every 4h for neighbor Updates/News)"
echo ""
echo "Done."
