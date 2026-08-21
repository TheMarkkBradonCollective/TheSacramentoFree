-- =========================================================
-- AUG 21 2026 — Patch copy: defeated shutdown → good idea, wait for 0.2.0
-- Run in Supabase SQL Editor. Safe to re-run.
-- =========================================================

UPDATE public.app_updates
SET
  title = 'Worth reading before you worry',
  body = 'Site stays up while version 0.2.0 cooks in private — you gotta wait on the reveal.',
  "updatedAt" = NOW()
WHERE id = '2026-08-21_trademark-rebrand-notice';

UPDATE public.help_announcements
SET
  title = 'I do not know what else to do',
  body = 'Sounds like shutdown. Nope — got a good idea. You gotta wait for version 0.2.0.',
  detail = $detail$Neighbors,

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
  "updatedAt" = NOW()
WHERE id = '2026-08-21_rebrand-letter';
