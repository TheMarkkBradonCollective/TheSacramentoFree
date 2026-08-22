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
| 2 | `02-stuff.png` | Stuff — giveaways and requests (not the social Feed tab) |
| 3 | `03-events.png` | Free community events |
| 4 | `04-map.png` | Neighborhood map |
| 5 | `05-messages.png` | Messages |
| 6 | `06-account.png` | Account / profile |
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
