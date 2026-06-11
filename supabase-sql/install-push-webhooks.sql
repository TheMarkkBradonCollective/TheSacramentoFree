-- =========================================================
-- INSTALL PUSH WEBHOOKS — run once in Supabase SQL Editor
-- =========================================================
--
-- Prerequisites:
--   1. Run supabase-sql/notifications-complete.sql first
--   2. Replace YOUR_SERVICE_ROLE_KEY below (Settings → API → service_role)
--   3. Confirm WEBHOOK_URL matches your live site (default: sacramentobuynothing.com)
--
-- This creates 17 database triggers (15 logical webhooks; some tables use INSERT + UPDATE).
-- Under the hood this is the same as Database → Webhooks in the Dashboard.
--
-- Safe to re-run: drops existing push_* triggers before recreating.
-- =========================================================

DO $install$
DECLARE
  webhook_url text := 'https://sacramentobuynothing.com/api/webhooks/supabase-push';
  -- ↓ Paste your service role key between the quotes (keep the Bearer prefix out — it is added below)
  service_role_key text := 'YOUR_SERVICE_ROLE_KEY';
  webhook_headers text;
  timeout_ms text := '5000';
BEGIN
  IF service_role_key = 'YOUR_SERVICE_ROLE_KEY' OR length(trim(service_role_key)) < 20 THEN
    RAISE EXCEPTION 'Replace YOUR_SERVICE_ROLE_KEY in this script with your Supabase service_role key before running.';
  END IF;

  webhook_headers := json_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || service_role_key
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
