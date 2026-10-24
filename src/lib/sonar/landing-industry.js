/**
 * The dossier for an industry ping (Part C). Every match reads the industry
 * BASKET (the registry's public companies) or the industry's own terms, never
 * the raw query, and each leg fails soft: an empty leg renders its dataset as
 * a dry row with the "searched, no matches" state.
 */
import { industryBasket } from '@/lib/sonar/industries';
import { INDUSTRIES } from '@/lib/sonar/understand/lexicons';
import { gateMarkets } from '@/lib/sonar/relevance';

const TRADE_TYPE_LABEL = {
  purchase: 'Purchase',
  sale: 'Sale',
  sale_partial: 'Partial sale',
  exchange: 'Exchange',
};

/** Terms long enough to search on without matching unrelated words. */
export function industryTerms(industryId) {
  const ind = INDUSTRIES.find((i) => i.id === industryId);
  return [...new Set([ind?.label, ...(ind?.synonyms || [])].filter((t) => t && t.length >= 5))];
}

export async function basketCongress(admin, basket) {
  if (!admin || !basket.length) return null;
  try {
    const { data, error } = await admin
      .from('congress_trades')
      .select('bioguide_id, ticker, type, transaction_date')
      .in('ticker', basket)
      .order('transaction_date', { ascending: false })
      .limit(5);
    if (error || !data?.length) return null;
    const ids = [...new Set(data.map((r) => r.bioguide_id).filter(Boolean))];
    const { data: members } = ids.length
      ? await admin.from('congress_members').select('bioguide_id, full_name').in('bioguide_id', ids)
      : { data: [] };
    const nameOf = new Map((members || []).map((m) => [m.bioguide_id, m.full_name]));
    return data.map((r) => ({
      member: String(nameOf.get(r.bioguide_id) || 'Member of Congress'),
      type: `${TRADE_TYPE_LABEL[r.type] || String(r.type || '')} ${r.ticker}`.trim(),
      date: r.transaction_date || null,
    }));
  } catch {
    return null;
  }
}

/* Top 13F holders across the basket, merged by filer and summed by value.
   Bounded to the first eight tickers: one RPC each. */
export async function basket13f(admin, basket, match13f) {
  if (!admin || !basket.length || !match13f) return null;
  const per = await Promise.all(
    basket.slice(0, 8).map((t) => match13f(admin, { ticker: t }).catch(() => null)),
  );
  const merged = new Map();
  let quarter = null;
  for (const rows of per) {
    for (const r of rows || []) {
      quarter = quarter || r.quarter;
      const prev = merged.get(r.filer) || {
        filer: r.filer,
        valueUsd: 0,
        changeType: null,
        quarter: r.quarter,
      };
      prev.valueUsd += Number(r.valueUsd) || 0;
      merged.set(r.filer, prev);
    }
  }
  const top = [...merged.values()].sort((a, b) => b.valueUsd - a.valueUsd).slice(0, 3);
  return top.length ? top.map((r) => ({ ...r, quarter: r.quarter || quarter })) : null;
}

async function industryEcho(admin, terms) {
  if (!admin || !terms.length) return null;
  try {
    const ors = terms
      .slice(0, 4)
      .map((t) => t.replace(/[,()%*]/g, ' '))
      .flatMap((t) => [`article_title.ilike.%${t}%`, `article_excerpt.ilike.%${t}%`])
      .join(',');
    const { data } = await admin
      .from('echo_articles')
      .select('article_slug, article_title, article_excerpt, published_at')
      .eq('article_status', 'published')
      .or(ors)
      .order('published_at', { ascending: false })
      .limit(2);
    return (data || []).map((a) => ({
      title: String(a.article_title || ''),
      slug: String(a.article_slug || ''),
      excerpt: String(a.article_excerpt || ''),
      publishedAt: a.published_at || null,
    }));
  } catch {
    return null;
  }
}

async function industryMarkets(admin, terms, understood) {
  if (!admin || !terms.length) return null;
  try {
    const ors = terms.map((t) => `question.ilike.%${t.replace(/[,()%*]/g, ' ')}%`).join(',');
    const { data } = await admin
      .from('prediction_market_index')
      .select('question, description, category, probability, platform, volume')
      .or(ors)
      .order('volume', { ascending: false, nullsFirst: false })
      .limit(12);
    const kept = gateMarkets(data || [], understood).slice(0, 2);
    return kept.length
      ? kept.map((r) => ({
          question: String(r.question || ''),
          probability: r.probability == null ? null : Number(r.probability),
          platform: r.platform || null,
          related: false,
        }))
      : null;
  } catch {
    return null;
  }
}

/**
 * { kind: 'industry', industry, geo, registry, matches, echo, news } for an
 * understood industry ping. `deps.match13f` is the pipeline's own 13F reader.
 */
export async function buildIndustryDossier({ registry, understood, admin, deps = {} }) {
  const ind = registry.industry;
  const geo = (understood?.entities || []).find(
    (e) => e.kind === 'country' || e.kind === 'state_province',
  );
  const basket = industryBasket(registry);
  const terms = industryTerms(ind.id);
  const [congress, thirteenF, echo, markets] = await Promise.all([
    basketCongress(admin, basket),
    basket13f(admin, basket, deps.match13f),
    industryEcho(admin, terms),
    industryMarkets(admin, terms, understood),
  ]);
  return {
    kind: 'industry',
    name: understood?.display || ind.label,
    ticker: null,
    industry: { id: ind.id, label: ind.label },
    geo: geo ? { kind: geo.kind, id: geo.id, label: geo.label } : null,
    basket,
    registry: {
      stages: registry.stages,
      links: registry.links,
      companies: registry.companies,
      metrics: registry.metrics,
      facilities: registry.facilities,
      risks: registry.risks,
      source: registry.source,
    },
    /* Echo is capped at two and labelled "From Ezana Echo" in the UI. */
    echo: (echo || []).slice(0, 2),
    news: [],
    matches: {
      echo: echo?.length ? echo.slice(0, 2) : null,
      contracts: null,
      congress,
      sec: null,
      thirteenF,
      lobbying: null,
      markets,
    },
  };
}

/** The lines the synthesis cites for an industry: structure only, no figures. */
export function industryEvidence(dossier) {
  const stages = dossier.registry.stages || [];
  const companies = dossier.registry.companies || [];
  return stages.map((s) => {
    const names = companies
      .filter((c) => c.stage_id === s.id)
      .map((c) => `${c.company_name} (${c.ticker})`);
    return {
      corpus: 'industry_registry',
      title: `${dossier.industry.label}: ${s.label}`,
      snippet: `${s.label}${s.is_upstream_input ? ' (upstream input)' : ''}. ${s.description || ''}${
        names.length ? ` Companies in Ezana's registry at this stage: ${names.join(', ')}.` : ''
      }`,
      meta: { stage: s.id },
    };
  });
}
