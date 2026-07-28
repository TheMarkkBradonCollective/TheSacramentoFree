# Android APK

Sacramento Buy Nothing ships as a Capacitor Android app. The React web app is bundled into the APK and talks to your production Vercel API for push, map routing, and other server routes.

## One-time setup

### 1. Firebase (required for Android push)

1. Create a [Firebase project](https://console.firebase.google.com/).
2. Add an Android app with package name `org.sacbuynothing.app`.
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
VITE_APP_URL=https://sacramentobuynothing.com
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_VAPID_PUBLIC_KEY=...
```

`VITE_APP_URL` must point at production so `/api/*` routes work from the installed app.

## Build commands

```bash
# Debug APK (easy to sideload for testing)
npm run android:apk:debug

# Release APK (unsigned — sign before Play Store upload)
npm run android:apk
```

Output:
- `dist/android/sac-buy-nothing-debug.apk` or `dist/android/sac-buy-nothing-release.apk`
- `public/downloads/sac-buy-nothing.apk` (served publicly at `/downloads/sac-buy-nothing.apk`)

`scripts/sync-android-version.mjs` updates `public/android-version.json` so the download page points at the site-hosted APK (not private GitHub Releases).

### App icon and splash (branding)

The web app uses `public/Logo.jpeg` for favicons, the PWA manifest, and in-app UI. Android launcher icons and splash screens are **native** resources under `android/app/src/main/res/` — they are not picked up automatically from the web bundle.

Regenerate them from the community logo before building an APK:

```bash
npm run android:assets
```

This copies `public/Logo.jpeg` into `assets/logo.png` and runs `@capacitor/assets` with the dark brand background (`#0b0b0c`). `npm run android:apk` and `npm run android:apk:debug` run this step automatically.

**Neighbors:** share the in-app download page at [sacramentobuynothing.com/download](https://sacramentobuynothing.com/download). It compares APK vs home screen installs and shows whether an update is needed.

After building, commit `public/downloads/sac-buy-nothing.apk` and `public/android-version.json`, then deploy so the live download button works.

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

- **Sideload**: Share the debug APK directly (enable “Install unknown apps” on the device).
- **Play Store**: Sign the release APK/AAB, create a Play Console listing, and upload.

## Updating the app

UI changes deploy through `npm run build:android && npm run cap:sync` before rebuilding the APK. For faster iteration you can ship web-only updates by rebuilding the web bundle; native shell changes (plugins, permissions) require a new APK.
