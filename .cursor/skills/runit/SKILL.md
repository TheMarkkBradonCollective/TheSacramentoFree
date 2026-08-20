---
name: runit
description: Full release pipeline for Sacramento Buy Nothing — sync complete-schema.sql, build website, APK, AAB, commit, deploy, and merge to main. Use when the user says /runit or asks for a full release.
---

# /runit — Full Release Pipeline

Runs the complete Sacramento Buy Nothing release: SQL verification, website build, APK + AAB, commit artifacts, push, merge to main, and print Google Play Console instructions.

**Do not run unless the user explicitly asks.** When creating or documenting the command, use `--dry-run` to validate without building.

## Quick start

```bash
npm run runit              # full release
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
| 1 | `npm run lint` + `node scripts/runit-check.mjs` |
| 2 | Verify `complete-schema.sql` includes all migration markers |
| 3 | `npm run build` (website → `dist/`) |
| 4 | `npm run android:aab` (Play Store bundle) |
| 5 | `npm run android:apk` (sideload APK) |
| 6 | Update `play-store-assets/current-release.json` |
| 7 | Remind agent to verify release notes + changelog seed |
| 8 | Commit binaries + manifests, push branch |
| 9 | Merge branch → `main`, push (triggers Vercel deploy) |
| 10 | Print AAB public URL + Play Console copy-paste block |

## Flags

| Flag | Effect |
|------|--------|
| `--dry-run` | Log steps without building, committing, or merging |
| `--skip-build` | Skip website/APK/AAB builds (commit/deploy only) |
| `--skip-merge` | Commit and push branch but do not merge to main |

## Output the user needs

After a successful run, always show:

### Public AAB download

```
https://www.sacramentobuynothing.com/downloads/sac-buy-nothing-beta-v{versionName}.{build}.aab
```

### Google Play Console

| Field | Value |
|-------|-------|
| Package | `org.sacramentobuynothing.app` |
| Upload file | `public/downloads/sac-buy-nothing-beta-v{versionName}.{build}.aab` |
| Release name | `{versionName} ({versionCode})` |
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
3. Ask user to confirm before running full `npm run runit` (large binaries, merge to main).
4. After run, paste the Play Console summary from script output.
5. Remind user to run Supabase incremental migrations if any are new.
