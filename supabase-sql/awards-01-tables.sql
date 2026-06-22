-- STEP 1 of 3 — Awards tables
-- Run in Supabase SQL Editor, then run awards-02-functions.sql, then awards-03-seed.sql

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "joinRank" INT;

CREATE INDEX IF NOT EXISTS users_join_rank_idx ON public.users ("joinRank");

CREATE TABLE IF NOT EXISTS public.award_definitions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  category TEXT NOT NULL DEFAULT 'community',
  "triggerType" TEXT NOT NULL DEFAULT 'manual',
  "autoRule" JSONB,
  "sortOrder" INT NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "requiresUnlock" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdByUserId" TEXT REFERENCES public.users(uid) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.user_awards (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(uid) ON DELETE CASCADE,
  "awardId" TEXT NOT NULL REFERENCES public.award_definitions(id) ON DELETE CASCADE,
  "grantedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "grantedByUserId" TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
  "revokedAt" TIMESTAMPTZ,
  "revokedByUserId" TEXT REFERENCES public.users(uid) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'auto',
  metadata JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS user_awards_active_unique
  ON public.user_awards ("userId", "awardId")
  WHERE "revokedAt" IS NULL;

CREATE INDEX IF NOT EXISTS user_awards_user_idx ON public.user_awards ("userId") WHERE "revokedAt" IS NULL;
CREATE INDEX IF NOT EXISTS user_awards_award_idx ON public.user_awards ("awardId") WHERE "revokedAt" IS NULL;
CREATE INDEX IF NOT EXISTS award_definitions_sort_idx ON public.award_definitions ("sortOrder", title);
