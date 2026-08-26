-- Hotfix: public community stats (given away + fulfilled) for guests and signed-in users.
-- Run in Supabase SQL Editor, then refresh the home page.

CREATE OR REPLACE FUNCTION public.community_stats()
RETURNS TABLE (
  member_count INT,
  active_listings INT,
  items_given INT,
  requests_fulfilled INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::INT FROM public.users),
    (SELECT COUNT(*)::INT FROM public.items WHERE status = 'active'),
    (SELECT COUNT(*)::INT FROM public.items WHERE type = 'giveaway' AND status = 'completed'),
    (SELECT COUNT(*)::INT FROM public.items WHERE type = 'looking' AND status = 'completed');
$$;

GRANT EXECUTE ON FUNCTION public.community_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.community_member_count() TO anon, authenticated;
