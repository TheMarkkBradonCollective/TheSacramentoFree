-- =========================================================
-- INSTALL PUSH WEBHOOKS — run once in Supabase SQL Editor
-- =========================================================
--
-- Prerequisites:
--   1. Run supabase-sql/notifications-complete.sql first
--   2. Prefer Supabase Dashboard → Database → Webhooks (sends proper { type, table, record } payloads)
--   3. If using this SQL installer, set webhook_secret below (generate: openssl rand -hex 32)
--      and add the same value as SUPABASE_PUSH_WEBHOOK_SECRET in Vercel env vars.
--   4. Confirm WEBHOOK_URL matches your live site (default: sacramentobuynothing.com)
--
-- NOTE: supabase_functions.http_request triggers send an empty body and will NOT dispatch
-- notifications with the current handler. Use Dashboard webhooks for production reliability.
--
-- This creates 17 database triggers (15 logical webhooks; some tables use INSERT + UPDATE).
-- Under the hood this is the same as Database → Webhooks in the Dashboard.
--
-- Safe to re-run: drops existing push_* triggers before recreating.
-- =========================================================

DO $install$
DECLARE
  webhook_url text := 'https://sacramentobuynothing.com/api/webhooks/supabase-push';
  -- ↓ Dedicated webhook secret (must match SUPABASE_PUSH_WEBHOOK_SECRET on Vercel)
  webhook_secret text := 'YOUR_WEBHOOK_SECRET';
  webhook_headers text;
  timeout_ms text := '5000';
BEGIN
  IF webhook_secret = 'YOUR_WEBHOOK_SECRET' OR length(trim(webhook_secret)) < 20 THEN
    RAISE EXCEPTION 'Replace YOUR_WEBHOOK_SECRET with your SUPABASE_PUSH_WEBHOOK_SECRET before running.';
  END IF;

  webhook_headers := json_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || webhook_secret
  )::text;

  -- 1. users INSERT — director join alerts
  EXECUTE 'DROP TRIGGER IF EXISTS push_users_join ON public.users';
  EXECUTE format(
    'CREATE TRIGGER push_users_join AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 2. users DELETE — director leave alerts
  EXECUTE 'DROP TRIGGER IF EXISTS push_users_leave ON public.users';
  EXECUTE format(
    'CREATE TRIGGER push_users_leave AFTER DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 3. items INSERT — new listing/request + director listing alerts
  EXECUTE 'DROP TRIGGER IF EXISTS push_listings_insert ON public.items';
  EXECUTE format(
    'CREATE TRIGGER push_listings_insert AFTER INSERT ON public.items FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 4. items UPDATE — status, saved-item, pickup alerts
  EXECUTE 'DROP TRIGGER IF EXISTS push_listings_update ON public.items';
  EXECUTE format(
    'CREATE TRIGGER push_listings_update AFTER UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 5a. message_requests INSERT
  EXECUTE 'DROP TRIGGER IF EXISTS push_dm_requests_insert ON public.message_requests';
  EXECUTE format(
    'CREATE TRIGGER push_dm_requests_insert AFTER INSERT ON public.message_requests FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 5b. message_requests UPDATE — accepted requests
  EXECUTE 'DROP TRIGGER IF EXISTS push_dm_requests_update ON public.message_requests';
  EXECUTE format(
    'CREATE TRIGGER push_dm_requests_update AFTER UPDATE ON public.message_requests FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 6. item_claim_requests INSERT
  EXECUTE 'DROP TRIGGER IF EXISTS push_claim_reqs ON public.item_claim_requests';
  EXECUTE format(
    'CREATE TRIGGER push_claim_reqs AFTER INSERT ON public.item_claim_requests FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 7. item_claims INSERT
  EXECUTE 'DROP TRIGGER IF EXISTS push_item_claims ON public.item_claims';
  EXECUTE format(
    'CREATE TRIGGER push_item_claims AFTER INSERT ON public.item_claims FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 8. item_comments INSERT
  EXECUTE 'DROP TRIGGER IF EXISTS push_comments ON public.item_comments';
  EXECUTE format(
    'CREATE TRIGGER push_comments AFTER INSERT ON public.item_comments FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 9a. item_votes INSERT
  EXECUTE 'DROP TRIGGER IF EXISTS push_votes_insert ON public.item_votes';
  EXECUTE format(
    'CREATE TRIGGER push_votes_insert AFTER INSERT ON public.item_votes FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 9b. item_votes UPDATE
  EXECUTE 'DROP TRIGGER IF EXISTS push_votes_update ON public.item_votes';
  EXECUTE format(
    'CREATE TRIGGER push_votes_update AFTER UPDATE ON public.item_votes FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 10. messages INSERT — DMs, community chat, staff chat, pickup location
  EXECUTE 'DROP TRIGGER IF EXISTS push_messages ON public.messages';
  EXECUTE format(
    'CREATE TRIGGER push_messages AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 11. moderation_audit_log INSERT
  EXECUTE 'DROP TRIGGER IF EXISTS push_moderation ON public.moderation_audit_log';
  EXECUTE format(
    'CREATE TRIGGER push_moderation AFTER INSERT ON public.moderation_audit_log FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 12. user_reports INSERT
  EXECUTE 'DROP TRIGGER IF EXISTS push_reports ON public.user_reports';
  EXECUTE format(
    'CREATE TRIGGER push_reports AFTER INSERT ON public.user_reports FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 13. support_ticket_messages INSERT
  EXECUTE 'DROP TRIGGER IF EXISTS push_support ON public.support_ticket_messages';
  EXECUTE format(
    'CREATE TRIGGER push_support AFTER INSERT ON public.support_ticket_messages FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 14. app_updates INSERT
  EXECUTE 'DROP TRIGGER IF EXISTS push_app_updates ON public.app_updates';
  EXECUTE format(
    'CREATE TRIGGER push_app_updates AFTER INSERT ON public.app_updates FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  -- 15. help_announcements INSERT
  EXECUTE 'DROP TRIGGER IF EXISTS push_announcements ON public.help_announcements';
  EXECUTE format(
    'CREATE TRIGGER push_announcements AFTER INSERT ON public.help_announcements FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(%L, %L, %L, %L, %L)',
    webhook_url, 'POST', webhook_headers, '{}', timeout_ms
  );

  RAISE NOTICE 'Push webhooks installed → %', webhook_url;
END;
$install$;

-- Verify triggers exist:
-- SELECT trigger_name, event_object_table, action_timing, event_manipulation
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public' AND trigger_name LIKE 'push_%'
-- ORDER BY event_object_table, trigger_name;
