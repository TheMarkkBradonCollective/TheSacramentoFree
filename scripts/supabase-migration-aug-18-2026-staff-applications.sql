-- Neighbor staff applications: one pending request at a time, Yes / No / Maybe.
-- Safe to re-run. Yes, Maybe, and No all notify the applicant.
-- Maybe lets them apply again. No blocks applying for every staff role.

CREATE TABLE IF NOT EXISTS public.staff_applications (
  id TEXT PRIMARY KEY,
  "applicantUserId" TEXT NOT NULL,
  "applicantName" TEXT NOT NULL,
  "applicantEmail" TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  statement TEXT NOT NULL,
  "responseTime" TEXT NOT NULL,
  "otherGroups" TEXT NOT NULL DEFAULT '',
  "otherInfo" TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  "reviewedByUserId" TEXT,
  "reviewedByName" TEXT,
  "reviewedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_applications DROP CONSTRAINT IF EXISTS staff_applications_role_check;
ALTER TABLE public.staff_applications ADD CONSTRAINT staff_applications_role_check
  CHECK (role IN ('city_moderator', 'city_administrator', 'city_manager', 'director'));

ALTER TABLE public.staff_applications DROP CONSTRAINT IF EXISTS staff_applications_status_check;
ALTER TABLE public.staff_applications ADD CONSTRAINT staff_applications_status_check
  CHECK (status IN ('pending', 'yes', 'no', 'maybe'));

CREATE UNIQUE INDEX IF NOT EXISTS staff_applications_one_pending
  ON public.staff_applications ("applicantUserId")
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS staff_applications_pending_created_idx
  ON public.staff_applications (status, "createdAt" ASC);

CREATE INDEX IF NOT EXISTS staff_applications_applicant_idx
  ON public.staff_applications ("applicantUserId", "createdAt" DESC);

ALTER TABLE public.staff_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_applications_select" ON public.staff_applications;
CREATE POLICY "staff_applications_select" ON public.staff_applications
  FOR SELECT USING (
    auth.uid()::text = "applicantUserId"
    OR public.role_rank(public.current_user_role()) >= public.role_rank('city_administrator')
  );

DROP POLICY IF EXISTS "staff_applications_insert" ON public.staff_applications;
CREATE POLICY "staff_applications_insert" ON public.staff_applications
  FOR INSERT WITH CHECK (
    auth.uid()::text = "applicantUserId"
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "staff_applications_update" ON public.staff_applications;
CREATE POLICY "staff_applications_update" ON public.staff_applications
  FOR UPDATE USING (
    public.role_rank(public.current_user_role()) >= public.role_rank('city_administrator')
  )
  WITH CHECK (
    public.role_rank(public.current_user_role()) >= public.role_rank('city_administrator')
  );

CREATE OR REPLACE FUNCTION public.my_staff_apply_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_uid text := auth.uid()::text;
  blocked boolean := false;
  pending_row public.staff_applications;
  last_row public.staff_applications;
BEGIN
  IF actor_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.staff_applications
    WHERE "applicantUserId" = actor_uid AND status = 'no'
  ) INTO blocked;

  SELECT * INTO pending_row
  FROM public.staff_applications
  WHERE "applicantUserId" = actor_uid AND status = 'pending'
  ORDER BY "createdAt" ASC
  LIMIT 1;

  SELECT * INTO last_row
  FROM public.staff_applications
  WHERE "applicantUserId" = actor_uid AND status IN ('yes', 'no', 'maybe')
  ORDER BY COALESCE("reviewedAt", "updatedAt", "createdAt") DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'blocked', blocked,
    'pending', CASE WHEN pending_row.id IS NULL THEN NULL ELSE to_jsonb(pending_row) END,
    'lastDecision', CASE WHEN last_row.id IS NULL THEN NULL ELSE to_jsonb(last_row) END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_staff_application(
  apply_role text,
  statement text,
  response_time text,
  other_groups text,
  other_info text
)
RETURNS public.staff_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_uid text := auth.uid()::text;
  actor public.users%ROWTYPE;
  new_row public.staff_applications;
BEGIN
  IF actor_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO actor FROM public.users WHERE uid = actor_uid;
  IF actor.uid IS NULL THEN
    RAISE EXCEPTION 'Profile required';
  END IF;

  IF public.is_staff_role(actor.role) THEN
    RAISE EXCEPTION 'You are already on the staff team';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff_applications
    WHERE "applicantUserId" = actor_uid AND status = 'no'
  ) THEN
    RAISE EXCEPTION 'Staff applications are not open for this account';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff_applications
    WHERE "applicantUserId" = actor_uid AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a staff application waiting';
  END IF;

  IF apply_role NOT IN ('city_moderator', 'city_administrator', 'city_manager', 'director') THEN
    RAISE EXCEPTION 'Pick a staff role';
  END IF;

  IF COALESCE(btrim(statement), '') = '' THEN
    RAISE EXCEPTION 'Tell us why you want this role';
  END IF;

  IF COALESCE(btrim(response_time), '') = '' THEN
    RAISE EXCEPTION 'How quickly can you respond?';
  END IF;

  INSERT INTO public.staff_applications (
    id,
    "applicantUserId",
    "applicantName",
    "applicantEmail",
    neighborhood,
    role,
    statement,
    "responseTime",
    "otherGroups",
    "otherInfo",
    status,
    "createdAt",
    "updatedAt"
  ) VALUES (
    'sapp_' || replace(gen_random_uuid()::text, '-', ''),
    actor_uid,
    COALESCE(NULLIF(btrim(actor."displayName"), ''), 'Neighbor'),
    COALESCE(actor.email, ''),
    COALESCE(actor.neighborhood, ''),
    apply_role,
    btrim(statement),
    btrim(response_time),
    COALESCE(btrim(other_groups), ''),
    COALESCE(btrim(other_info), ''),
    'pending',
    NOW(),
    NOW()
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_staff_application(app_id text, decision text)
RETURNS public.staff_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_uid text := auth.uid()::text;
  actor public.users%ROWTYPE;
  app_row public.staff_applications;
  seat_limit integer;
  seat_count integer;
BEGIN
  IF actor_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO actor FROM public.users WHERE uid = actor_uid;
  IF public.role_rank(actor.role) < public.role_rank('city_administrator') THEN
    RAISE EXCEPTION 'City Administrator rank or above is required';
  END IF;

  IF decision NOT IN ('yes', 'no', 'maybe') THEN
    RAISE EXCEPTION 'Decision must be yes, no, or maybe';
  END IF;

  SELECT * INTO app_row FROM public.staff_applications WHERE id = app_id FOR UPDATE;
  IF app_row.id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF app_row.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'That application is no longer waiting';
  END IF;

  IF decision = 'yes' THEN
    IF actor.role IS DISTINCT FROM 'director'
       AND public.role_rank(actor.role) <= public.role_rank(app_row.role) THEN
      RAISE EXCEPTION 'A higher rank needs to approve this seat';
    END IF;

    seat_limit := CASE app_row.role
      WHEN 'city_moderator' THEN 5
      WHEN 'city_administrator' THEN 3
      WHEN 'city_manager' THEN 1
      WHEN 'director' THEN 1
      ELSE NULL
    END;

    IF seat_limit IS NOT NULL THEN
      SELECT COUNT(*)::integer INTO seat_count
      FROM public.users
      WHERE role = app_row.role
        AND uid IS DISTINCT FROM app_row."applicantUserId";
      IF seat_count >= seat_limit THEN
        RAISE EXCEPTION 'That staff seat is full. Demote someone first.';
      END IF;
    END IF;

    UPDATE public.users
    SET role = app_row.role
    WHERE uid = app_row."applicantUserId";
  END IF;

  UPDATE public.staff_applications
  SET
    status = decision,
    "reviewedByUserId" = actor_uid,
    "reviewedByName" = COALESCE(NULLIF(btrim(actor."displayName"), ''), 'Staff'),
    "reviewedAt" = NOW(),
    "updatedAt" = NOW()
  WHERE id = app_id
  RETURNING * INTO app_row;

  INSERT INTO public.moderation_audit_log (
    id, "actorUserId", "actorName", "actorRole",
    "targetUserId", "targetName", action, detail, "createdAt"
  ) VALUES (
    'mod_' || extract(epoch FROM now())::bigint || '_' || substr(md5(random()::text), 1, 8),
    actor_uid,
    COALESCE(NULLIF(btrim(actor."displayName"), ''), 'Staff'),
    actor.role,
    app_row."applicantUserId",
    app_row."applicantName",
    'staff_application_' || decision,
    COALESCE(NULLIF(btrim(actor."displayName"), ''), 'Staff')
      || ' marked staff application '
      || decision
      || ' for '
      || app_row."applicantName"
      || ' ('
      || app_row.role
      || ')',
    NOW()
  );

  BEGIN
    INSERT INTO public.user_notifications (
      id, "userId", kind, title, body, "actorUserId", "actorName", "eventType", tag, url, "createdAt"
    ) VALUES (
      'un_sapp_' || app_row.id,
      app_row."applicantUserId",
      'account_update',
      CASE decision
        WHEN 'yes' THEN 'You''re on the staff team'
        ELSE 'Staff application update'
      END,
      CASE decision
        WHEN 'yes' THEN
          'Welcome — you are now a ' || CASE app_row.role
            WHEN 'city_moderator' THEN 'City Moderator'
            WHEN 'city_administrator' THEN 'City Administrator'
            WHEN 'city_manager' THEN 'City Manager'
            ELSE 'Sacramento Buy Nothing Director'
          END || '. Staff tools are in the app.'
        WHEN 'maybe' THEN
          'Your ' || CASE app_row.role
            WHEN 'city_moderator' THEN 'City Moderator'
            WHEN 'city_administrator' THEN 'City Administrator'
            WHEN 'city_manager' THEN 'City Manager'
            ELSE 'Sacramento Buy Nothing Director'
          END || ' application came back as maybe. You can apply again for that role or any other from Account.'
        ELSE
          'Your ' || CASE app_row.role
            WHEN 'city_moderator' THEN 'City Moderator'
            WHEN 'city_administrator' THEN 'City Administrator'
            WHEN 'city_manager' THEN 'City Manager'
            ELSE 'Sacramento Buy Nothing Director'
          END || ' application was not approved. This account can''t apply for staff roles.'
      END,
      actor_uid,
      COALESCE(NULLIF(btrim(actor."displayName"), ''), 'Staff'),
      'account_update',
      'staff-apply-' || app_row.id,
      '/profile',
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
  END;

  RETURN app_row;
END;
$$;

REVOKE ALL ON FUNCTION public.my_staff_apply_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_staff_apply_state() TO authenticated;
REVOKE ALL ON FUNCTION public.submit_staff_application(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_staff_application(text, text, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.review_staff_application(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_staff_application(text, text) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND tablename = 'staff_applications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_applications;
  END IF;
END $$;
