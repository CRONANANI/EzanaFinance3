import { JudgeLanding } from '@/components/judge/JudgeLanding';

/**
 * Account-less judge entry point. Lives OUTSIDE the (dashboard) route group — no
 * org nav, no auth shell. The token in the path is the sole credential; the client
 * talks only to the token-gated /api/competitions/judge API (never Supabase
 * directly, never RLS). This page imports nothing that assumes a logged-in user.
 */
export const dynamic = 'force-dynamic';

export default async function JudgeLandingPage({ params }) {
  const { token } = await params;
  return <JudgeLanding token={token} />;
}
