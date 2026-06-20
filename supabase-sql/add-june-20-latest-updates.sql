-- =========================================================
-- JUNE 20, 2026 — LATEST BATCH
-- Supabase SQL Editor → paste → Run
-- Safe to re-run: ON CONFLICT DO UPDATE refreshes body + detail.
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-20_privacy-policy-login',
  '2026-06-20',
  'Privacy policy — read and accept when you sign in',
  'I added a real privacy policy you accept once at login (v2). Your account data lives in Supabase — our online database — not only on your phone. Read it anytime from Home, Account, or the footer.',
  $detail$WHAT YOU''LL NOTICE
The first time you sign in after this update, a full-screen popup walks you through the privacy policy. You need to read it and tap accept before you can use the app. That is intentional — I want everyone to know where their information goes.

WHERE TO READ IT AGAIN
• Home page — link in the community section
• Account tab — privacy section
• Footer on most pages — Privacy policy link

WHAT THE POLICY EXPLAINS
Sacramento Buy Nothing stores profiles, posts, messages, votes, tickets, and notification preferences in Supabase. That is our database host in the cloud. The app on your phone is the window into that data; it is not a private notebook that never leaves your device.

WHO RUNS THIS
I am Markeith White. I operate this app alone — not a volunteer committee, not a corporation. If the policy language is confusing, open a support ticket or comment on this update and I will rewrite it in plain English.

WHY I DID THIS
Neighbors deserve honesty about data before they post photos of their porch or message strangers about pickup. I will never sell your information. I will never run ads. This policy is me putting that in writing.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-20_terms-of-use-login',
  '2026-06-20',
  'Terms of use — second acceptance right after privacy',
  'After privacy, you also accept the Terms of use once at login (v1). The page footer now links Privacy and Terms instead of the old GoFundMe strip. GoFundMe is still on Home and in Chat.',
  $detail$WHAT YOU''LL NOTICE
Login now has two steps for legal acceptance: privacy first, then terms. Both are blocking popups the first time you see them after this release. After you accept, you should not see them again unless I publish a new version.

WHERE TO READ TERMS LATER
Same places as privacy: Home, Account, and the footer links at the bottom of pages.

FOOTER CHANGE
I removed the pinned GoFundMe scroll strip from the bottom of every screen and replaced it with Privacy policy and Terms of use links. That keeps legal stuff easy to find without feeling like a banner ad.

GOFUNDME IS STILL HERE
Community support through GoFundMe did not go away. You will still find it on the Home page and inside Chat navigation. I only moved the always-on footer strip.

WHAT THE TERMS COVER
Free gifting rules, respectful behavior, how staff moderation works, and what happens if someone abuses the community. It is the user agreement for participating here.

WHY SEPARATE FROM PRIVACY
Privacy explains data. Terms explain behavior and community rules. They are related but not the same document, and I want you to see both clearly.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-20_anonymous-vote-cooldown',
  '2026-06-20',
  'Vote alerts stay anonymous + fair-vote cooldown',
  'Vote notifications no longer name who voted. If someone rapidly votes on many different posts, voting pauses briefly so one person cannot flood the feed — no bans, just a short breather.',
  $detail$WHAT YOU''LL NOTICE
When someone upvotes or downvotes your listing, review, or other content, your phone and bell inbox say something like “Someone upvoted your post” instead of naming a neighbor. I heard from people who did not want their name attached to every downvote notification.

MASS-VOTE COOLDOWN
If you cast many new votes on different posts in a short window (about ten votes within a few minutes), the app asks you to pause before voting more. This is not a ban. It is a cooldown so one angry session cannot carpet-bomb the whole feed.

WHAT STILL WORKS
You can still upvote and downvote normally when you browse at a human pace. The cooldown only kicks in on rapid-fire voting across lots of separate posts.

WHY I BUILT IT THIS WAY
Neighbors told me two things: stop putting voter names in alerts, and stop mass downvote waves without jumping straight to account bans. This is my answer to both — privacy in notifications and friction on abuse.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-20_chat-unsend',
  '2026-06-20',
  'Unsend your own chat messages',
  'Tap the ↩ button on a message you sent to unsend it. The text comes back into the input box so you can fix typos and send again. Staff can still remove others'' messages in community chat.',
  $detail$WHAT YOU''LL NOTICE
Your own messages in direct chats and in the community-wide channel now show a small unsend button (↩). Tap it and the message disappears for everyone in that thread.

FILES I CHANGED
• src/components/ChatSystem.tsx — main Chat tab, unsend button on your messages
• src/supabase.ts — deleteSupabaseMessage saves the delete online

DATABASE CHANGES I MADE
None — app code only. I did not need new database tables for unsend; it uses the existing messages table.

WHY I ADDED IT
People asked for “delete but let me fix it,” not permanent delete with no recovery. Unsend is delete plus restore to the composer.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-20_support-unsend',
  '2026-06-20',
  'Unsend your own support ticket replies',
  'In an open support ticket, tap ↩ on your own message to unsend it. The text returns to the reply box. Works for you and for staff on their own replies.',
  $detail$WHAT YOU''LL NOTICE
Chat → Support → open a ticket. While the ticket is still open, your own messages show the same unsend (↩) control as regular chat.

WHO CAN UNSEND
Anyone who sent the message — neighbors and staff alike. You cannot unsend someone else''s reply.

TEXT COMES BACK
The reply box refills with your message text so you can edit and send again. If the message was photo-only, the box clears (I cannot pull the original image file back into the attachment picker).

CLOSED TICKETS
Once a ticket is closed, unsend is turned off. Closed conversations are meant to be a record, not an editing surface.

WHY SUPPORT GOT THE SAME TREATMENT
Support threads are where you explain bugs and sensitive situations. Typos and “wait I meant to say” moments happen here too. You deserved the same unsend flow as regular chat.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-20_feed-sort',
  '2026-06-20',
  'Sort Stuff: New, Hot, Top, Active',
  'The Stuff tab has sort chips — New, Hot, Top, and Active — so you can browse trending and busy posts, not only the newest listing first.',
  $detail$WHAT YOU''LL NOTICE
At the top of the Stuff feed you will see sort chips. Tap one and the whole feed reorders.

THE FOUR MODES
• New — latest posts first, classic chronological browsing
• Hot — trending blend of votes and freshness (Reddit-style “what is picking up steam”)
• Top — highest score (upvotes minus downvotes)
• Active — posts with the most comments and neighbor activity

HOW TO USE IT
Tap a chip. Your choice sticks while you stay on Stuff so you can compare neighborhoods or categories without the sort resetting every second.

WHY I ADDED SORT MODES
Newest-first is great for power browsers, but it hides posts that are buzzing right now. Hot and Active help you see where conversation and interest actually are.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-20_updates-announcements-reading',
  '2026-06-20',
  'Read full summaries + comment on news',
  'Bell → Updates and News show the entire summary without cutting off. Tap for the full story. On announcements, the comment box is always right there — vote and discuss without extra taps.',
  $detail$WHAT YOU''LL NOTICE
Changelog entries and staff announcements used to chop the summary after two lines with “...”. That is gone. You see the whole summary on the card.

FULL STORY ON TAP
When I wrote a long “full story” for an entry, tap “Tap for full story” and it expands below the summary instead of replacing it. Collapse puts it away; the summary stays visible.

ANNOUNCEMENT COMMENTS
On Bell → News, every announcement keeps the discussion section visible under the votes. You do not have to expand the post just to find the comment box. Sign in to post; read anytime.

APP UPDATE COMMENTS
Bell → Updates works the same way for discussion on changelog entries — expand for the long version, comment when you have questions or feedback.

WHY I CHANGED THE LAYOUT
You told me you wanted to actually read what changed and talk back. Truncated summaries and hidden comment boxes were getting in the way. This layout is me listening to that.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
)

ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date,
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  detail = EXCLUDED.detail,
  "updatedAt" = NOW();
