# Facebook timeline promo

Graphics and short videos for the **TheSacramentoFree Facebook Page / group timeline**. Built from the same fictional Play Store demo screenshots as the website tour — never live member names or photos.

## Download (after deploy)

- Zip: [https://www.sacramentobuynothing.com/downloads/facebook-promo.zip](https://www.sacramentobuynothing.com/downloads/facebook-promo.zip)
- Staff panel → Account overview → **Facebook promo**
- Individual files: `/downloads/facebook/`

## What’s in the pack

| File | Facebook use |
|------|----------------|
| `01-timeline-square-hero.png` | Feed photo 1080×1080 |
| `02-timeline-portrait-hero.png` | Feed photo 1080×1350 (4:5 — recommended) |
| `03-timeline-landscape.png` | Wide post / link-style 1200×630 |
| `04-page-cover.png` | Page cover 1640×624 |
| `05`–`08` | Go Get, feed, and values posts |
| `carousel-01` … `06` | Multi-photo carousel |
| `timeline-portrait-app-tour.mp4` | Feed video 4:5 with screenshot tour |
| `timeline-square-app-tour.mp4` | Feed video 1:1 |
| `POST-COPY.txt` | Captions to paste |
| `phone-screenshots/` (in the zip) | Raw 1080×1920 app captures |

## Regenerate

```bash
npm run android:play-screenshots   # refresh phone screenshots from demo data
npm run facebook:promo             # images + videos + zip
```

Requires `ffmpeg` with libfreetype (drawtext), xfade, and zoompan.
