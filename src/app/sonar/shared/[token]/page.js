import { getUserClient } from '@/lib/supabase';
import { isShareToken, publicSnapshot } from '@/lib/sonar/workspace';
import { SharedResearchView } from '@/components/sonar/workspace-pages/SharedResearchView';

/**
 * A shared Sonar answer (Sonar research workspace, Nov 13 2026). Public: no account needed,
 * outside the dashboard shell (the site's own navigation). A malformed token is refused
 * before any query; a valid one is read only through sonar_shared_research() and trimmed to
 * the public whitelist (publicSnapshot). Never indexed.
 */
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Shared research | Ezana Sonar',
  robots: { index: false, follow: false },
};

async function load(token) {
  if (!isShareToken(token)) return null;
  try {
    const { data, error } = await getUserClient().rpc('sonar_shared_research', { p_token: token });
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    return publicSnapshot({
      ...(row.snapshot || {}),
      question: row.snapshot?.question || row.question,
      depth: row.snapshot?.depth || row.depth,
    });
  } catch {
    return null;
  }
}

export default async function SharedResearchPage({ params }) {
  const data = await load(String(params?.token || ''));
  return <SharedResearchView data={data} />;
}
