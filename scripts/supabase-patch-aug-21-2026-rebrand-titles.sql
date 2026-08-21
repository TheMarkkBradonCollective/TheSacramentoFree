-- =========================================================
-- AUG 21 2026 — Patch titles: next chapter → version 0.2.0
-- Run in Supabase SQL Editor. Safe to re-run.
-- =========================================================

UPDATE public.app_updates
SET
  title = 'Before the next chapter',
  body = 'Site stays up while we pause big new builds and work toward version 0.2.0.',
  "updatedAt" = NOW()
WHERE id = '2026-08-21_trademark-rebrand-notice';

UPDATE public.help_announcements
SET
  title = 'Time for the next chapter',
  body = 'Sounds like I am moving on. I am not — version 0.2.0 is next.',
  detail = $detail$Neighbors,

I have to start with the part I didn't want to write.

I've now learned that our name — "Buy Nothing" — overlaps with trademarks and brands that aren't ours. As a result, we are going to have to discontinue operations: take the site down, pull the apps, and say goodbye.

…

NAWH, I'M JUST GIV'N. 😅

Sacramento Buy Nothing is not shutting down. You're not losing your listings, your messages, or this community. This is not me leaving — it is time for the next chapter.

Here is what is actually changing:

I'm going to stop active development on big new features for a while. The site and apps you use today keep working — post, gift, chat, pick up, all of it. In the background, I'm building **version 0.2.0** — a full rebrand into something that is fully our own. I think the new name and look are genuinely clever — I've been designing it from mobile to desktop to PWA to APK/AAB — but I'm not spilling those beans yet. I want it cooked right before you see it.

When version 0.2.0 ships, it also moves us out of **internal testing** (the small Play Console internal track — basically me plus a tight tester circle) and into **closed testing** (a wider invited Google Play beta before anything public). Same community, same purpose — an identity that is ours alone, with no trademark gray area.

Thank you for being here while I get this right. You built this. I'm not walking away — just turning the page.

— Mark
Buy Nothing Director, Sacramento$detail$,
  "updatedAt" = NOW()
WHERE id = '2026-08-21_rebrand-letter';
