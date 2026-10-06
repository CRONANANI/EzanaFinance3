/**
 * Community terms: shown once before a user's first post or comment, and
 * enforced on the server (App Store 1.2 asks for agreed terms with zero
 * tolerance for objectionable content).
 */
import { NextResponse } from 'next/server';

export const TERMS_REQUIRED_CODE = 'community_terms_required';

/** null when accepted; otherwise the 403 response to return. */
export async function communityTermsGate(admin, userId) {
  const { data } = await admin
    .from('profiles')
    .select('community_terms_accepted_at')
    .eq('id', userId)
    .maybeSingle();
  if (data?.community_terms_accepted_at) return null;
  return NextResponse.json(
    { error: 'Accept the community guidelines to post.', code: TERMS_REQUIRED_CODE },
    { status: 403 },
  );
}
