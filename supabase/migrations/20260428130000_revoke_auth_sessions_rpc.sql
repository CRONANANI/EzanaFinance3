-- Revoke all Auth refresh tokens and sessions for a user (global logout).
-- Called from the service-role client via PostgREST RPC (see /api/admin/lock-user).
-- SECURITY DEFINER runs with migration owner privileges so auth.* deletes succeed.

CREATE OR REPLACE FUNCTION public.revoke_auth_sessions_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.refresh_tokens rt
  WHERE rt.user_id::text = _user_id::text;
  DELETE FROM auth.sessions s
  WHERE s.user_id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_auth_sessions_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_auth_sessions_for_user(uuid) TO service_role;

COMMENT ON FUNCTION public.revoke_auth_sessions_for_user(uuid) IS
  'Deletes all refresh tokens and sessions for the given auth user id. Service-role only.';
