# Facebook ad pack

A **30-second community video ad** that follows one neighbor giving away a lamp on TheSacramentoFree — plus the **same phone screenshots** as Google Play Console (1080×1920, fictional demo neighbors).

## What to post

1. **`ad-portrait.mp4`** — 30-second Facebook feed ad, 1080×1350 (4:5)
2. Caption from `POST-COPY.txt`
3. Optional: `ad-square.mp4` for a 1:1 post
4. Optional photos: `01-home.png` … `16-goget-arrived.png` — identical to Play Console

## Download (after deploy)

- Zip: [https://www.sacramentobuynothing.com/downloads/facebook-promo.zip](https://www.sacramentobuynothing.com/downloads/facebook-promo.zip)
- Staff panel → Account overview → **Facebook promo**

## Regenerate

```bash
npm run android:play-screenshots   # refresh Play/Facebook screenshots
npm run facebook:promo             # rebuild the 30s video ad + zip
```
