import LobbyingClient from './LobbyingClient';

/**
 * Lobbying Activity dataset page — redesigned family (like gov-contracts /
 * political tracker). Opts out of the old MarketingPageShell/DatasetsSubnav via
 * the datasets layout's STANDALONE_ROUTES.
 *
 * Data: the interactive client reads the /api/lobbying/* routes (Supabase-first
 * cache written by /api/cron/ingest-lobbying, live LDA fallback, honest empties).
 * Source: Senate LDA (lda.gov). No mock data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Lobbying activity | Ezana',
  description:
    'Lobbying Disclosure Act filings — who is paying whom to influence Washington. Sourced from the Senate LDA API (lda.gov).',
};

export default function LobbyingPage() {
  return <LobbyingClient />;
}
