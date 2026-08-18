-- Staff apply: show filled seats to neighbors and block applications when a role is full.
-- Safe to re-run.

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
    'lastDecision', CASE WHEN last_row.id IS NULL THEN NULL ELSE to_jsonb(last_row) END,
    'seatCounts', jsonb_build_object(
      'city_moderator', (SELECT COUNT(*)::integer FROM public.users WHERE role = 'city_moderator'),
      'city_administrator', (SELECT COUNT(*)::integer FROM public.users WHERE role = 'city_administrator'),
      'city_manager', (SELECT COUNT(*)::integer FROM public.users WHERE role = 'city_manager'),
      'director', (SELECT COUNT(*)::integer FROM public.users WHERE role = 'director')
    )
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
  seat_limit integer;
  seat_count integer;
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

  seat_limit := CASE apply_role
    WHEN 'city_moderator' THEN 5
    WHEN 'city_administrator' THEN 3
    WHEN 'city_manager' THEN 1
    WHEN 'director' THEN 1
    ELSE NULL
  END;

  IF seat_limit IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO seat_count
    FROM public.users
    WHERE role = apply_role;
    IF seat_count >= seat_limit THEN
      RAISE EXCEPTION 'That staff seat is filled';
    END IF;
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

REVOKE ALL ON FUNCTION public.my_staff_apply_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_staff_apply_state() TO authenticated;
REVOKE ALL ON FUNCTION public.submit_staff_application(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_staff_application(text, text, text, text, text) TO authenticated;
