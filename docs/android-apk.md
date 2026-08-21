# Android APK

Sacramento Buy Nothing ships as a Capacitor Android app. The React web app is bundled into the APK and talks to your production Vercel API for push, map routing, and other server routes.

## One-time setup

### 1. Firebase (required for Android push)

1. Create a [Firebase project](https://console.firebase.google.com/).
2. Add an Android app with package name `org.sacramentobuynothing.app`.
3. Download `google-services.json` and place it at `android/app/google-services.json`.
4. In Firebase → Project settings → Service accounts, create a new private key.
5. Set `FIREBASE_SERVICE_ACCOUNT_JSON` in Vercel (and locally for `npm run dev:full`) to the full JSON string.

### 2. Android SDK (local builds)

```bash
bash scripts/setup-android-sdk.sh
export ANDROID_HOME="$HOME/Android/Sdk"
```

### 3. Environment

Set these before building the APK:

```bash
VITE_APP_URL=https://www.sacramentobuynothing.com
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_VAPID_PUBLIC_KEY=...
```

`VITE_APP_URL` must be the **www** production origin (`https://www.sacramentobuynothing.com`), not the apex host. Apex redirects to www; Capacitor WebView API calls must match that host or neighbors see “Failed to fetch.” You can also set `CAPACITOR_SERVER_URL` to the same www URL.

## Build commands

```bash
# Release APK (signed — used for public sideload download)
npm run android:apk

# Debug APK (local testing only — Android may flag as unsafe)
npm run android:apk:debug
```

Output:
- `dist/android/sac-buy-nothing-debug.apk` or `dist/android/sac-buy-nothing-release.apk`
- `public/downloads/sac-buy-nothing.apk` (served publicly at `/downloads/sac-buy-nothing.apk`)
- `public/buynothing.apk` and `public/buynothing-v{version}.apk` (MBC App Market — Findr pattern)

Public downloads use a **signed release** APK (`android/keystore.properties`). Debug builds are for local testing only — Android Play Protect often blocks debug APKs as unsafe.

The Vite production build writes an `apk` block into `/version.json` (ready, version, sha256, download URL) so the MBC App Market can list this app on the next catalog sync.

The first time you run `npm run android:apk`, `scripts/setup-android-keystore.sh` creates the release keystore if needed.

### App icon and splash (branding)

The web app uses `public/Logo.png` (the uploaded Sacramento Free app icon) for favicons, the PWA manifest, and in-app UI. The original upload is also kept as `public/TheSacramentoFree App Logo.png`. The wordmark lockup is `public/TheSacramentoFree.png`. Android launcher icons and splash screens are **native** resources under `android/app/src/main/res/` — they are not picked up automatically from the web bundle.

Regenerate them from the community logo before building an APK:

```bash
npm run android:assets
```

This paints a full-bleed newsprint launcher from `public/Logo.png`, writes mipmaps (no 16.7% adaptive inset), and runs `@capacitor/assets` for splash screens. Requires `ffmpeg`. `npm run android:apk` and `npm run android:apk:debug` run this step automatically.

**Neighbors:** share the in-app download page at [www.sacramentobuynothing.com/download](https://www.sacramentobuynothing.com/download). It compares APK vs home screen installs and shows whether an update is needed.

After building, commit `public/buynothing.apk`, `public/buynothing-v*.apk`, `public/downloads/sac-buy-nothing.apk`, `public/downloads/sac-buy-nothing.aab`, and `public/android-version.json`, then deploy so the live download button and MBC App Market listing work.

## Open in Android Studio

```bash
npm run build:android
npm run cap:sync
npm run cap:open
```

## How push works on Android

- Browser/PWA users keep web push (VAPID + service worker).
- Android APK users register an FCM device token.
- Tokens are stored in `push_subscriptions` with endpoints like `fcm:<token>`.
- The server sends FCM notifications when `FIREBASE_SERVICE_ACCOUNT_JSON` is configured.

## Distribution options

- **Sideload**: Share the signed release APK (`npm run android:apk`) — neighbors use [www.sacramentobuynothing.com/download](https://www.sacramentobuynothing.com/download).
- **Play Store**: Build an AAB with `npm run android:aab` and follow [play-store-upload.md](./play-store-upload.md).

```bash
# Google Play upload bundle (AAB — required by Play Console)
npm run android:aab
# → public/downloads/sac-buy-nothing-beta-v0.1.0.0015.aab (+ sac-buy-nothing.aab)

# Store listing graphics (512 icon + 1024×500 feature graphic)
npm run android:play-assets
# → play-store-assets/
```

## Updating the app

UI changes deploy through `npm run build:android && npm run cap:sync` before rebuilding the APK. For faster iteration you can ship web-only updates by rebuilding the web bundle; native shell changes (plugins, permissions) require a new APK.
