-- Go Get ring timeout, scheduling, and pickup coordination preferences (Aug 20, 2026)
-- Run in Supabase SQL editor.

-- Opt-in pickup coordination (default false for new rows; existing neighbors stay on until they change settings)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "pickupAvailability" JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "goGetRingDurationSeconds" INTEGER NOT NULL DEFAULT 140;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "goGetRingPattern" TEXT NOT NULL DEFAULT 'ring';

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_go_get_ring_duration_check;
ALTER TABLE public.users ADD CONSTRAINT users_go_get_ring_duration_check
  CHECK ("goGetRingDurationSeconds" >= 10 AND "goGetRingDurationSeconds" <= 140);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_go_get_ring_pattern_check;
ALTER TABLE public.users ADD CONSTRAINT users_go_get_ring_pattern_check
  CHECK ("goGetRingPattern" IN ('single_beep', 'double_beep', 'triple_beep', 'ring', 'vibrate', 'vibrate_only'));

-- Live ring window on Go Get sessions
ALTER TABLE public.go_get_sessions ADD COLUMN IF NOT EXISTS "ringExpiresAt" TIMESTAMPTZ;
ALTER TABLE public.go_get_sessions ADD COLUMN IF NOT EXISTS "ringDurationSeconds" INTEGER;

ALTER TABLE public.go_get_sessions DROP CONSTRAINT IF EXISTS go_get_sessions_status_check;
ALTER TABLE public.go_get_sessions ADD CONSTRAINT go_get_sessions_status_check
  CHECK (status IN (
    'awaiting_availability', 'awaiting_schedule', 'window_offered', 'scheduled', 'active', 'arrived',
    'completed', 'cancelled', 'expired', 'disputed'
  ));

-- Optional: flip default for new signups only (does not mass-disable existing neighbors)
-- ALTER TABLE public.users ALTER COLUMN "goGetEnabled" SET DEFAULT false;
