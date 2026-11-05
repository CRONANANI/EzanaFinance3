/**
 * Sonar research engine: centralized subject resolution (engine v3, Section 3).
 *
 * One place decides what a ping is about, reusing every resolver the landing
 * pipeline already trusts: company aliases, companies named in words, the
 * understanding layer's ticker, members of Congress by bioguide id or name,
 * countries, industries and sector universes, and commodities.
 *
 * Unlike the landing pipeline's precedence chain, resolution here does not
 * pick ONE subject and discard the rest. It returns every subject the ping
 * names, with a primary, and a UNIVERSE (the set of companies the research
 * may screen) with the basis for choosing it, so a multi-domain question
 * ("semiconductor makers exposed to China-Taiwan tensions, and who holds
 * them") gets companies, countries and an industry at once.
 *
 * SERVER ONLY. Every resolver is bounded and fails soft.
 */
import { withTimeout } from '@/lib/with-timeout';
import { aliasedCompany, resolveCompany } from '@/lib/sonar/landing-pipeline';
import { mentionedCompany } from '@/lib/sonar/company-mentions';
import { resolvePolitician, resolvePoliticianById } from '@/lib/sonar/landing-politician';
import { resolveCountry } from '@/lib/sonar/landing-country';
import { sectorUniverse } from '@/lib/sonar/sector-screen';
import {
  getIndustryRegistry,
  getIndustryRegistryCached,
  industryBasket,
  peersOf,
  customersOf,
} from '@/lib/sonar/industries';
import { COMMODITIES } from '@/lib/sonar/commodity-stats';
import { hyperscalerPeers } from '@/lib/sonar/ai-infrastructure';
import { LOWERCASE_WORDS } from '@/lib/sonar/understand/blocklist';

/** Normalised alias key: lower case, letters and digits only. */
export const aliasKey = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '');

/** Word n-grams (1..4) of a ping, as alias keys, longest first. */
export function aliasGrams(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9&.' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set();
  for (let n = 4; n >= 1; n -= 1) {
    for (let i = 0; i + n <= words.length; i += 1) {
      const gram = words.slice(i, i + n);
      if (n === 1 && (gram[0].length < 4 || LOWERCASE_WORDS.has(gram[0]))) continue;
      out.add(aliasKey(gram.join(' ')));
    }
  }
  return [...out].filter((k) => k.length >= 3);
}

/**
 * Database-backed company aliases (sonar_entity_aliases, seeded from
 * contractor_tickers, lobbying_client_tickers and industry_companies). The
 * longest, most confident alias wins; ambiguous keys (one alias, several
 * tickers) are never merged: they are returned as alternatives.
 */
export async function aliasCompany(admin, text) {
  const grams = aliasGrams(text);
  if (!admin || !grams.length) return null;
  const { data, error } = await admin
    .from('sonar_entity_aliases')
    .select('alias_norm, entity_id, label, confidence')
    .eq('entity_type', 'company')
    .in('alias_norm', grams.slice(0, 60))
    .limit(40);
  if (error || !data?.length) return null;
  const rank = (r) => grams.indexOf(r.alias_norm);
  const best = [...data].sort((a, b) => rank(a) - rank(b) || b.confidence - a.confidence)[0];
  const same = data.filter((r) => r.alias_norm === best.alias_norm);
  const tickers = [...new Set(same.map((r) => r.entity_id))];
  return tickers.length === 1
    ? { ticker: tickers[0], label: best.label, confidence: best.confidence }
    : {
        ambiguous: true,
        alias: best.alias_norm,
        alternatives: same.map((r) => ({ ticker: r.entity_id, label: r.label })),
      };
}

/* The Next data cache is unavailable outside a request (benchmark scripts):
   fall back to a direct registry read. */
const registryOf = (admin, id) =>
  Promise.resolve()
    .then(() => getIndustryRegistryCached(id))
    .catch(() => getIndustryRegistry(admin, id));

const bound = async (p, ms, fallback = null) => {
  const r = await withTimeout(
    Promise.resolve().then(() => p),
    ms,
    'resolve',
  );
  return r.ok ? r.value : fallback;
};

/* Countries whose tension is about the chip supply chain: with no industry
   named, their exposure question screens Ezana's semiconductor registry. */
const CHIP_GEOS = new Set(['TW', 'CN', 'KR']);

/** The commodity a ping names, by its words (longest first). */
export function commodityOf(text) {
  const t = String(text || '').toLowerCase();
  const words = COMMODITIES.flatMap((c) => c.words.map((w) => [w, c])).sort(
    (a, b) => b[0].length - a[0].length,
  );
  const hit = words.find(([w]) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(t));
  return hit ? { id: hit[1].id, label: hit[1].label } : null;
}

/**
 * @param {object} understood understandQuery() output
 * @param {{ query: string, admin: object, ms?: number, domains?: Array<{id:string,score:number}> }} ctx
 */
export async function resolveResearch(understood, { query, admin, ms = 1100, domains = [] }) {
  const q = understood?.corrected || query;
  const entity = (k) => (understood?.entities || []).find((e) => e.kind === k) || null;
  const entities = (k) => (understood?.entities || []).filter((e) => e.kind === k);
  const active = new Set(domains.filter((d) => d.score >= 0.5).map((d) => d.id));
  const out = {
    ambiguous: null,
    subject: null,
    company: null,
    politician: null,
    countries: [],
    industry: null,
    commodity: null,
    universe: null,
    peers: [],
    customers: [],
    notes: [],
  };

  /* Company: an alias, a ticker the layer chose, or a company named in words. */
  const alias = aliasedCompany(query) || aliasedCompany(q);
  const tickerEnt = entity('ticker');
  const mention = !alias && !tickerEnt ? mentionedCompany(query) || mentionedCompany(q) : null;
  /* Database aliases last, and only when nothing above named a company. */
  const dbAlias =
    !alias && !tickerEnt && !mention
      ? await bound(aliasCompany(admin, q), Math.min(ms, 500))
      : null;
  if (dbAlias?.ambiguous) {
    out.notes.push(`ambiguous_alias:${dbAlias.alias}`);
    out.ambiguous = dbAlias;
  }
  const dbTicker =
    dbAlias && !dbAlias.ambiguous && dbAlias.confidence >= 0.8 ? dbAlias.ticker : null;
  const companyP = alias
    ? bound(resolveCompany(alias), ms)
    : tickerEnt
      ? bound(resolveCompany(`$${tickerEnt.id}`), ms)
      : mention
        ? bound(resolveCompany(`$${mention.ticker}`), ms)
        : dbTicker
          ? bound(resolveCompany(`$${dbTicker}`), ms)
          : null;

  /* Politician: by id from the understood entity, else by name. */
  const polEnt = entity('person_politician');
  const politicianP = polEnt
    ? bound(resolvePoliticianById(polEnt.id, admin), ms)
    : !tickerEnt &&
        !mention &&
        !alias &&
        (active.has('politician') || active.has('congress_trading'))
      ? bound(resolvePolitician(q, admin), ms)
      : null;

  /* Industry registry, for industry and sector questions. */
  const indEnt = entity('industry');
  const registryP = indEnt ? bound(registryOf(admin, indEnt.id), ms) : null;

  const [company, politician, registry] = await Promise.all([companyP, politicianP, registryP]);
  if (company?.ticker) out.company = company;
  if (politician) out.politician = politician;

  out.countries = entities('country').map((e) => ({
    ...(resolveCountry(e.label) || { name: e.label }),
    iso2: e.id,
  }));
  out.commodity = commodityOf(q);

  if (indEnt) {
    const u = sectorUniverse(indEnt.id, {
      label: indEnt.label,
      basket: registry ? industryBasket(registry) : [],
    });
    out.industry = { id: indEnt.id, label: u.label, registry: registry || null };
    out.universe = {
      label: `${u.label} companies`,
      tickers: u.companies.map((c) => c.ticker),
      names: Object.fromEntries(u.companies.map((c) => [c.ticker, c.name])),
      basis: registry?.companies?.length
        ? `Ezana's ${u.label.toLowerCase()} industry registry`
        : `Ezana's ${u.label.toLowerCase()} company universe`,
    };
  }

  /* A geopolitical exposure question with no company or industry named:
     chip-supply countries screen the semiconductor registry, and say so. */
  if (!out.universe && !out.company && active.has('geopolitics')) {
    const chipGeo = entities('country').some((e) => CHIP_GEOS.has(e.id));
    if (chipGeo) {
      const reg = await bound(registryOf(admin, 'semiconductors'), ms);
      const tickers = reg ? industryBasket(reg) : [];
      if (tickers.length) {
        out.industry = { id: 'semiconductors', label: 'Semiconductors', registry: reg };
        out.universe = {
          label: 'Semiconductor companies',
          tickers,
          names: Object.fromEntries((reg.companies || []).map((c) => [c.ticker, c.company_name])),
          basis:
            "Ezana's semiconductor industry registry (screened because the question names a chip-supply geography)",
        };
        out.notes.push('universe:semiconductors-by-geography');
      }
    }
  }
  /* Listed peers of a named company, for the competitive comparison. */
  if (out.company) out.peers = peersOf(out.company.ticker);
  /* A hyperscaler outside the industry registry is compared with the others. */
  if (out.company && !out.peers.length) out.peers = hyperscalerPeers(out.company.ticker);
  if (out.company) out.customers = customersOf(out.company.ticker);
  if (out.company && !out.universe) {
    out.universe = {
      label: out.company.name,
      tickers: [out.company.ticker],
      names: { [out.company.ticker]: out.company.name },
      basis: 'the company the question names',
    };
  }

  /* The primary subject, most specific first. */
  out.subject = out.politician
    ? { kind: 'politician', id: out.politician.bioguideId, label: out.politician.name }
    : out.company
      ? { kind: 'company', id: out.company.ticker, label: out.company.name }
      : out.commodity
        ? { kind: 'commodity', id: out.commodity.id, label: out.commodity.label }
        : out.industry
          ? { kind: 'industry', id: out.industry.id, label: out.industry.label }
          : out.countries[0]
            ? { kind: 'country', id: out.countries[0].iso2, label: out.countries[0].name }
            : null;
  return out;
}

/** The tickers a source may read: the universe, capped. */
export function tickersOf(resolution, cap = 12) {
  return (resolution?.universe?.tickers || []).slice(0, cap);
}
