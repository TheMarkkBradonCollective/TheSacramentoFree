# Google Play Console upload guide

Everything below is pre-filled for **SacramentoBuyNothing** (`org.sacramentobuynothing.app`). Your account is already set up — follow these steps in order.

## What is already done

- Release signing keystore: `android/app/sac-buynothing-release.keystore`
- `versionCode` **30**, `versionName` **0.1.0**
- Build command: `npm run android:aab` → `public/downloads/sac-buy-nothing-beta-v0.1.0.0030.aab` (and legacy `sac-buy-nothing.aab`)
- Store graphics: `play-store-assets/icon-512.png`, `play-store-assets/feature-graphic-1024x500.png`
- Phone screenshots: `play-store-assets/screenshots/` (fictional demo neighbors — not live member data)
- Regenerate graphics: `npm run android:play-assets`
- Regenerate screenshots: `npm run android:play-screenshots`
- Firebase push configured (client + server)

## What only you can do

1. **Phone screenshots** — download the zip from Staff / Account overview (**Download Play screenshots**), or use `play-store-assets/screenshots/` and `public/downloads/play-store-screenshots.zip`. Play Console → Store presence → Main store listing.
2. **Set app price** — Play Console → Monetize → Products → set your paid download price.
3. **Upload the AAB** — Play Console → Testing → **Closed testing** → Create release → upload `dist/android/sac-buy-nothing-release.aab`.
4. **Contact email** — use your support address (e.g. `support@sacbuynothing.org` from `.env.example`).
5. **Play reviewer account** — run `npm run play:reviewer-account` (see below).

---

## Google Play — App access (sign-in details)

Play Console → **App content → App access** (dashboard: **Sign in details**).

### Select this option

**Sign in details in this declaration provide full access to all the features and content within this app, including premium or paid content**

(SacramentoBuyNothing is a paid Play download — this tells Google the test account unlocks everything without a separate purchase.)

### Credentials

| Field | Value |
|-------|--------|
| **Email** | `playstore-review@sacramentobuynothing.com` |
| **Password** | `PlayReview-Sac2026!` |

Create the account once: `npm run play:reviewer-account` (needs Supabase service role key from Vercel).

### Paste these instructions for Google reviewers

```
SacramentoBuyNothing requires sign-in. Use this test account for full access — no additional purchase needed for review.

Email: playstore-review@sacramentobuynothing.com
Password: PlayReview-Sac2026!

After sign-in, reviewers can use all features:
• Browse feed and map
• View and open listings, profiles, and message threads
• Post listings, send messages, comment, and claim items
• Account settings, notifications, and support chat

Location and notification permissions are optional — tap Skip if prompted.
No 2FA. No phone number required.
```

---

## Step 1 — Build the upload bundle

```bash
npm run android:aab
```

Upload file (same build as the sideload APK):

```
public/downloads/sac-buy-nothing-beta-v0.1.0.0030.aab
```

Legacy alias: `public/downloads/sac-buy-nothing.aab`

Local copy after build: `dist/android/sac-buy-nothing-release.aab`

**Back up** `android/app/sac-buynothing-release.keystore` and `android/keystore.properties` offline. Losing them blocks future updates.

On first upload, choose **Let Google manage and protect your app signing key** (Play App Signing).

---

## Step 2 — Create the app (if not created yet)

| Field | Value |
|-------|-------|
| App name | **SacramentoBuyNothing** |
| Default language | English (United States) |
| App or game | App |
| Free or paid | **Paid** |
| Package name | `org.sacramentobuynothing.app` (must match exactly) |

After creating the app, set your price:
**Monetize → Products → App pricing** → choose price tier → Save.

---

## Step 3 — Main store listing (copy/paste)

### App name
```
SacramentoBuyNothing
```

### Short description (80 characters max)
```
Sacramento neighbor gifting — give items, request what you need, meet locally.
```

### Full description
```
SacramentoBuyNothing is the community app for Sacramento neighbors who give away items and request what they need — no selling, no bidding, no flipping.

WHAT YOU CAN DO
• Post items to give away or requests for things you need
• Message neighbors safely in-app — no phone numbers required
• Browse by Sacramento neighborhood and coordinate porch pickup
• Join community events and group chats
• Get optional push alerts for new posts and messages
• Earn community awards for generous gifting

BUILT FOR SACRAMENTO
This app serves Sacramento-area neighbors only. Pick your neighborhood, connect with people nearby, and keep useful items out of the landfill.

SAFE & LOCAL
• Block neighbors and report concerns to community staff
• Hide your exact address until you choose to share it
• Delete your account anytime from Account settings
• Your data is stored securely — never sold, no ads

SacramentoBuyNothing is run by Markeith White for local, free neighbor-to-neighbor gifting. Items in the community are always free — the app download is a paid Play Store listing.

Privacy policy: https://www.sacramentobuynothing.com/privacy
Terms of use: https://www.sacramentobuynothing.com/terms
```

### Graphics

| Asset | File |
|-------|------|
| Store icon (512×512, site lockup) | `play-store-assets/icon-512.png` (from `public/TheSacramentoFree.png`, not `Logo.png`) |
| Feature graphic (1024×500) | `play-store-assets/feature-graphic-1024x500.png` |
| Phone screenshots | `public/downloads/play-store-screenshots.zip` or `play-store-assets/screenshots/01-home.png` through `08-messages.png` (1080×1920). Director overview: Download Play screenshots. |

### Category
- **Primary:** Social (or Lifestyle)
- **Tags:** community, local, gifting, Sacramento

### Contact details
- **Email:** your support email
- **Privacy policy URL:** `https://www.sacramentobuynothing.com/privacy`
- **Delete account URL:** `https://www.sacramentobuynothing.com/delete-account`
- **Website:** `https://www.sacramentobuynothing.com`

---

## Step 4 — App content declarations

### Data safety (summary)

| Question | Answer |
|----------|--------|
| Collects or shares user data? | Yes, collects |
| Data encrypted in transit? | Yes |
| Users can request deletion? | Yes (Account → Delete account) |
| Delete account URL | `https://www.sacramentobuynothing.com/delete-account` |
| Committed to Play Families Policy? | Only if you target children (recommend **18+** audience) |

**Data types to declare:**

| Type | Collected | Shared | Purpose |
|------|-----------|--------|---------|
| Email address | Yes | No | Account management |
| Name | Yes | No | Account management |
| Photos | Yes | No | App functionality (listings) |
| Messages | Yes | No | App functionality |
| Approximate location | Optional | No | App functionality (pickup/map) |
| Precise location | Optional | No | App functionality (pickup/map) |
| Device or other IDs | If push enabled | No | App functionality (notifications) |

- Data is **not sold**
- Collection is **optional** where user controls it (location, push)

### Content rating (IARC)
- Violence: None
- Sexual content: None
- Language: None / Infrequent
- Controlled substances: None
- User interaction / UGC: **Yes** (posts, messages, reviews)
- Shares location: **Yes** (optional, user-provided)
- Digital purchases: **No** (paid app download is set in Play pricing, not in-app purchases)

### Target audience
Recommend **18 and over** (user-generated content, messaging, location).

### Ads
**No**, the app does not contain ads.

### Other
- News app: No
- COVID-19 contact tracing: No
- Government app: No

---

## Step 5 — Permissions (for review / declaration)

| Permission | Why |
|------------|-----|
| Internet | Load app content and API |
| Fine / coarse location | Optional pickup coordinates and map (user choice) |
| Post notifications | Community alerts the user opts into |

---

## Tester email CSV (Internal / Closed testing only)

Play Console **does not** accept CSV on the store listing, Data safety, or App content pages. CSV upload is only for **tester email lists**:

**Testing → Internal testing** (or **Closed testing**) → **Testers** → **Create email list** → **Upload CSV file**

Google’s rules for that file:

| Rule | Why your export failed |
|------|-------------------------|
| **One email per line** | Multi-column CSV (`email,name,...`) is rejected |
| **No header row** | A first line like `email` is rejected |
| **No commas in the file** | Standard CSV uses commas between columns |
| **UTF-8 without BOM** | Excel “CSV UTF-8” often adds a BOM byte Play rejects |

Generate the correct file from this repo (service role required):

```bash
SUPABASE_URL="https://YOUR-PROJECT.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
npm run export:play-testers
```

**On your phone (director account):** open **Account → Site overview** and tap **Download Play tester emails**. That uses the live site API and paginates past the SQL Editor’s 100-row cap.

Output: `exports/play-testers.csv` — plain list, one Gmail address per line.

**Limits:** Internal testing = **100 testers max** (Play Console will only show/accept 100 even if your CSV has more). Closed testing = **2,000 per list**. For all ~478 neighbors, use **Closed testing** — not Internal.

**If you only see 100 emails:**

| Cause | Fix |
|-------|-----|
| Uploaded to **Internal testing** | Create the list under **Testing → Closed testing → Testers** instead |
| Ran `npm run export:play-testers:internal` | That script caps at 100 on purpose — use `npm run export:play-testers` |
| Supabase SQL Editor download | The results table often shows 100 rows; use `npm run export:play-testers` (paginates all pages) or export in batches with `OFFSET` |

After saving the list, copy the **opt-in link** and share it — testers must open it while signed into the same Google account email you added.

---

## Closed testing opt-in (share this — not internal testing)

Neighbors on your tester list should open this link on Android while signed into the Gmail you added:

```
https://play.google.com/apps/testing/org.sacramentobuynothing.app
```

Then install from the store listing: `https://play.google.com/store/apps/details?id=org.sacramentobuynothing.app`

The old **internal testing** URL (`https://play.google.com/apps/internaltest/4701336413298152827`) can stay valid in Play Console until you halt that track. Do not share it anymore — upload new builds to **Closed testing** only.

---

## Step 6 — Release (current: beta v0.1.0.0030)

1. **Testing → Closed testing → Create release** (or Production when ready)
2. Upload `public/downloads/sac-buy-nothing-beta-v0.1.0.0030.aab` (or `sac-buy-nothing.aab`)
3. Release name: `0.1.0 (30)`
4. Release notes — copy from `play-store-assets/release-notes-v0.1.0-0030.txt`:

```
Android beta v0.1.0.0030 (versionCode 30)

What's new (Android app):
• Launcher icon now matches the PWA — full-bleed orange, no white ring around the edges

Download (sideload): https://www.sacramentobuynothing.com/download
```

5. Add yourself as a closed tester → install from the closed-testing opt-in link above
6. Verify: sign-in, in-app Navigate, walk/bike/drive, heading-up, lane guidance, spoken turn card, nav settings, Stuff grid, status bar / nav bar spacing, push
7. Promote to **Production** when ready → **Send for review**

**Current release manifest:** `play-store-assets/current-release.json`

---

## Step 6 (legacy first release notes)

For reference — first Play upload used versionCode 8:

1. **Testing → Internal testing → Create release**
2. Upload `public/downloads/sac-buy-nothing-beta-v0.1.0.0029.aab` (or `sac-buy-nothing.aab`)
3. Release name: `0.1.0 (8)`
4. Release notes:

```
First Google Play release of SacramentoBuyNothing for Sacramento neighbors.

• Browse and post items and requests (always free between neighbors)
• In-app messaging and neighborhood map
• Optional push notifications for community activity
• Account, privacy, and terms flows built in
```

5. Add yourself as a closed tester → install from the closed-testing opt-in link above
6. Verify: sign-in, feed, map, location prompt, push, account deletion
7. Promote to **Production** when ready → **Send for review**

---

## Version bumps for future releases

1. Increase `versionCode` in `android/app/build.gradle` (must be higher than last Play upload)
2. Update `versionName` if needed
3. `npm run android:aab` → upload `public/downloads/sac-buy-nothing-beta-v0.1.0.00XX.aab`
4. Add `play-store-assets/release-notes-v0.1.0-00XX.txt` and update `play-store-assets/current-release.json`
5. Upload new AAB with updated release notes in Play Console
