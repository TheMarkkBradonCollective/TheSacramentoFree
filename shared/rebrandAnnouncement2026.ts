/** Aug 2026 rebrand / trademark letter — shared by seed, popup, and home notice. */

export const REBRAND_ANNOUNCEMENT_ID = '2026-08-21_rebrand-letter';

export const REBRAND_ANNOUNCEMENT_DATE = '2026-08-21';

export const REBRAND_ANNOUNCEMENT_TITLE = 'I do not know what else to do';

/** Short teaser in News list and push preview. */
export const REBRAND_ANNOUNCEMENT_BODY =
  'Sounds like shutdown. Nope — got a good idea. You gotta wait for version 0.2.0.';

/** Full letter — popup + News detail. Not a traditional release note. */
export const REBRAND_ANNOUNCEMENT_LETTER = `Neighbors,

I'm going to be honest — I'm kind of defeated on this one.

Our name — "Buy Nothing" — runs into trademarks and brands that aren't ours. I've turned it over every way I can think of, and I don't know what else to do except shut Sacramento Buy Nothing down: take the site off, pull the apps, and say goodbye.

…

NAWH, I'M JUST GIV'N. 😅

Wait — nope. I actually got such a good idea for what comes next. You're gonna have to wait while I cook it, but we're not closing. Your listings, your messages, and this community stay.

Here is what is actually changing:

I'm going to stop active development on big new features for a while. The site and apps you use today keep working — post, gift, chat, pick up, all of it. In the background, I'm building **version 0.2.0** — a full rebrand into something that is fully our own. I think the new name and look are genuinely clever — I've been designing it from mobile to desktop to PWA to APK/AAB — but I'm not spilling those beans yet. I want it cooked right before you see it.

When version 0.2.0 ships, it also moves us out of **internal testing** (the small Play Console internal track — basically me plus a tight tester circle) and into **closed testing** (a wider invited Google Play beta before anything public). Same community, same purpose — an identity that is ours alone, with no trademark gray area.

Thank you for being here while I get this right. You built this. I'm not walking away — just turning the page.

— Mark
Buy Nothing Director, Sacramento`;

/** Professional home-page notice — upcoming link change (rebrand is live). */
export const TRADEMARK_HOME_NOTICE = {
  title: 'Heads up — new website and app link coming soon',
  body: `TheSacramentoFree name and look are live — that change was immediate once the update shipped.

Next up: a new website address and a new Android download link. That switch is not today. Keep using this site and your current app until I post the exact links in News (bell → News).

Same neighbor account, same listings and chat when we move. I will give install steps before anything changes.`,
};

/** Short feed post for copy/paste (cliff-hanger). */
export const REBRAND_FEED_CLIFFHANGER = `I'm kind of defeated on this one honestly 😔

Our name hits trademarks we don't own. I've tried everything I can think of — I don't know what else to do but shut Sacramento Buy Nothing down.

…

NAWH, I'M JUST GIV'N. 😂

Nope. Got such a good idea — you gotta wait. ✅ Version 0.2.0 is cooking. 👀 Full letter in News (bell → News). 🔔`;

export const REBRAND_ANNOUNCEMENT_PUBLISHED_AT = '2026-08-21T01:10:00.000Z';

/** Updates tab — professional product note (News has the personal letter). */
export const REBRAND_UPDATE_ID = '2026-08-21_trademark-rebrand-notice';

export const REBRAND_UPDATE_TITLE = 'Worth reading before you worry';

export const REBRAND_UPDATE_BODY =
  'Site stays up while version 0.2.0 cooks in private — you gotta wait on the reveal.';

export const REBRAND_UPDATE_DETAIL = `WHAT NEIGHBORS SEE
• sacramentobuynothing.com now shows an official trademark notice on the home page — we are independent and working on a distinct name
• First visit shows a one-time letter from Mark (dismiss it anytime; the full letter also lives in bell → News)
• The site and apps stay fully available — post, gift, chat, and events work as they do today
• Large new feature work pauses while version 0.2.0 is built in private (mobile, desktop, PWA, and Android)
• When version 0.2.0 ships, the Android app moves from internal testing to closed testing — a wider invited Play beta before any public launch

Mark's full personal letter is in Notifications → News.

— Mark

WHERE TO LOOK IN CODE
- shared/rebrandAnnouncement2026.ts — letter, home notice, feed cliff-hanger
- src/components/RebrandAnnouncementModal.tsx — one-time popup
- src/components/public/TrademarkNoticeBanner.tsx — home page notice

HISTORY
2026-08-21 — Rebrand announcement (PR #328).`;
