-- DEPRECATED — do not run this file.
-- Run these IN ORDER in Supabase SQL Editor:
--   1. awards-01-tables.sql
--   2. awards-02-functions.sql
--   3. awards-03-seed.sql

DO $$
BEGIN
  RAISE EXCEPTION 'Wrong file. Run awards-01-tables.sql, then awards-02-functions.sql, then awards-03-seed.sql (in that order).';
END $$;
