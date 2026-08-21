/** Aug 2026 rebrand / trademark letter — shared by seed, popup, and home notice. */

export const REBRAND_ANNOUNCEMENT_ID = '2026-08-21_rebrand-letter';

export const REBRAND_ANNOUNCEMENT_DATE = '2026-08-21';

export const REBRAND_ANNOUNCEMENT_TITLE = 'I almost got you — please read';

/** Short teaser in News list and push preview. */
export const REBRAND_ANNOUNCEMENT_BODY =
  'I opened heavy on purpose. We are still here — read the full letter.';

/** Full letter — popup + News detail. Not a traditional release note. */
export const REBRAND_ANNOUNCEMENT_LETTER = `Neighbors,

I have to start with the part I didn't want to write.

I've now learned that our name — "Buy Nothing" — overlaps with trademarks and brands that aren't ours. As a result, we are going to have to discontinue operations: take the site down, pull the apps, and say goodbye.

…

NAWH, I'M JUST GIV'N. 😅

Sacramento Buy Nothing is not shutting down. You're not losing your listings, your messages, or this community.

Here is what is actually changing:

I'm going to stop active development on big new features for a while. The site and apps you use today keep working — post, gift, chat, pick up, all of it. In the background, I'm rebranding us into something that is fully our own. I think the new name and look are genuinely clever — I've been designing it from mobile to desktop to PWA to APK/AAB — but I'm not spilling those beans yet. I want it cooked right before you see it.

When that rebrand ships, it also moves us out of **internal testing** (the small Play Console internal track — basically me plus a tight tester circle) and into **closed testing** (a wider invited Google Play beta before anything public). Same community, same purpose — an identity that is ours alone, with no trademark gray area.

Thank you for being here while I get this right. You built this. I'm not walking away from it.

— Mark
Buy Nothing Director, Sacramento`;

/** Professional home-page notice — no rug pull. */
export const TRADEMARK_HOME_NOTICE = {
  title: 'Official notice on our name',
  body: `Sacramento Buy Nothing is an independent local gifting project. We are not affiliated with any national "Buy Nothing" trademark holder or project.

We understand that our current name may conflict with trademarks held by other organizations. That is on us to fix. We are actively developing a distinct name and visual identity so we can serve Sacramento neighbors clearly and respectfully, without confusion or infringement.

The website and app remain fully available while we make that transition. Gifting, messaging, and events continue as they do today.`,
};

/** Short feed post for copy/paste (cliff-hanger). */
export const REBRAND_FEED_CLIFFHANGER = `I have to lead with the part I didn't want to write. 😬

Our name — "Buy Nothing" — runs into trademarks that aren't ours. On paper, that means shutting Sacramento Buy Nothing down: site off, apps pulled, done. 💀

…

NAWH, I'M JUST GIV'N. 😂

We're not closing. ✅ Your listings, messages, and this community stay. I'm pausing big new builds while I rebrand us into something that's fully our own — I'm not showing it yet on purpose. 👀 Full letter in News (bell → News). 🔔`;

export const REBRAND_ANNOUNCEMENT_PUBLISHED_AT = '2026-08-21T01:10:00.000Z';

/** Updates tab — professional product note (News has the personal letter). */
export const REBRAND_UPDATE_ID = '2026-08-21_trademark-rebrand-notice';

export const REBRAND_UPDATE_TITLE = 'Something worth reading when you visit';

export const REBRAND_UPDATE_BODY =
  'Home page notice, a one-time letter when you visit, and a brief pause on big new builds.';

export const REBRAND_UPDATE_DETAIL = `WHAT NEIGHBORS SEE
• sacramentobuynothing.com now shows an official trademark notice on the home page — we are independent and working on a distinct name
• First visit shows a one-time letter from Mark (dismiss it anytime; the full letter also lives in bell → News)
• The site and apps stay fully available — post, gift, chat, and events work as they do today
• Large new feature work pauses while the rebrand is built in private (mobile, desktop, PWA, and Android)
• When the rebrand ships, the Android app moves from internal testing to closed testing — a wider invited Play beta before any public launch

Mark's full personal letter is in Notifications → News.

— Mark

WHERE TO LOOK IN CODE
- shared/rebrandAnnouncement2026.ts — letter, home notice, feed cliff-hanger
- src/components/RebrandAnnouncementModal.tsx — one-time popup
- src/components/public/TrademarkNoticeBanner.tsx — home page notice
- scripts/supabase-migration-aug-21-2026-rebrand-letter.sql

HISTORY
2026-08-21 — Rebrand announcement (PR #328).`;
