-- Community-wide and staff-only group chats (reuse chats + messages tables).
-- Run once in Supabase SQL Editor. Safe to re-run.

INSERT INTO public.chats (
  id,
  "participantIds",
  "participantNames",
  "participantPhotos",
  "lastMessageText",
  "lastMessageAt",
  "itemId",
  "itemTitle"
) VALUES
(
  'community-global',
  '[]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Welcome to the community chat — say hello!',
  NOW(),
  '',
  ''
),
(
  'community-staff',
  '[]'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  'Staff lounge — team coordination.',
  NOW(),
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;
