# Google Play store graphics

Upload these from a computer (or Files app) into **Play Console → Store presence → Main store listing**.

These screenshots are captured from a local demo build (`VITE_PLAY_STORE_DEMO=1`) that uses **fictional neighbors, listings, and messages**. They do not contain live member names, photos, or posts.

## Store icon (required)

- `play-store-assets/icon-512.png`
- or `play-store-assets/screenshots/00-app-icon-512.png` (same file)

512×512 **32-bit PNG** (Play rejects 24-bit RGB). Generated from `public/TheSacramentoFree.png` — the same masthead lockup as the website. The lockup is scaled down and centered with newsprint padding so Play’s circular mask does not clip the wordmark.

## Phone screenshots (required, 2–8)

All files are **1080×1920**, 24-bit PNG (Play phone size). Upload in this order:

| Order | File | Screen |
|-------|------|--------|
| 1 | `01-home.png` | Public newspaper home — The Sacramento Free |
| 2 | `02-feed.png` | Feed — neighbor social posts (support, jobs, check-ins — not Stuff listings) |
| 3 | `03-stuff.png` | Stuff — giveaways and requests |
| 4 | `04-listing.png` | Listing details |
| 5 | `05-map.png` | Neighborhood map |
| 6 | `06-events.png` | Free community events |
| 7 | `07-event.png` | Event details |
| 8 | `08-messages.png` | Messages |

Upload order matches the app footer: Feed → Stuff → Map → Events → Chat. Listing sits after Stuff; event detail sits after Events.

Director download (after deploy): Staff panel / Account overview → Play Console — each file downloads individually, or use **Download all as zip**. Files live at `public/downloads/play-store/` and `public/downloads/play-store-screenshots.zip`.

## Facebook ad pack

Video ad (live demo-app footage) plus the two still posters:

```bash
npm run facebook:promo
```

See `facebook-promo-assets/README.md`. Zip: `public/downloads/facebook-promo.zip`.

## Feature graphic (required)

- `play-store-assets/feature-graphic-1024x500.png`
- or `play-store-assets/screenshots/00-feature-graphic-1024x500.png` (same file)

1024×500 PNG. Used at the top of the Play Store listing.

## Regenerate

```bash
npm run android:play-assets        # icon + feature graphic
npm run android:play-screenshots   # phone screenshots from fictional demo data
npm run android:play-screenshots-zip  # zip for the director download button
```
