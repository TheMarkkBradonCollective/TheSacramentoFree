#!/usr/bin/env node
/** Emit supabase-sql/seed-feature-updates.sql — run: npx tsx scripts/generate-feature-updates-sql.mjs */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEATURE_APP_UPDATES } from '../shared/changelogFeatureUpdates.ts';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, '..', 'supabase-sql', 'seed-feature-updates.sql');

function esc(value) {
  return String(value).replace(/'/g, "''");
}

const lines = [
  '-- Paste in Supabase SQL Editor. Safe to re-run.',
  '-- Updates tab only: one row per user-facing feature change.',
  '-- Does NOT touch help_announcements (News) — post those manually in the app.',
  '-- Removes old apk-* release rows from app_updates (those are not Updates posts).',
  '',
  'ALTER TABLE public.app_updates ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;',
  '',
  'CREATE TABLE IF NOT EXISTS public.app_update_views (',
  '  "updateId" TEXT NOT NULL REFERENCES public.app_updates(id) ON DELETE CASCADE,',
  '  "userId" TEXT NOT NULL,',
  '  "viewedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),',
  '  PRIMARY KEY ("updateId", "userId")',
  ');',
  'ALTER TABLE public.app_update_views ENABLE ROW LEVEL SECURITY;',
  'CREATE INDEX IF NOT EXISTS app_update_views_update_idx ON public.app_update_views ("updateId");',
  '',
  'CREATE OR REPLACE FUNCTION public.record_app_update_view(target_update_id text)',
  'RETURNS integer',
  'LANGUAGE plpgsql',
  'SECURITY DEFINER',
  'SET search_path = public',
  'AS $recordupdateview$',
  'DECLARE',
  '  viewer_uid text;',
  '  author_uid text;',
  '  inserted_count integer;',
  '  result_count integer;',
  'BEGIN',
  '  viewer_uid := auth.uid()::text;',
  '  IF viewer_uid IS NULL OR target_update_id IS NULL OR target_update_id = \'\' THEN',
  '    RETURN NULL;',
  '  END IF;',
  '',
  '  SELECT "postedByUserId" INTO author_uid FROM public.app_updates WHERE id = target_update_id;',
  '  IF author_uid IS NULL THEN',
  '    RETURN NULL;',
  '  END IF;',
  '',
  '  IF author_uid = viewer_uid THEN',
  '    SELECT COALESCE("viewCount", 0) INTO result_count FROM public.app_updates WHERE id = target_update_id;',
  '    RETURN result_count;',
  '  END IF;',
  '',
  '  INSERT INTO public.app_update_views ("updateId", "userId")',
  '  VALUES (target_update_id, viewer_uid)',
  '  ON CONFLICT ("updateId", "userId") DO NOTHING;',
  '',
  '  GET DIAGNOSTICS inserted_count = ROW_COUNT;',
  '',
  '  IF inserted_count > 0 THEN',
  '    UPDATE public.app_updates',
  '    SET "viewCount" = COALESCE("viewCount", 0) + 1',
  '    WHERE id = target_update_id',
  '    RETURNING "viewCount" INTO result_count;',
  '  ELSE',
  '    SELECT COALESCE("viewCount", 0) INTO result_count FROM public.app_updates WHERE id = target_update_id;',
  '  END IF;',
  '',
  '  RETURN result_count;',
  'END;',
  '$recordupdateview$;',
  '',
  'REVOKE ALL ON FUNCTION public.record_app_update_view(text) FROM PUBLIC;',
  'GRANT EXECUTE ON FUNCTION public.record_app_update_view(text) TO authenticated;',
  '',
  'DELETE FROM public.app_updates WHERE id ILIKE \'%apk-%\';',
  'DELETE FROM public.app_updates WHERE id = \'2026-08-25_feed-listings-events-chat\';',
  '',
  'INSERT INTO public.app_updates (',
  '  id, date, title, body, detail,',
  '  "directorName", "directorTitle", "postedByUserId",',
  '  "createdAt", "updatedAt", "viewCount"',
  ')',
  'VALUES',
];

for (let i = 0; i < FEATURE_APP_UPDATES.length; i += 1) {
  const row = FEATURE_APP_UPDATES[i];
  const comma = i === FEATURE_APP_UPDATES.length - 1 ? '' : ',';
  lines.push(
    `  ('${row.id}', '${row.date}', '${esc(row.title)}', '${esc(row.body)}', '${esc(row.detail)}', ` +
      `'${esc(row.directorName)}', '${esc(row.directorTitle)}', '${row.postedByUserId}', ` +
      `'${row.createdAt}', '${row.updatedAt}', ` +
      `COALESCE((SELECT "viewCount" FROM public.app_updates WHERE id = '${row.id}'), 0))${comma}`,
  );
}

lines.push(
  'ON CONFLICT (id) DO UPDATE SET',
  '  date = EXCLUDED.date,',
  '  title = EXCLUDED.title,',
  '  body = EXCLUDED.body,',
  '  detail = EXCLUDED.detail,',
  '  "directorName" = EXCLUDED."directorName",',
  '  "directorTitle" = EXCLUDED."directorTitle",',
  '  "postedByUserId" = EXCLUDED."postedByUserId",',
  '  "updatedAt" = EXCLUDED."updatedAt";',
  '',
  `-- ${FEATURE_APP_UPDATES.length} feature updates seeded.`,
);

writeFileSync(OUT, `${lines.join('\n')}\n`);
console.log(`Wrote ${OUT} (${FEATURE_APP_UPDATES.length} rows)`);
