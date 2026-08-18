-- Prefix-only listing descriptions for rows that still store data:image camera dumps.
-- Safe to re-run. Lets the app read DETAILS / GPS / pickup notes without downloading 4–12MB photos.
CREATE OR REPLACE FUNCTION public.item_feed_description(item_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE
    WHEN i.description IS NULL THEN ''
    WHEN position('data:image' in i.description) = 0 THEN i.description
    ELSE trim(split_part(i.description, '[PHOTOS:', 1))
  END
  FROM public.items i
  WHERE i.id = item_id;
$$;

GRANT EXECUTE ON FUNCTION public.item_feed_description(text) TO anon, authenticated, service_role;
