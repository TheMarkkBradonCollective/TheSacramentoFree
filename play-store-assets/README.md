# Google Play store graphics

Upload these from a computer (or Files app) into **Play Console → Store presence → Main store listing**.

These screenshots are captured from a local demo build (`VITE_PLAY_STORE_DEMO=1`) that uses **fictional neighbors, listings, and messages**. They do not contain live member names, photos, or posts.

## App icon (required)

- `play-store-assets/icon-512.png`
- or `play-store-assets/screenshots/00-app-icon-512.png` (same file)

512×512 **32-bit PNG** (Play rejects 24-bit RGB). Fully opaque — no transparency.

## Phone screenshots (required, 2–8)

All files are **1080×1920**, 24-bit PNG (Play phone size). Upload in this order:

| Order | File | Screen |
|-------|------|--------|
| 1 | `01-home.png` | Public newspaper home — The Sacramento Free |
| 2 | `02-feed.png` | Community feed |
| 3 | `03-stuff.png` | Stuff listings |
| 4 | `04-events.png` | Free community events |
| 5 | `05-map.png` | Neighborhood map |
| 6 | `06-messages.png` | Messages |
| 7 | `07-listing.png` | Listing details |
| 8 | `08-event.png` | Event details |

## Feature graphic (required)

- `play-store-assets/feature-graphic-1024x500.png`
- or `play-store-assets/screenshots/00-feature-graphic-1024x500.png` (same file)

1024×500 PNG. Used at the top of the Play Store listing.

## Regenerate

```bash
npm run android:play-assets        # icon + feature graphic
npm run android:play-screenshots   # phone screenshots from fictional demo data
```
