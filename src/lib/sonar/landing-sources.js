/**
 * Sonar landing sources shared with the research engine (Nov 2026): Echo
 * archive matches and the live market snapshot. Split out of
 * landing-pipeline.js so src/lib/sonar/engine/sources.js can use them
 * without an import cycle (the pipeline also reuses the engine's lobbying
 * runner). Behaviour is unchanged.
 */
import { getFmpKey } from '@/lib/fmp/upcoming-events';
import { usd } from '@/lib/research-copilot/retrievers/shared';

const FMP_STABLE = 'https://financialmodelingprep.com/stable';

/* The fetch the market snapshot uses: the status is reported, never thrown. */
async function fetchWithStatus(url, ms = 4000) {
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(ms) });
    const status = res.status;
    if (!res.ok) return { status, data: null };
    return { status, data: await res.json() };
  } catch (e) {
    return { status: e?.name === 'TimeoutError' ? 'timeout' : 'neterr', data: null };
  }
}

export async function matchEcho(admin, { name, ticker }) {
  if (!admin || !name) return null;
  try {
    const safe = name.replace(/[,()%*]/g, ' ');
    const { data } = await admin
      .from('echo_articles')
      .select('article_slug, article_title, article_excerpt, article_body, published_at')
      .eq('article_status', 'published')
      /* No date window. The dossier's news leg is about what is current; this
         is the archive, and a two-year-old Echo piece on a defense prime is
         exactly the kind of coverage the claim is about. */
      .or(
        `article_title.ilike.%${safe}%,article_body.ilike.%${safe}%` +
          (ticker ? `,article_title.ilike.%${ticker}%` : ''),
      )
      .order('published_at', { ascending: false })
      .limit(2);
    if (!data?.length) return null;
    return data.map((a) => ({
      title: String(a.article_title || ''),
      slug: String(a.article_slug || ''),
      /* article_excerpt where it exists, else the first sentences of the
         plaintext body, which curated-seed.js already stores with the [[kw:]]
         markup stripped. Three sentences either way. */
      excerpt: firstSentences(a.article_excerpt || a.article_body || '', 3),
      publishedAt: a.published_at || null,
    }));
  } catch (e) {
    console.error('[sonar-pipeline] echo matches failed:', e?.message);
    return null;
  }
}

function firstSentences(raw, n) {
  const text = String(raw || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[\[kw:[^\]]*\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts) return text.slice(0, 220);
  return parts.slice(0, n).join(' ').trim();
}

/* $1.75T, $482.1B, $310.0M. */
function compactUsd(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  return usd(v);
}

/**
 * Live market data for a resolved company, as one (market) snippet: where it
 * trades, since when, the last price and day move, market cap and 52-week
 * range. The listing date is what answers "has it gone public" for a new
 * listing that no model knows about. Never names the data vendor.
 */
export async function marketSnapshot(ticker, ms = 1_200) {
  const key = getFmpKey();
  if (!key || !ticker) return null;
  const k = encodeURIComponent(key);
  const sym = encodeURIComponent(ticker);
  const [q, p] = await Promise.all([
    fetchWithStatus(`${FMP_STABLE}/quote?symbol=${sym}&apikey=${k}`, ms),
    fetchWithStatus(`${FMP_STABLE}/profile?symbol=${sym}&apikey=${k}`, ms),
  ]);
  const quote = (Array.isArray(q.data) ? q.data[0] : q.data) || null;
  const prof = (Array.isArray(p.data) ? p.data[0] : p.data) || null;
  const price = Number(quote?.price ?? prof?.price);
  const name = String(prof?.companyName || quote?.name || ticker);
  if (!Number.isFinite(price) && !prof?.companyName) return null;
  const exchange = prof?.exchangeFullName || prof?.exchange || quote?.exchange || null;
  const ipoDate = /^\d{4}-\d{2}-\d{2}/.test(String(prof?.ipoDate || ''))
    ? String(prof.ipoDate).slice(0, 10)
    : null;
  const chg = Number(quote?.changePercentage ?? quote?.changesPercentage);
  const cap = compactUsd(quote?.marketCap ?? prof?.marketCap ?? prof?.mktCap);
  const low = Number(quote?.yearLow);
  const high = Number(quote?.yearHigh);
  const parts = [
    `${name} (${ticker}) is a listed company${exchange ? ` trading on ${exchange}` : ''}${
      ipoDate ? `, listed since ${ipoDate}` : ''
    }.`,
  ];
  if (Number.isFinite(price)) {
    parts.push(
      `Last price $${price.toFixed(2)}${
        Number.isFinite(chg)
          ? `, ${chg >= 0 ? 'up' : 'down'} ${Math.abs(chg).toFixed(2)}% on the day`
          : ''
      }.`,
    );
  }
  if (cap) parts.push(`Market cap ${cap}.`);
  if (Number.isFinite(low) && Number.isFinite(high) && high > 0) {
    parts.push(`52-week range $${low.toFixed(2)} to $${high.toFixed(2)}.`);
  }
  const sector = [prof?.sector, prof?.industry].filter(Boolean).join(', ');
  if (sector) parts.push(`Sector: ${sector}.`);
  const today = new Date().toISOString().slice(0, 10);
  parts.push(`Market data as of ${today}.`);
  return {
    corpus: 'market',
    title: `${name} market data`,
    snippet: parts.join(' '),
    date: today,
    meta: { ticker },
  };
}
