-- Run in Supabase SQL Editor to list public tables exposed without RLS.
-- Fix each table: ENABLE ROW LEVEL SECURITY + policies before using anon/authenticated keys.

SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity
ORDER BY c.relname;
