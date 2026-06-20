-- =========================================================
-- JUNE 20, 2026 — SECURITY HARDENING UPDATE
-- Supabase SQL Editor → paste → Run
-- Safe to re-run: ON CONFLICT DO UPDATE refreshes body + detail.
--
-- Run AFTER supabase-sql/security-hardening.sql on production.
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-20_security-hardening-audit',
  '2026-06-20',
  'Full security audit — your data is locked down tighter',
  'I ran a complete site security review and tightened everything: database permissions, push alerts, login data, and notification links. Your messages, email, and account stay yours — not open to strangers or scripts.',
  $detail$WHAT I DID
I treated this like a home inspection for the whole app — not just the paint on the walls. Sacramento Buy Nothing stores your profile, listings, messages, and tickets in Supabase (our online database). I made sure only the right people can read or change the right things at that layer, not just inside the app screens.

DATABASE LOCKDOWN
Before this update, some database rules were too loose — the kind of thing a bad actor with technical skill could poke at. I replaced those with real access rules: you can only edit your own profile and posts, only chat participants can read a thread, staff tools are staff-only, and nobody can promote themselves to director through a browser trick.

YOUR EMAIL AND ROLE
Neighbor profiles no longer expose email addresses to everyone browsing the community. Your role (user, staff, director) cannot be changed from the app unless a director does it through a protected server path. I also stopped caching sensitive account details on your phone for the splash screen.

PUSH NOTIFICATIONS
Push alerts were another door I closed. Nobody can blast the whole community, spoof a staff message, or send a fake “your item was claimed” alert to arbitrary neighbors from the outside. Notification links only open pages on our site — not random websites.

WEBSITE HEADERS
The live site now sends stricter browser security headers (content policy, frame blocking, and related protections) so the app is harder to embed or tamper with from the outside.

WHAT YOU SHOULD NOTICE
Nothing scary for normal use. Posting, gifting, messaging, events, and support tickets should feel the same. If something breaks after deploy, open a support ticket — that usually means I missed one edge case and I will fix it fast.

WHAT STAYS TRUE
• No ads. Ever.
• I do not sell your information.
• Free to use, always.
• I operate this app myself and take neighbor safety seriously.

If you are technical and self-hosting: run supabase-sql/security-hardening.sql in the Supabase SQL Editor and set SUPABASE_PUSH_WEBHOOK_SECRET plus CRON_SECRET in Vercel before you rely on push or scheduled jobs.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
)
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "directorName" = EXCLUDED."directorName",
  "directorTitle" = EXCLUDED."directorTitle",
  "updatedAt" = NOW();
