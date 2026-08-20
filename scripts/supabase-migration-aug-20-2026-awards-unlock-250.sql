-- Awards unlock at 250 neighbors (was 500) — Aug 20, 2026
-- Run in Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.awards_unlocked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.community_member_count() >= 250;
$$;

GRANT EXECUTE ON FUNCTION public.awards_unlocked() TO authenticated;
