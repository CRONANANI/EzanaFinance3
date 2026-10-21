import { Suspense } from 'react';
import LobbyingClient from './LobbyingClient';

/**
 * Lobbying Activity dataset page (Oct 21, 2026 redesign, ten cards under one
 * sticky filter bar; design in docs/design/lobbying-handoff). Opts out of the
 * marketing shell via the datasets layout's STANDALONE_ROUTES.
 *
 * Data: the client reads /api/lobbying/page (cache-only aggregates over the
 * Senate LDA copy written by /api/cron/ingest-lobbying) plus the existing
 * /api/lobbying/* routes. Source: Senate LDA (lda.gov). No mock data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Lobbying activity | Ezana',
  description:
    'Who pays to influence Washington, on which issues, through which firms, and how that reaches public companies and the members they fund. Sourced from the Senate LDA (lda.gov).',
};

export default function LobbyingPage() {
  return (
    <Suspense fallback={null}>
      <LobbyingClient />
    </Suspense>
  );
}
