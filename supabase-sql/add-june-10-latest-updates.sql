-- =========================================================
-- JUNE 10, 2026 — LATEST COMMUNITY UPDATES
-- Run once in Supabase SQL Editor.
-- Safe to re-run: ON CONFLICT DO UPDATE refreshes body + detail.
-- =========================================================

INSERT INTO public.app_updates (
  id, date, title, body, detail, "directorName", "directorTitle", "postedByUserId"
) VALUES
(
  '2026-06-10_no-duplicate-announcements',
  '2026-06-10',
  'Announcements no longer show twice',
  'Posting one staff announcement now shows exactly once in the list — we fixed a race between instant UI update and live sync.',
  $detail$WHAT NEIGHBORS SEE
When staff post an announcement under Community hub → Announcements, you should see one card per post — not two identical entries right after publishing.

WHAT WAS BROKEN
After posting, the app both (a) added the new row to the screen immediately and (b) refreshed from Supabase realtime a moment later. If realtime finished first, the immediate add ran again and duplicated the same announcement id in the list.

WHAT WE CHANGED (CODE)
• src/hooks/useHelpAnnouncements.ts — after a successful post, reload from the database instead of prepending a second copy; debounced realtime refresh; dedupe by id when loading.
• src/hooks/useAppUpdates.ts — same pattern for director changelog posts (prevents the same bug on App updates).

FILES
src/hooks/useHelpAnnouncements.ts, src/hooks/useAppUpdates.ts, src/lib/supabaseRealtime.ts (debounceRealtime)

No SQL required for this fix — deploy the app update only.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-10_chat-gofundme-scroll-support-back',
  '2026-06-10',
  'Chat polish: GoFundMe scrolls, support has a back button',
  'In Chat, the GoFundMe strip scrolls at the bottom of the list instead of staying pinned on screen. Support tickets now have a back button to return to your inbox.',
  $detail$WHAT NEIGHBORS SEE

CHAT → GOFUNDME
On mobile, open Chat and scroll the conversation list — the optional GoFundMe support strip is at the bottom of the scrollable content, not stuck under the messenger window. Same idea on support ticket lists.

CHAT → SUPPORT → BACK
Open Chat → Support → My support tickets. Tap ← to return to the chat inbox. Inside a ticket thread, ← goes back to your ticket list.

CODE
• src/components/MobileView.tsx — removed pinned GoFundMe sibling under Chat
• src/components/ChatSystem.tsx — PageScrollFooter at end of chat_rooms_scrollable; onOpenGoFundMe prop
• src/components/ChatSupportSection.tsx — back button on ticket list (onBackToChat)
• src/components/DesktopView.tsx / TabletView.tsx — GoFundMe below chat card in page scroll

Deploy only — no new SQL tables.$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-10_community-staff-chat-support-moved',
  '2026-06-10',
  'Community chat, staff lounge, support in Chat',
  'Chat now has a community-wide channel, a staff-only lounge, and support tickets — all in one tab. Help is renamed Community hub (reports stay there).',
  $detail$WHAT NEIGHBORS SEE

CHAT TAB
• Community chat — all neighbors (global channel)
• Staff chat — staff only (hidden from neighbors)
• Support — personal tickets with staff (moved out of Community hub)
• Direct messages — unchanged 1:1 listing/profile chats

COMMUNITY HUB (was Help)
App updates, announcements, reviews, and safety reports. Tab label is now Community.

SQL TO RUN (if not already)
• supabase-sql/community-chats.sql — seeds community-global and community-staff rows
• supabase-sql/help-announcements.sql + help-announcement-comments.sql (announcements board)

WEBHOOK
help_announcements INSERT → /api/webhooks/supabase-push (push-announcements)

CODE
src/lib/communityChats.ts, src/components/ChatSystem.tsx, src/components/ChatSupportSection.tsx, src/components/AccountHelpSection.tsx, src/siteContent.ts$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-10_full-changelog-deep-detail',
  '2026-06-10',
  'Full changelog history — every update has a long story',
  'Tap any App update to expand the full technical story. All 87 changelog entries now have detailed write-ups with file paths and setup steps.',
  $detail$WHAT NEIGHBORS SEE
Community hub → App updates → tap an entry. The short summary is still one or two sentences; expand to read the full story (what changed, which files, SQL to run).

FOR DIRECTORS
Post new entries with Summary + Full story fields in the edit modal. Regenerate the SQL bundle anytime with: node scripts/expand-changelog-details.mjs

SQL TO PUBLISH ALL DETAIL TEXT
Run once in Supabase SQL Editor:
supabase-sql/expand-all-community-updates-detail.sql

Safe to re-run — ON CONFLICT DO UPDATE refreshes body and detail for all 87 rows.

FILES
scripts/expand-changelog-details.mjs, supabase-sql/expand-all-community-updates-detail.sql, src/components/UpdatesList.tsx, src/components/AppUpdateEditModal.tsx$detail$,
  'Markeith White',
  'Buy Nothing Director',
  'director'
),
(
  '2026-06-10_community-staff-chat-notifications',
  '2026-06-10',
  'Push alerts for community and staff chat',
  'New messages in Community chat and Staff chat now send push notifications. Each has its own toggle under Notification settings.',
  $detail$WHAT NEIGHBORS SEE
When someone posts in Chat → Community chat, neighbors who enabled Community chat notifications get a push alert. Tap it to open the channel.

WHAT STAFF SEE
Staff who enabled Staff chat under Notification settings → Staff moderation get alerts for new messages in the staff-only lounge.

NOTIFICATION SETTINGS
• Messages & support → Community chat (all neighbors)
• Staff moderation → Staff chat (staff only)

SQL TO RUN
supabase-sql/add-community-chat-notification-prefs.sql

HOW IT WORKS
• messages INSERT webhook (push-messages) routes community-global and community-staff to broadcast handlers
• Dedup tags: community-msg-{messageId} and staff-msg-{messageId}
• Deep links: /messages/community-global and /messages/community-staff

CODE
api/push/_server/communityChatNotify.ts, api/push/_server/neighborNotify.ts, api/push/_server/runPushSend.ts, api/push/_server/pushDelivery.ts, src/lib/pushEvents.ts, src/lib/pushIntegration.ts, src/supabase.ts, src/components/NotificationSettings.tsx$detail$,
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
