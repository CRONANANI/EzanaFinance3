/* A Supabase client whose every call never settles (QA PLAT-1 test). */
const never = () => new Promise(() => {});
function query() {
  const q = {
    select: () => q,
    eq: () => q,
    limit: () => q,
    maybeSingle: never,
    single: never,
    then: (res, rej) => never().then(res, rej),
  };
  return q;
}
export function createServerClient() {
  return {
    auth: {
      getUser: never,
      signOut: never,
      mfa: { getAuthenticatorAssuranceLevel: never },
    },
    from: () => query(),
  };
}
