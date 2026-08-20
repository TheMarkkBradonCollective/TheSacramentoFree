-- Hard-cap guard: never downgrade real profile photos or createdAt on UPDATE.
-- Run in Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.guard_user_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Preserve original join date — client upserts must not reset createdAt.
    NEW."createdAt" := OLD."createdAt";

    -- Never replace a real uploaded photo with dicebear or NULL.
    IF OLD."photoURL" IS NOT NULL
       AND OLD."photoURL" NOT LIKE '%dicebear.com%'
       AND (
         NEW."photoURL" IS NULL
         OR NEW."photoURL" LIKE '%dicebear.com%'
       )
    THEN
      NEW."photoURL" := OLD."photoURL";
    END IF;

    -- Never replace a custom display name with an email-prefix default.
    IF OLD."displayName" IS NOT NULL
       AND length(trim(OLD."displayName")) > 0
       AND NEW."displayName" IS NOT NULL
       AND lower(trim(NEW."displayName")) = lower(split_part(NEW.email, '@', 1))
       AND lower(trim(OLD."displayName")) <> lower(split_part(OLD.email, '@', 1))
       AND lower(trim(OLD."displayName")) NOT IN ('neighbor', 'sacramento neighbor')
    THEN
      NEW."displayName" := OLD."displayName";
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_profile_identity ON public.users;
CREATE TRIGGER guard_user_profile_identity
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_profile_identity();
