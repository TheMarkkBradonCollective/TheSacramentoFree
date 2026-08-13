# Google Play Console upload guide

Everything below is pre-filled for **SacramentoBuyNothing** (`org.sacramentobuynothing.app`). Your account is already set up — follow these steps in order.

## What is already done

- Release signing keystore: `android/app/sac-buynothing-release.keystore`
- `versionCode` **8**, `versionName` **0.1.0**
- Build command: `npm run android:aab` → `dist/android/sac-buy-nothing-release.aab`
- Store graphics: `play-store-assets/icon-512.png`, `play-store-assets/feature-graphic-1024x500.png`
- Regenerate graphics: `npm run android:play-assets`
- Firebase push configured (client + server)

## What only you can do

1. **Phone screenshots** — capture 2–8 screenshots on a real device (feed, map, chat, profile). Play Console → Store presence → Main store listing.
2. **Set app price** — Play Console → Monetize → Products → set your paid download price.
3. **Upload the AAB** — Play Console → Testing → Internal testing → Create release → upload `dist/android/sac-buy-nothing-release.aab`.
4. **Contact email** — use your support address (e.g. `support@sacbuynothing.org` from `.env.example`).

---

## Step 1 — Build the upload bundle

```bash
npm run android:aab
```

Upload file:

```
dist/android/sac-buy-nothing-release.aab
```

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
| App icon (512×512) | `play-store-assets/icon-512.png` |
| Feature graphic (1024×500) | `play-store-assets/feature-graphic-1024x500.png` |
| Phone screenshots | **You provide** (min 2) |

### Category
- **Primary:** Social (or Lifestyle)
- **Tags:** community, local, gifting, Sacramento

### Contact details
- **Email:** your support email
- **Privacy policy URL:** `https://www.sacramentobuynothing.com/privacy`
- **Website:** `https://www.sacramentobuynothing.com`

---

## Step 4 — App content declarations

### Data safety (summary)

| Question | Answer |
|----------|--------|
| Collects or shares user data? | Yes, collects |
| Data encrypted in transit? | Yes |
| Users can request deletion? | Yes (Account → Delete account) |
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

## Step 6 — Release

1. **Testing → Internal testing → Create release**
2. Upload `dist/android/sac-buy-nothing-release.aab`
3. Release name: `0.1.0 (8)`
4. Release notes:

```
First Google Play release of SacramentoBuyNothing for Sacramento neighbors.

• Browse and post items and requests (always free between neighbors)
• In-app messaging and neighborhood map
• Optional push notifications for community activity
• Account, privacy, and terms flows built in
```

5. Add yourself as an internal tester → install from opt-in link
6. Verify: sign-in, feed, map, location prompt, push, account deletion
7. Promote to **Production** when ready → **Send for review**

---

## Version bumps for future releases

1. Increase `versionCode` in `android/app/build.gradle` (must be higher than last Play upload)
2. Update `versionName` if needed
3. `npm run android:aab`
4. Upload new AAB with updated release notes
