---
name: runit
description: Full release pipeline for Sacramento Buy Nothing — merge all open PRs first, then sync complete-schema.sql, build website, APK, AAB, commit, deploy, and merge to main. Use when the user says /runit or asks for a full release.
---

# /runit — Full Release Pipeline

Runs the complete Sacramento Buy Nothing release: **merge all open PRs into main first**, then SQL verification, website build, APK + AAB, commit artifacts, push, and print Google Play Console instructions.

**Do not run unless the user explicitly asks.** When creating or documenting the command, use `--dry-run` to validate without building.

## Quick start

```bash
npm run runit              # full release (merges open PRs first)
npm run runit:dry          # print steps only, no builds/commits
npm run runit:check        # pre-flight only
```

## Before running

1. **Bump version** in `android/app/build.gradle` (`versionCode` must increase; update `versionName` if needed).
2. **Merge migrations** — any new `scripts/supabase-migration-*.sql` must be folded into `complete-schema.sql`. `npm run runit:check` fails if markers are missing.
3. **Release notes** — add `play-store-assets/release-notes-v{versionName}-{build}.txt` (hyphen before build, e.g. `0028`).
4. **Changelog seed** — add an APK entry in `shared/changelogSeed.ts` with id `{date}_apk-{build}`.
5. **Supabase** — run incremental migration SQL in the Supabase SQL editor (do not re-paste full schema on production).

## What /runit does (in order)

| Step | Action |
|------|--------|
| **0** | **Merge all open PRs into `main`** (`scripts/runit-merge-open-prs.sh` via `gh pr merge`) |
| 1 | `npm run lint` + `node scripts/runit-check.mjs` |
| 2 | Verify `complete-schema.sql` includes all migration markers |
| 3 | `npm run build` (website → `dist/`) |
| 4 | `npm run android:aab` (Play Store bundle) |
| 5 | `npm run android:apk` (sideload APK) |
| 6 | Update `play-store-assets/current-release.json` |
| 7 | Remind agent to verify release notes + changelog seed |
| 8 | Commit binaries + manifests, push branch |
| 9 | Merge branch → `main`, push (triggers Vercel deploy) |
| 10 | Print + save Play Console copy-paste block (`play-store-assets/play-console-paste.txt`) |

## Flags

| Flag | Effect |
|------|--------|
| `--dry-run` | Log steps without building, committing, or merging |
| `--skip-pr-merge` | Skip merging open PRs (start at pre-flight) |
| `--skip-build` | Skip website/APK/AAB builds (commit/deploy only) |
| `--skip-merge` | Commit and push branch but do not merge release branch to main |

## Output the user needs

After a successful run, always show the full block from `node scripts/runit-play-console-summary.mjs` (also saved to `play-store-assets/play-console-paste.txt`).

### Release title (Play Console → Release name)

```
{versionName} ({versionCode})
```

Example: `0.1.0 (29)`

### Public AAB download link

```
https://www.sacramentobuynothing.com/downloads/sac-buy-nothing-beta-v{versionName}.{build}.aab
```

Example: `https://www.sacramentobuynothing.com/downloads/sac-buy-nothing-beta-v0.1.0.0029.aab`

### Google Play Console

| Field | Value |
|-------|-------|
| Release title | `{versionName} ({versionCode})` — paste into **Release name** |
| Package | `org.sacramentobuynothing.app` |
| Upload file | `public/downloads/sac-buy-nothing-beta-v{versionName}.{build}.aab` |
| Public AAB URL | `https://www.sacramentobuynothing.com/downloads/sac-buy-nothing-beta-v{versionName}.{build}.aab` |
| Release notes | `play-store-assets/release-notes-v{versionName}-{build}.txt` |
| Path | Testing → Internal testing → Create release |

Full guide: `docs/play-store-upload.md`

## Known bugs fixed

- `build-android-apk.sh` now restores staged AAB/APK files after build (was deleting them).
- `runit-check.mjs` blocks release if `complete-schema.sql` is missing migration markers.

## Agent workflow

When user says `/runit`:

1. Run `npm run runit:check` first and fix any blocking errors.
2. Confirm version bump and release notes exist.
3. **Merge all open PRs first** — this is Step 0 of the pipeline (or run `bash scripts/runit-merge-open-prs.sh` alone).
4. Ask user to confirm before running full `npm run runit` (merges PRs, large binaries, push to main).
5. After run, paste the full Play Console block from script output (release title, public AAB link, upload path, release notes).
6. Remind user to run Supabase incremental migrations if any are new.
