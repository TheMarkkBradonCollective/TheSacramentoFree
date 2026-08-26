-- Hotfix: stop item_feed_image_url_map from scanning multi-megabyte data:image
-- camera dumps (statement timeout → empty home listings). Safe to re-run.
-- Paste into Supabase SQL Editor, then refresh the site.

CREATE OR REPLACE FUNCTION public.item_feed_image_url_map()
RETURNS TABLE(id text, image_urls text[])
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    i.id,
    COALESCE(
      (
        SELECT array_agg(DISTINCT u ORDER BY u)
        FROM (
          SELECT trim(part) AS u
          FROM regexp_split_to_table(
            COALESCE(substring(left(i.description, 20000) FROM '\[PHOTOS:\s*([^\]]+)\]'), ''),
            '\|'
          ) AS part
          WHERE trim(part) LIKE 'http%'
          UNION ALL
          SELECT i."imageUrl"
          WHERE i."imageUrl" LIKE 'http%'
          UNION ALL
          SELECT (regexp_match(left(i.description, 20000), '\[Photo\]:\s*(\S+)', 'i'))[1]
          WHERE (regexp_match(left(i.description, 20000), '\[Photo\]:\s*(\S+)', 'i'))[1] LIKE 'http%'
        ) AS urls(u)
        WHERE u IS NOT NULL AND u <> ''
      ),
      ARRAY[]::text[]
    ) AS image_urls
  FROM public.items i;
$$;

GRANT EXECUTE ON FUNCTION public.item_feed_image_url_map() TO anon, authenticated, service_role;
