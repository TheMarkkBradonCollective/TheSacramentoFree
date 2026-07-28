# Sacramento Buy Nothing

A community gifting PWA for Sacramento neighbors. Post free items, browse a local feed and map, coordinate pickup in chat, RSVP to events, and get push notifications — no money, no ads.

**Live site:** [sacramentobuynothing.com](https://sacramentobuynothing.com) · **Android APK:** [sacramentobuynothing.com/download](https://sacramentobuynothing.com/download)

**Stack:** React 19, Vite, Tailwind CSS v4, Supabase (auth + Postgres + realtime), Vercel serverless push API.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Set at minimum:
   - `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

   For push notifications in dev, also set `VAPID_*` keys and `SUPABASE_SERVICE_ROLE_KEY`.

3. Start the frontend:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000

4. **Optional — full stack with push API:**

   ```bash
   npm run dev:full
   ```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server (port 3000) |
| `npm run dev:full` | Vite + local Express push API |
| `npm run build` | Production build → `dist/` |
| `npm run build:android` | Production web build for Capacitor |
| `npm run android:apk:debug` | Build a sideloadable debug APK → `dist/android/` |
| `npm run cap:sync` | Copy web build into the Android project |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript typecheck |
| `npm run start` | Serve built app + API (production) |

## Android APK

The app can be packaged as a downloadable Android APK with Capacitor. See [docs/android-apk.md](docs/android-apk.md) for Firebase setup, build commands, and Play Store notes.

Quick start:

```bash
bash scripts/setup-android-sdk.sh
export ANDROID_HOME="$HOME/Android/Sdk"
cp android/app/google-services.json.example android/app/google-services.json  # then replace with real Firebase file
npm run android:apk:debug
```

## Deploy

Deployed on Vercel. Set all variables from `.env.example` in Vercel project settings (Production + Preview), then redeploy after changes.

Database schema lives in `complete-schema.sql` at the repo root. Paste the entire file into the Supabase SQL editor and run it when setting up a new project or after schema changes — it is safe to re-run and keeps the whole site intact.

## Project layout

- `src/` — React app (public marketing site + authenticated community UI)
- `api/` — Vercel serverless routes (push, webhooks, cron)
- `server/` — Local Express push API for development
- `public/` — PWA manifest, service worker, static assets
