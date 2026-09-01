# Facebook ad pack

A **video ad** for the TheSacramentoFree Facebook Page, plus the two still posters the ad needs. The video is live footage of the demo app (fictional neighbors), not a screenshot slideshow.

## What to post

1. **`ad-portrait.mp4`** — Facebook feed ad, 1080×1350 (4:5)
2. Caption from `POST-COPY.txt`
3. Optional: `ad-square.mp4` if you want a 1:1 post
4. Optional still: `ad-poster-portrait.png` (thumbnail / photo post)

## Download (after deploy)

- Zip: [https://www.sacramentobuynothing.com/downloads/facebook-promo.zip](https://www.sacramentobuynothing.com/downloads/facebook-promo.zip)
- Staff panel → Account overview → **Facebook promo**

## Regenerate

```bash
npm run facebook:promo
```

Records the local demo app (`VITE_PLAY_STORE_DEMO=1`), then cuts intro + live footage + end card.
