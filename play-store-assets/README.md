# Google Play store graphics

Upload these from a computer (or Files app) into **Play Console → Store presence → Main store listing**.

## App icon (required)

- `play-store-assets/icon-512.png`
- or `play-store-assets/screenshots/00-app-icon-512.png` (same file)

512×512 PNG, no transparency.

## Phone screenshots (required, 2–8)

All files are **1080×1920**, 24-bit PNG (Play phone size). Upload in this order:

| Order | File | Screen |
|-------|------|--------|
| 1 | `01-home.png` | Public home — Give freely / Ask kindly |
| 2 | `02-feed.png` | Community Stuff feed |
| 3 | `03-events.png` | Free community events |
| 4 | `04-map.png` | Neighborhood map |
| 5 | `05-messages.png` | Messages |
| 6 | `06-account.png` | Account / profile |

## Feature graphic (required)

`play-store-assets/feature-graphic-1024x500.png` — 1024×500 PNG.

## Regenerate

```bash
npm run android:play-assets   # icon + feature graphic
PLAY_REVIEW_PASSWORD='…' node scripts/capture-play-store-screenshots.mjs
```
