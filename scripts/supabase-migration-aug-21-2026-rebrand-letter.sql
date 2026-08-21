-- =========================================================
-- AUG 21 2026 — Rebrand / trademark (Updates + News)
-- Run in Supabase SQL Editor on the EXISTING production database.
-- Safe to re-run: ON CONFLICT updates copy in place.
--
-- Updates = professional product note (bell → Updates)
-- News = director letter / fake shutdown pivot (bell → News)
--
-- Canonical copy lives in shared/rebrandAnnouncement2026.ts and
-- shared/changelogSeed.ts. Cron /api/cron/publish-changelog
-- upserts seeds every 4 hours. Use this migration for immediate sync.
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId",
  "createdAt", "updatedAt"
)
VALUES (
  '2026-08-21_trademark-rebrand-notice',
  '2026-08-21',
  'From Mark — something on the home page',
  'Home page notice, a one-time letter when you visit, and a brief pause on big new builds.',
  $detail$WHAT NEIGHBORS SEE
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
2026-08-21 — Rebrand announcement (PR #328).$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-08-21T01:10:00.000Z',
  '2026-08-21T01:10:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "directorName" = EXCLUDED."directorName",
  "directorTitle" = EXCLUDED."directorTitle",
  "postedByUserId" = EXCLUDED."postedByUserId",
  "createdAt" = EXCLUDED."createdAt",
  "updatedAt" = EXCLUDED."updatedAt";

INSERT INTO public.help_announcements (
  id, date, title, body, detail, "authorName", "authorTitle", "postedByUserId",
  "createdAt", "updatedAt"
)
VALUES (
  '2026-08-21_rebrand-letter',
  '2026-08-21',
  'From Mark — I almost got you',
  'I opened with bad news on purpose. We are not shutting down — read the letter.',
  $detail$Neighbors,

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
Buy Nothing Director, Sacramento$detail$,
  'Markeith White',
  'Buy Nothing Director',
  '204b071f-100c-401d-b76d-40c594e1f132',
  '2026-08-21T01:10:00.000Z',
  '2026-08-21T01:10:00.000Z'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "authorName" = EXCLUDED."authorName",
  "authorTitle" = EXCLUDED."authorTitle",
  "postedByUserId" = EXCLUDED."postedByUserId",
  "createdAt" = EXCLUDED."createdAt",
  "updatedAt" = EXCLUDED."updatedAt";
