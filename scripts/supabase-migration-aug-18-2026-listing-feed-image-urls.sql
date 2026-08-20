-- Extract listing photo URLs for the feed without downloading multi-MB descriptions.
-- Safe to re-run. Fixes cards that lost [PHOTOS: https://…] when descriptions contain data:image dumps.
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
            COALESCE(substring(i.description FROM '\[PHOTOS:\s*([^\]]+)\]'), ''),
            '\|'
          ) AS part
          WHERE trim(part) LIKE 'http%'
          UNION ALL
          SELECT i."imageUrl"
          WHERE i."imageUrl" LIKE 'http%'
          UNION ALL
          SELECT (regexp_match(i.description, '\[Photo\]:\s*(\S+)', 'i'))[1]
          WHERE (regexp_match(i.description, '\[Photo\]:\s*(\S+)', 'i'))[1] LIKE 'http%'
        ) AS urls(u)
        WHERE u IS NOT NULL AND u <> ''
      ),
      ARRAY[]::text[]
    ) AS image_urls
  FROM public.items i;
$$;

GRANT EXECUTE ON FUNCTION public.item_feed_image_url_map() TO anon, authenticated, service_role;
