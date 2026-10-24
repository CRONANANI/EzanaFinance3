/**
 * GET /api/datasets/cards?q=<query>
 *
 * The dataset component cards that best match a datasets search, loaded.
 * Ranks the registry (src/lib/datasets/card-registry.js) against the query,
 * then runs each matching card's own loader (the one its hub card uses, so
 * the rows are the same as on the hub and its dataset page) and returns the
 * ListCard props. Reads are the loaders' own cached reads; the response is
 * edge-cached for 15 minutes per query. Public, rate limited by IP.
 */
import { NextResponse } from 'next/server';
import { cardQualifies, rankCardsForQuery } from '@/lib/datasets/card-registry';
import { understandDeterministic } from '@/lib/sonar/understand';
import { resolveCountry } from '@/lib/sonar/landing-country';
import { CARD_LOADERS } from '@/components/datasets/hub/dataset-cards/cards';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX = 8;

export async function GET(request) {
  const rl = await checkRateLimit(`ds-cards:${getClientIp(request)}`, {
    interval: 60000,
    limit: 60,
  });
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get('q') || '').slice(0, 200);
  const matches = rankCardsForQuery(q, { limit: MAX });
  /* The entities the query resolved: a country (keyed by ISO3, the cards'
     row key) or a ticker. */
  const understood = understandDeterministic(q);
  const entities = understood.entities
    .map((e) => {
      if (e.kind === 'country') {
        const c = resolveCountry(e.label);
        return c ? { kind: 'country', key: c.iso3, label: c.name } : null;
      }
      if (e.kind === 'ticker') return { kind: 'ticker', key: e.id, label: e.label };
      return null;
    })
    .filter(Boolean);
  const countryIso3 = entities.find((e) => e.kind === 'country')?.key || null;
  const loaded = await Promise.all(
    matches.map(async (m) => {
      const load = CARD_LOADERS[m.id];
      if (!load) return null;
      try {
        const props = await load(m.entity === 'country' ? { entityIso3: countryIso3 } : undefined);
        return { ...props, datasetSlug: m.datasetSlug, score: m.score };
      } catch {
        return {
          id: m.id,
          title: m.title,
          dataset: m.dataset,
          href: m.href,
          datasetSlug: m.datasetSlug,
          rows: [],
          error: true,
          score: m.score,
        };
      }
    }),
  );
  return NextResponse.json(
    {
      ok: true,
      q,
      cards: loaded.filter((c) => c && !c.error && cardQualifies(c, c, { query: q, entities })),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600' } },
  );
}
