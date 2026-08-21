-- =========================================================
-- AUG 21 2026 — Rebrand announcement (Updates + News)
-- Run this ONE script in Supabase SQL Editor on production.
-- Safe to re-run anytime: ON CONFLICT upserts latest copy in place.
--
--   • bell → Updates  — 2026-08-21_trademark-rebrand-notice
--   • bell → News     — 2026-08-21_rebrand-letter
--
-- Canonical copy: shared/rebrandAnnouncement2026.ts
-- Cron /api/cron/publish-changelog also upserts from shared/changelogSeed.ts
-- =========================================================

-- ── Updates (product note) ────────────────────────────────────────────────

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId",
  "createdAt", "updatedAt"
)
VALUES (
  '2026-08-21_trademark-rebrand-notice',
  '2026-08-21',
  'Worth reading before you worry',
  'Site stays up while version 0.2.0 cooks in private — you gotta wait on the reveal.',
  $detail$WHAT NEIGHBORS SEE
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
- scripts/supabase-migration-aug-21-2026-rebrand-letter.sql

HISTORY
2026-08-21 — Rebrand announcement (PRs #328–#332).$detail$,
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

-- ── News (director letter) ────────────────────────────────────────────────

INSERT INTO public.help_announcements (
  id, date, title, body, detail, "authorName", "authorTitle", "postedByUserId",
  "createdAt", "updatedAt"
)
VALUES (
  '2026-08-21_rebrand-letter',
  '2026-08-21',
  'I do not know what else to do',
  'Sounds like shutdown. Nope — got a good idea. You gotta wait for version 0.2.0.',
  $detail$Neighbors,

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
