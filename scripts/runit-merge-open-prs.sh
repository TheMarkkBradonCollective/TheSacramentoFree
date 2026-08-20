#!/usr/bin/env bash
# Merge all open PRs targeting main into main before /runit release.
# Usage: bash scripts/runit-merge-open-prs.sh [--dry-run]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN=false
for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required to merge open PRs. Install: https://cli.github.com/"
  exit 1
fi

BASE_BRANCH="${RUNIT_BASE_BRANCH:-main}"

echo "── Merge all open PRs → ${BASE_BRANCH} ──"

mapfile -t PR_LINES < <(gh pr list --state open --base "$BASE_BRANCH" --json number,title,headRefName --jq '.[] | "\(.number)\t\(.headRefName)\t\(.title)"' | sort -n)

if [[ ${#PR_LINES[@]} -eq 0 ]]; then
  echo "  No open PRs targeting ${BASE_BRANCH}."
  exit 0
fi

echo "  Found ${#PR_LINES[@]} open PR(s):"
for line in "${PR_LINES[@]}"; do
  IFS=$'\t' read -r num branch title <<< "$line"
  echo "    #${num}  ${branch}  — ${title}"
done

if [[ "$DRY_RUN" == true ]]; then
  echo "[dry-run] would merge ${#PR_LINES[@]} PR(s) into ${BASE_BRANCH}"
  exit 0
fi

git fetch origin "$BASE_BRANCH"
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH"

FAILED=()
MERGED=()

for line in "${PR_LINES[@]}"; do
  IFS=$'\t' read -r num branch title <<< "$line"
  echo ""
  echo "→ Merging PR #${num}: ${title}"
  if gh pr merge "$num" --merge --delete-branch; then
    MERGED+=("#${num}")
    git pull origin "$BASE_BRANCH"
  else
    FAILED+=("#${num} (${branch})")
    echo "  ✗ Failed to merge PR #${num} — resolve conflicts and re-run /runit"
  fi
done

echo ""
echo "── PR merge summary ──"
echo "  Merged: ${#MERGED[@]}"
for m in "${MERGED[@]}"; do echo "    ✓ $m"; done
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "  Failed: ${#FAILED[@]}"
  for f in "${FAILED[@]}"; do echo "    ✗ $f"; done
  exit 1
fi

echo "  All open PRs merged into ${BASE_BRANCH}."
