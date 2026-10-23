/**
 * The generic Sonar pipeline (sonar-ezanaql-coverage-prompt.md, reference
 * entry point): Cluster -> adapters -> link ratios -> charts -> news ->
 * brief. The brief is LLM-composed with signature-matched exemplars and the
 * same validator as the template engine; when composition fails twice (or
 * the LLM is unavailable), deterministicBrief() builds a plain, cited brief
 * from the KPIs and narratives, so the answer is NEVER empty while any
 * dataset matched.
 */
import { signature } from '@/lib/sonar/cluster';
import { getAdapter } from '@/lib/sonar/adapters';
import { applicableLinks, computeRatios } from '@/lib/sonar/links';
import { chooseCharts } from '@/lib/sonar/charts-choose';
import { fetchClusterNews } from '@/lib/sonar/news';
import { getDatasetDef } from '@/lib/sonar/catalog';

const MID = '·';
const fmtValue = (v, fmt) => {
  if (v == null || !Number.isFinite(Number(v))) return MID;
  const n = Number(v);
  if (fmt === 'currency_compact') {
    if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}K`;
    return `$${Math.round(n)}`;
  }
  if (fmt === 'pct') return `${(n * 100).toFixed(1)}%`;
  if (fmt === 'ratio') return n >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(2);
  return n.toLocaleString('en-US');
};

/** Assemble the per-dataset material once. */
export function assemble(cluster) {
  const perDataset = [];
  for (const id of cluster.datasets) {
    const adapter = getAdapter(id);
    if (!adapter) continue;
    const rows = cluster.rowsByDataset[id] || [];
    perDataset.push({
      adapter,
      id,
      rows,
      card: adapter.matchCard(rows, cluster),
      kpis: adapter.kpis(rows, cluster),
      series: adapter.chartSeries(rows, cluster),
      sources: adapter.sources(rows),
      digest: adapter.digest(rows),
    });
  }
  return perDataset;
}

/** Number every source S1..Sn across datasets then news. */
export function numberSources(perDataset, newsItems = []) {
  const sources = [];
  for (const d of perDataset) {
    for (const s of d.sources) sources.push({ id: `S${sources.length + 1}`, ...s });
  }
  for (const n of newsItems) {
    sources.push({
      id: `S${sources.length + 1}`,
      dataset: 'news',
      label: n.title,
      url: n.url || null,
      row: n,
    });
  }
  return sources;
}

/**
 * The fallback brief: deterministic, template-generated from KPIs, ratios
 * and link narratives, every figure cited to its dataset's first source.
 * Plain prose, findings only, no model involved.
 */
export function deterministicBrief({ cluster, perDataset, ratios, sources }) {
  const firstSourceOf = (datasetId) => sources.find((s) => s.dataset === datasetId)?.id || null;
  const brief = [];
  for (const d of perDataset) {
    if (!d.rows.length) continue;
    const def = getDatasetDef(d.id);
    const cite = firstSourceOf(d.id);
    const kpiText = d.kpis
      .slice(0, 3)
      .map((k) => `${k.label.replace(`${def.label}: `, '')} ${fmtValue(k.value, k.fmt)}`)
      .join(', ');
    brief.push({
      section: def.label,
      text:
        `${def.label} matched ${d.rows.length.toLocaleString('en-US')} rows${
          kpiText ? `: ${kpiText}` : ''
        } ${cite ? `[${cite}]` : ''}`.trim() + '.',
    });
  }
  const links = applicableLinks(cluster).filter((l) => l.narrative);
  if (links.length || ratios.length) {
    const parts = [];
    for (const r of ratios.slice(0, 3)) {
      const citeA = firstSourceOf('gov.contracts') || firstSourceOf(cluster.datasets[0]);
      parts.push(`${r.label}: ${fmtValue(r.value, r.fmt)}${citeA ? ` [${citeA}]` : ''}.`);
    }
    if (!parts.length && links[0]) {
      const cite = firstSourceOf(links[0].pair[0]);
      parts.push(
        `${getDatasetDef(links[0].pair[0]).label} and ${getDatasetDef(links[0].pair[1]).label} overlap on the same entities${cite ? ` [${cite}]` : ''}.`,
      );
    }
    if (parts.length) brief.push({ section: 'Connections', text: parts.join(' ') });
  }
  const topEntity = cluster.entities[0]?.labels?.[0] || cluster.query || 'this cluster';
  const total = perDataset.reduce((t, d) => t + d.rows.length, 0);
  return {
    headline: `${String(topEntity)}: ${cluster.datasets.length} dataset${
      cluster.datasets.length === 1 ? '' : 's'
    } matched with ${total.toLocaleString('en-US')} rows${
      firstSourceOf(cluster.datasets[0]) ? ` [${firstSourceOf(cluster.datasets[0])}]` : ''
    }.`,
    brief,
    followups: [],
    deterministic: true,
  };
}

/**
 * Run the generic pipeline over a Cluster. `compose` is injected (the v2
 * composer in production, a mock in the coverage tests) and may be null to
 * force the deterministic brief.
 */
export async function runSonarCluster(
  cluster,
  { compose = null, exemplars = [], newsOverride = null } = {},
) {
  const sig = signature(cluster);
  const perDataset = assemble(cluster);
  const ratios = computeRatios(cluster);
  const links = applicableLinks(cluster);
  const news = newsOverride || (await fetchClusterNews(cluster));
  const sources = numberSources(perDataset, news.items);

  let brief = null;
  if (compose && sources.length) {
    try {
      brief = await compose({ cluster, sig, perDataset, ratios, links, sources, exemplars });
    } catch {
      brief = null;
    }
  }
  if (!brief && sources.length) {
    brief = deterministicBrief({ cluster, perDataset, ratios, sources });
  }

  const primaryFirst = [...perDataset].sort((a, b) => {
    if (a.id === cluster.datasets[0]) return -1;
    if (b.id === cluster.datasets[0]) return 1;
    return b.rows.length - a.rows.length;
  });

  return {
    signature: sig,
    headline: brief?.headline || null,
    brief: brief?.brief || [],
    deterministic: Boolean(brief?.deterministic),
    matches: primaryFirst.map((d) => ({
      id: d.id,
      status: d.rows.length ? 'ok' : 'empty',
      count: d.rows.length,
      card: d.card,
      rows: d.digest,
    })),
    matchesOrder: primaryFirst.map((d) => d.id),
    kpis: [
      ...perDataset.flatMap((d) => d.kpis),
      ...ratios.map((r) => ({ id: r.id, label: r.label, value: r.value, fmt: r.fmt })),
    ].slice(0, 8),
    charts: chooseCharts(
      perDataset.flatMap((d) => d.series),
      cluster,
    ),
    news: news.items,
    newsQuery: news.query,
    coverageGaps: news.items.length ? [] : ['No recent news matched this cluster.'],
    sources: sources.map((s) => ({
      id: s.id,
      dataset: s.dataset,
      label: s.label,
      url: s.url || null,
    })),
    followups: brief?.followups || [],
  };
}
