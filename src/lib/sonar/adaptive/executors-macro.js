/**
 * Sonar adaptive research: executors for earnings, government exposure, macro, commodities,
 * policy, prediction markets and quant questions (Nov 2026).
 *
 *   A04 earnings            the next report date and the record against estimates
 *   B04 government exposure reported government-segment revenue and federal contract awards
 *   B08 lobbying            a company's disclosed lobbying by year and policy area
 *   B10 quant               risk and return statistics from daily closes
 *   C01 C04 C05 country     a country's stored macro, rates or currency series
 *   C09 comparison          two or more economies on the same World Bank measures
 *   C03 commodity           a commodity's price in its own range, with sourced drivers
 *   C08 prediction markets  open contracts that name what was asked about
 *   A07 A08 A10 C10 briefs  a validated, sourced research brief with the news cache
 *
 * An executor returns null to decline a question it cannot answer from its data; the ping
 * then runs on the existing pipelines. Figures are computed and say how. Nothing here
 * forecasts a price, an outcome or a decision.
 */
import { benchmarkFor } from '@/lib/sonar/market-context';
import { countryOf } from './country-ref';
import { COMMODITY_BY_ID } from '@/lib/sonar/commodity-stats';
import { sourceClass, hostOf, canonicalUrl } from './news-intelligence';
import { discoverMarkets } from './prediction-intelligence';
import { researchFindings } from './findings-research';
import { riskStats, rangeStats, commodityIdOf, earningsRecord } from './series-metrics';
import { day, pct, isoDaysAgo, ADJUSTMENT, step, sourceBook, newsItems, tooSimilar } from './kit';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const NA = 'N/A';
function money(v, d = 1) {
  if (num(v) == null) return NA;
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1e12) return `${s}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(d)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(d)}M`;
  return `${s}$${Math.round(a).toLocaleString('en-US')}`;
}
const price = (v) =>
  num(v) == null
    ? NA
    : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const companyOf = (plan) => {
  const c = plan.entities.find((e) => e.type === 'company');
  return c ? { symbol: c.ticker || null, name: c.label || c.ticker } : null;
};
const questions = (plan, list, max = 3) =>
  list
    .filter(Boolean)
    .filter((f) => !tooSimilar(f, plan.resolvedQuestion) && !tooSimilar(f, plan.originalQuestion))
    .filter((f, i, all) => all.findIndex((g) => tooSimilar(f, g)) === i)
    .slice(0, max);
const citer = (sources, research) => (urls) =>
  (urls || []).map((u) =>
    sources.add({ url: u, title: research?.titles?.[u] || hostOf(u), publisher: hostOf(u) }),
  );
const findingItems = (research, cite) =>
  research.findings.map((f) => ({
    kicker: f.label,
    title: f.title,
    text: f.text,
    note: f.interpretation ? 'Analyst interpretation' : null,
    cites: cite(f.sourceUrls),
  }));
const researchMs = (deadlineAt, reserve = 2500) =>
  Math.max(4000, (deadlineAt || Date.now() + 25000) - Date.now() - reserve);
const notAvailable = (plan, what, subject, related = []) => ({
  built: {
    lead: {
      headline: `${what} ${/s$/.test(what) ? 'are' : 'is'} not available right now`,
      text: `Sonar builds this answer from stored and reported data${subject ? ` for ${subject}` : ''}. It could not be read, so nothing is shown and nothing is estimated in its place. Try again shortly.`,
    },
    followups: { placeholder: 'Ask a follow-up…', related: questions(plan, related) },
  },
  sources: [],
  thread: subject ? { subject } : {},
});
function timelineFrom(clusters, sources) {
  const seen = new Set();
  return clusters
    .filter((c) =>
      seen.has(canonicalUrl(c.lead.url)) ? false : seen.add(canonicalUrl(c.lead.url)),
    )
    .map((c) => {
      const date = c.lead.publishedAt ? String(c.lead.publishedAt).slice(0, 10) : null;
      return {
        date,
        title: c.lead.title,
        publisher: c.lead.publisher,
        url: c.lead.url,
        sourceClass: c.lead.sourceClass || sourceClass(c.lead.url),
        corroboration: c.corroboration,
        cites: [
          sources.add({ url: c.lead.url, title: c.lead.title, publisher: c.lead.publisher, date }),
        ],
      };
    })
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
}

/* ── A04: earnings ──────────────────────────────────────────────────────── */

export async function runEarnings(plan, deps, now, telemetry) {
  const who = companyOf(plan);
  const { symbol, name } = who;
  const [rows, bars] = await Promise.all([
    deps.earnings ? step(telemetry, 'earnings_history', 8000, () => deps.earnings(symbol)) : null,
    deps.getOhlcv
      ? step(telemetry, 'daily_bars', 8000, () => deps.getOhlcv(symbol, isoDaysAgo(now, 800)))
      : null,
  ]);
  const rec = rows ? earningsRecord(rows, now) : null;
  /* The measured reaction to each report: the close before the report date to the close of
     the session after it, which spans a release before the open or after the close. */
  const closes = (bars?.bars || []).filter((b) => b?.date && num(b.close) != null && b.close > 0);
  const reaction = (date) => {
    const at = closes.findIndex((b) => b.date >= date);
    if (at < 1 || at + 1 >= closes.length) return null;
    return (closes[at + 1].close / closes[at - 1].close - 1) * 100;
  };
  const related = [
    `How have ${symbol}’s revenue, margins and free cash flow trended?`,
    `Is ${symbol} expensive compared with its peers?`,
    `Why is ${symbol} stock moving this week?`,
  ];
  if (!rec || (!rec.next && !rec.reported.length))
    return notAvailable(plan, 'Earnings dates and estimates', symbol, related);
  const sources = sourceBook();
  const src = sources.add({
    key: `earnings:${symbol}`,
    title: `${symbol} reported results and consensus estimates`,
    publisher: 'Company results and analyst consensus',
    date: rec.reported[0]?.date || rec.next?.date || null,
    detail:
      'Reported earnings per share and revenue beside the consensus estimate before each report.',
    kind: 'dataset',
  });
  const built = {};
  const parts = [];
  let headline;
  if (rec.next) {
    headline = `${name} is expected to report on ${day(rec.next.date)}`;
    parts.push(
      'The date is from the earnings calendar and may be an estimate until the company confirms it.',
    );
    const est = [
      rec.next.epsEstimated != null && `earnings of ${price(rec.next.epsEstimated)} a share`,
      rec.next.revenueEstimated != null && `revenue of ${money(rec.next.revenueEstimated)}`,
    ].filter(Boolean);
    if (est.length) parts.push(`The consensus estimate is ${est.join(' and ')}.`);
    else parts.push('No consensus estimate is on record for that report yet.');
  } else {
    headline = `${name} has no upcoming report date on record`;
    parts.push('The company has not scheduled its next report in the data Sonar holds.');
  }
  if (rec.judged)
    parts.push(
      `In its last ${rec.judged} reports with an estimate on record, earnings per share came in above the estimate ${rec.epsAbove} time${rec.epsAbove === 1 ? '' : 's'} and below it ${rec.epsBelow} time${rec.epsBelow === 1 ? '' : 's'}.`,
    );
  parts.push(
    'A record against estimates describes the past; it is not a forecast of the next report.',
  );
  built.lead = { headline, text: parts.join(' '), cites: [src], computed: true };
  if (rec.next)
    built.catalyst_calendar = {
      title: 'Next report',
      note: 'Dates can move until the company confirms them.',
      cites: [src],
      columns: [
        { key: 'date', label: 'Expected date (not confirmed)' },
        { key: 'eps', label: 'EPS estimate', num: true },
        { key: 'rev', label: 'Revenue estimate', num: true },
      ],
      rows: [
        {
          id: rec.next.date,
          cells: {
            date: day(rec.next.date),
            eps: price(rec.next.epsEstimated),
            rev: money(rec.next.revenueEstimated),
          },
        },
      ],
    };
  if (rec.reported.length)
    built.data_table = {
      title: 'Reported against the estimate',
      note: 'Surprise is the reported figure against the consensus estimate, as a share of the estimate.',
      cites: [src],
      columns: [
        { key: 'date', label: 'Reported' },
        { key: 'eps', label: 'EPS', num: true },
        { key: 'epsEst', label: 'Estimate', num: true },
        { key: 'epsS', label: 'EPS surprise', num: true },
        { key: 'rev', label: 'Revenue', num: true },
        { key: 'revS', label: 'Revenue surprise', num: true },
        { key: 'move', label: 'Two-session move', num: true },
      ],
      rows: rec.reported.map((r) => ({
        id: r.date,
        cells: {
          date: day(r.date),
          eps: price(r.epsActual),
          epsEst: price(r.epsEstimated),
          epsS: r.epsSurprisePct == null ? NA : pct(r.epsSurprisePct),
          rev: money(r.revenueActual),
          revS: r.revenueSurprisePct == null ? NA : pct(r.revenueSurprisePct),
          move: reaction(r.date) == null ? NA : pct(reaction(r.date)),
        },
      })),
    };
  const charted = [...rec.reported]
    .filter((r) => r.epsEstimated != null)
    .slice(0, 8)
    .reverse();
  if (charted.length >= 2)
    built.series_chart = {
      title: 'Earnings per share: reported against the estimate',
      note: 'As recorded by the estimates provider, which is usually the adjusted figure analysts forecast and can differ from GAAP earnings per share.',
      kind: 'bar',
      format: 'dollars',
      categories: charted.map((r) => day(r.date).replace(/, 20(\d\d)$/, " '$1")),
      series: [
        { name: 'Estimate', values: charted.map((r) => r.epsEstimated) },
        { name: 'Reported', values: charted.map((r) => r.epsActual) },
      ],
      cites: [src],
    };
  built.followups = {
    placeholder: `Ask a follow-up about ${symbol}’s results…`,
    related: questions(plan, related),
  };
  built.limitations = {
    items: [
      'Estimates are the consensus on record. Company guidance and whisper numbers are not included.',
      'Earnings per share here is the figure the estimates provider records against the consensus, usually an adjusted figure. It is not labelled GAAP and should not be read as GAAP.',
      'The two-session move is from the close before the report date to the close of the session after it. A move after a report is not shown to have been caused by it.',
      'Management guidance and earnings-call commentary are not in this answer.',
    ],
  };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: parts[0] },
  };
}

/* ── B04: government revenue and contracts ──────────────────────────────── */

export async function runGovExposure(plan, deps, now, telemetry) {
  const who = companyOf(plan);
  const { symbol, name } = who;
  const [mix, awards] = await Promise.all([
    deps.revenueMix
      ? step(telemetry, 'segment_revenue', 6000, () => deps.revenueMix(symbol))
      : null,
    deps.contracts
      ? step(telemetry, 'federal_contracts', 8000, () => deps.contracts(symbol))
      : null,
  ]);
  const related = [
    `How have ${symbol}’s revenue, margins and free cash flow trended?`,
    `How much does ${name} spend on lobbying?`,
    `What are ${symbol}’s biggest risks?`,
  ];
  const years = (awards?.years || []).filter((y) => num(y.total) != null);
  if (!mix?.latest && !years.length) {
    /* No government segment is reported and no awards match: that is an answer, when the
       sources were readable. */
    if (mix === null && awards === null)
      return notAvailable(plan, 'Segment revenue and contract awards', symbol, related);
    return {
      built: {
        lead: {
          headline: `${name} does not report a government revenue segment, and no federal prime awards are mapped to it`,
          text: `Sonar looked for a government segment in the company's reported revenue and for federal prime contract awards mapped to it. Neither was found. A company can still sell to governments through resellers or subcontracts, which neither source shows.`,
        },
        followups: {
          placeholder: `Ask a follow-up about ${symbol}…`,
          related: questions(plan, related),
        },
        limitations: {
          items: [
            'Prime awards are mapped to a company by recipient name. A subsidiary that contracts under an unmapped name is missed.',
          ],
        },
      },
      sources: [],
      thread: { subject: name, ticker: symbol },
    };
  }
  const sources = sourceBook();
  const built = {};
  const parts = [];
  let headline = null;
  if (mix?.latest) {
    const src = sources.add({
      key: `segments:${symbol}`,
      title: `${symbol} revenue by segment`,
      publisher: mix.source || 'Company-reported segment revenue (10-Q and 10-K)',
      date: mix.latest.date,
      detail: `Government: ${mix.govLabel}. Other: ${mix.otherLabel}.`,
      kind: 'dataset',
    });
    const share = (mix.ttm?.govShare ?? mix.latest.govShare) * 100;
    headline = `Government customers were ${share.toFixed(1)}% of ${name}’s reported revenue${mix.ttm ? ' over the trailing four quarters' : ' in the latest quarter'}`;
    parts.push(
      `In the quarter ended ${day(mix.latest.date)}, the ${mix.govLabel} segment reported ${money(mix.latest.gov)}${
        mix.latest.govYoy != null
          ? `, ${mix.latest.govYoy >= 0 ? 'up' : 'down'} ${Math.abs(mix.latest.govYoy * 100).toFixed(1)}% from a year earlier`
          : ''
      }.`,
    );
    built.sector_exposure = {
      title: 'Government and other revenue by quarter',
      note: 'As the company reports its segments. Growth is against the same quarter a year earlier.',
      cites: [src],
      columns: [
        { key: 'q', label: 'Quarter ended' },
        { key: 'gov', label: 'Government', num: true },
        { key: 'other', label: 'Other', num: true },
        { key: 'share', label: 'Government share', num: true },
        { key: 'yoy', label: 'Government growth', num: true },
      ],
      rows: [...mix.quarters]
        .slice(-8)
        .reverse()
        .map((q) => ({
          id: q.date,
          cells: {
            q: day(q.date),
            gov: money(q.gov),
            other: money(q.other),
            share: `${(q.govShare * 100).toFixed(1)}%`,
            yoy: q.govYoy == null ? NA : pct(q.govYoy * 100),
          },
        })),
    };
  }
  if (years.length) {
    const src = sources.add({
      key: `awards:${name}`,
      title: `Federal prime contract awards mapped to ${symbol}`,
      publisher: 'USAspending.gov (U.S. Treasury)',
      date: String(years[0].fiscalYear),
      detail: `Obligations by fiscal year and awarding agency${awards.syncedAt ? `, synced ${day(awards.syncedAt)}` : ''}. The federal fiscal year ends on September 30.`,
      kind: 'dataset',
    });
    /* The current fiscal year is still accruing: lead with the last complete one. */
    const fyNow = now.getUTCMonth() >= 9 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
    const latest = years.find((y) => y.fiscalYear < fyNow) || years[0];
    const prior = years.find((y) => y.fiscalYear === latest.fiscalYear - 1) || null;
    if (!headline)
      headline = `${name} was obligated ${money(latest.total)} in federal prime contracts in fiscal ${latest.fiscalYear}`;
    const topShare =
      latest.agencies?.[0] && latest.total > 0
        ? (latest.agencies[0].total / latest.total) * 100
        : null;
    parts.push(
      `Federal prime contract obligations mapped to ${symbol} were ${money(latest.total)} in fiscal ${latest.fiscalYear}${
        prior && prior.total > 0
          ? `, ${latest.total >= prior.total ? 'up' : 'down'} ${Math.abs((latest.total / prior.total - 1) * 100).toFixed(1)}% from fiscal ${prior.fiscalYear}`
          : ''
      }${latest.topAgency ? `. ${latest.topAgency} accounted for ${topShare != null ? `${topShare.toFixed(0)}% of it` : 'the largest share'}` : ''}.`,
    );
    const charted = [...years]
      .filter((y) => y.fiscalYear <= fyNow)
      .slice(0, 8)
      .reverse();
    if (charted.length >= 2)
      built.series_chart = {
        title: 'Federal prime contract obligations by fiscal year',
        note: `${charted.at(-1).fiscalYear === fyNow ? `Fiscal ${fyNow} is in progress. ` : ''}Obligations, not revenue.`,
        kind: 'bar',
        format: 'money',
        categories: charted.map((y) => `FY${String(y.fiscalYear).slice(2)}`),
        series: [{ name: 'Obligated', values: charted.map((y) => y.total) }],
        cites: [src],
      };
    if (latest.agencies?.length)
      built.ranking = {
        title: `Awarding agencies, fiscal ${latest.fiscalYear}`,
        note: 'How concentrated the obligations are by agency.',
        cites: [src],
        columns: [
          { key: 'agency', label: 'Agency' },
          { key: 'total', label: 'Obligated', num: true },
          { key: 'share', label: 'Share', num: true },
        ],
        rows: latest.agencies.slice(0, 8).map((a) => ({
          id: a.agency,
          cells: {
            agency: a.agency,
            total: money(a.total),
            share: latest.total > 0 ? `${((a.total / latest.total) * 100).toFixed(1)}%` : NA,
          },
        })),
      };
    /* A sensitivity, not a forecast: what a given cut to obligations is in dollars. It is
       stated against obligations only; no share of company revenue is implied. */
    built.scenario_matrix = {
      title: 'What a cut to obligations would amount to',
      label: `Arithmetic on fiscal ${latest.fiscalYear} obligations. Not a forecast, and not a share of revenue.`,
      rows: [5, 10, 20].map((cut) => ({
        kicker: `${cut}% lower`,
        title: `${money((latest.total * cut) / 100)} less obligated`,
        text: `Obligations of ${money(latest.total * (1 - cut / 100))} against ${money(latest.total)}. Revenue from an award is recognised over its period of performance, so a year's obligations and a year's revenue move differently.`,
      })),
    };
    built.data_table = {
      title: 'Federal prime contract awards',
      note: 'Obligations in a fiscal year are not revenue recognised in that year, so the two tables are not directly comparable.',
      cites: [src],
      columns: [
        { key: 'fy', label: 'Fiscal year' },
        { key: 'total', label: 'Obligated', num: true },
        { key: 'count', label: 'Awards', num: true },
        { key: 'agency', label: 'Largest awarding agency' },
      ],
      rows: years.slice(0, 6).map((y) => ({
        id: String(y.fiscalYear),
        cells: {
          fy: String(y.fiscalYear),
          total: money(y.total),
          count: num(y.count) == null ? NA : y.count.toLocaleString('en-US'),
          agency: y.topAgency || NA,
        },
      })),
    };
  }
  built.lead = {
    headline,
    text: parts.join(' '),
    cites: sources.list.map((s) => s.id),
    computed: true,
  };
  built.followups = {
    placeholder: `Ask a follow-up about ${symbol}’s government business…`,
    related: questions(plan, related),
  };
  const limits = [
    'Awards are mapped to the company by recipient name, so a subsidiary contracting under an unmapped name is missed. Subcontracts and sales through resellers are not prime awards and are not included.',
    'Obligations and reported revenue are different measures and are never divided one by the other here.',
  ];
  if (!mix?.latest)
    limits.push(
      'The company does not report a separate government segment, so no revenue share is shown.',
    );
  built.limitations = { items: limits };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: parts[0] },
  };
}

/* ── B08: lobbying ──────────────────────────────────────────────────────── */

export async function runLobbying(plan, deps, now, telemetry) {
  const who = companyOf(plan);
  const { symbol, name } = who;
  const roll = deps.lobbying
    ? await step(telemetry, 'lobbying_filings', 8000, () => deps.lobbying(symbol, name))
    : null;
  const related = [
    `How dependent is ${name} on government contracts?`,
    `Which members of Congress traded ${symbol}?`,
    `What are ${symbol}’s biggest risks?`,
  ];
  if (roll === null) return notAvailable(plan, 'Lobbying disclosures', symbol, related);
  if (!roll.byYear?.length)
    return {
      built: {
        lead: {
          headline: `No lobbying disclosures were found for ${name}`,
          text: `Sonar's index of federal lobbying reports holds no filing matched to ${symbol}. A company can also lobby through a trade association, which files under the association's own name.`,
        },
        followups: {
          placeholder: `Ask a follow-up about ${symbol}…`,
          related: questions(plan, related),
        },
      },
      sources: [],
      thread: { subject: name, ticker: symbol },
    };
  const sources = sourceBook();
  const src = sources.add({
    key: `lda:${symbol}`,
    title: `Lobbying Disclosure Act reports for ${name}`,
    publisher: 'U.S. Senate Office of Public Records',
    date: String(roll.lastYear),
    detail: roll.selfFiled
      ? 'Spending the company reported for its own lobbying. Outside firms’ income is listed separately and not added.'
      : 'Income reported by outside firms retained by the company.',
    kind: 'dataset',
  });
  const thisYear = now.getUTCFullYear();
  const complete = roll.byYear.filter((y) => y.year < thisYear);
  const last = complete.at(-1) || roll.byYear.at(-1);
  const prior = complete.at(-2) || null;
  const headline = `${name} reported ${money(last.amount)} of federal lobbying in ${last.year}`;
  const parts = [];
  if (prior && prior.amount > 0)
    parts.push(
      `That is ${last.amount >= prior.amount ? 'up' : 'down'} ${Math.abs((last.amount / prior.amount - 1) * 100).toFixed(1)}% from ${money(prior.amount)} in ${prior.year}.`,
    );
  const topArea = [...(roll.areas || [])].sort((a, b) => b.reports - a.reports)[0];
  if (topArea)
    parts.push(
      `The policy area named in the most reports is ${topArea.label.toLowerCase()}, in ${topArea.reports} of ${roll.allReports}.`,
    );
  parts.push(
    'Disclosed lobbying shows what a company told Congress it worked on. It does not show what was said or what resulted.',
  );
  const built = {
    lead: { headline, text: parts.join(' '), cites: [src], computed: true },
    ranking: {
      title: 'Reported lobbying by year',
      note: roll.byYear.some((y) => y.year === thisYear)
        ? `${thisYear} is a partial year.`
        : 'Calendar years.',
      cites: [src],
      columns: [
        { key: 'year', label: 'Year' },
        { key: 'amount', label: 'Reported', num: true },
      ],
      rows: [...roll.byYear]
        .reverse()
        .slice(0, 8)
        .map((y) => ({
          id: String(y.year),
          cells: { year: String(y.year), amount: money(y.amount) },
        })),
    },
    followups: {
      placeholder: `Ask a follow-up about ${name}’s lobbying…`,
      related: questions(plan, related),
    },
    limitations: {
      items: [
        'Reports are quarterly and rounded to the nearest $10,000. Spending under $5,000 in a quarter is not itemised.',
        'Trade-association lobbying and state-level lobbying are not in these filings.',
      ],
    },
  };
  if (roll.areas?.length)
    built.policy_tracker = {
      title: 'What the reports say it lobbied on',
      note: 'Counted from the issue codes and descriptions in the reports.',
      cites: [src],
      columns: [
        { key: 'area', label: 'Policy area' },
        { key: 'reports', label: 'Reports', num: true },
        { key: 'latest', label: 'Most recent' },
        { key: 'why', label: 'Why it can matter' },
      ],
      rows: [...roll.areas]
        .sort((a, b) => b.reports - a.reports)
        .slice(0, 8)
        .map((a) => ({
          id: a.id,
          cells: {
            area: a.label,
            reports: String(a.reports),
            latest: a.latest || NA,
            why: a.why || '',
          },
        })),
    };
  return {
    built,
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: parts[0] || '' },
  };
}

/* ── B10: risk and return statistics ────────────────────────────────────── */

export async function runQuant(plan, deps, now, telemetry) {
  const who = companyOf(plan);
  const { symbol, name } = who;
  const bench = benchmarkFor({ ticker: symbol, industry: '', sector: '' });
  const [data, benchData] = await Promise.all([
    step(telemetry, 'daily_bars', 8000, () => deps.getOhlcv(symbol, isoDaysAgo(now, 420))),
    step(telemetry, 'benchmark_bars', 8000, () =>
      deps.getOhlcv(bench.symbol, isoDaysAgo(now, 420)),
    ),
  ]);
  const st = data?.bars?.length ? riskStats(data.bars, benchData?.bars || []) : null;
  const related = [
    `Is ${symbol} technically oversold?`,
    `Why is ${symbol} stock moving this week?`,
    `Is ${symbol} expensive compared with its peers?`,
  ];
  if (!st) return notAvailable(plan, 'Daily prices', symbol, related);
  const sources = sourceBook();
  const src = sources.add({
    key: `prices:${symbol}`,
    title: `${symbol} daily closing prices`,
    publisher: 'Market data',
    date: st.asOf,
    detail: ADJUSTMENT[data.adjustment] || 'Daily closes.',
    kind: 'dataset',
  });
  const headline = `${name} returned ${pct(st.totalPct)} over ${st.sessions} sessions with ${st.volPct.toFixed(1)}% annualised volatility`;
  const parts = [
    `Its deepest fall from a prior high in the window was ${Math.abs(st.maxDrawdown.pct).toFixed(1)}%, from ${day(st.maxDrawdown.from)} to ${day(st.maxDrawdown.to)}.`,
    st.beta != null
      ? `Against ${bench.label} (${bench.symbol}) its beta was ${st.beta.toFixed(2)} and its correlation ${st.correlation.toFixed(2)}.`
      : null,
    'These describe the window measured. They are not a forecast and not a tested strategy.',
  ].filter(Boolean);
  const rows = [
    {
      label: 'Total return',
      value: pct(st.totalPct),
      note: `${day(st.from)} to ${day(st.asOf)}`,
      method: 'Last close against the first close in the window.',
    },
    st.benchTotalPct != null && {
      label: `${bench.label} (${bench.symbol})`,
      value: pct(st.benchTotalPct),
      note: 'Same window',
      method: 'Same two dates.',
    },
    {
      label: 'Annualised volatility',
      value: `${st.volPct.toFixed(1)}%`,
      note: `${st.sessions} daily returns`,
      method: 'Standard deviation of daily returns, multiplied by the square root of 252.',
    },
    st.returnPerVol != null && {
      label: 'Return per unit of volatility',
      value: st.returnPerVol.toFixed(2),
      note: 'No risk-free rate subtracted',
      method: 'Total return divided by annualised volatility, for this window only.',
    },
    {
      label: 'Maximum drawdown',
      value: `${st.maxDrawdown.pct.toFixed(1)}%`,
      note: `${day(st.maxDrawdown.from)} to ${day(st.maxDrawdown.to)}`,
      method: 'Largest fall from a prior closing high.',
    },
    st.beta != null && {
      label: 'Beta',
      value: st.beta.toFixed(2),
      note: `Against ${bench.symbol}`,
      method:
        'Covariance of daily returns with the benchmark, divided by the benchmark’s variance.',
    },
    st.correlation != null && {
      label: 'Correlation',
      value: st.correlation.toFixed(2),
      note: `Against ${bench.symbol}`,
      method: 'Correlation of daily returns on shared sessions.',
    },
    {
      label: 'Best session',
      value: pct(st.best.pct),
      note: day(st.best.date),
      method: 'Largest one-day close-to-close gain.',
    },
    {
      label: 'Worst session',
      value: pct(st.worst.pct),
      note: day(st.worst.date),
      method: 'Largest one-day close-to-close loss.',
    },
    {
      label: 'Sessions that closed higher',
      value: `${st.upDaysPct}%`,
      note: '',
      method: 'Share of sessions with a positive return.',
    },
  ].filter(Boolean);
  return {
    built: {
      lead: { headline, text: parts.join(' '), cites: [src], computed: true },
      price_comparison: {
        chart: {
          kicker: 'The window measured',
          title: `${name} vs. ${bench.label}`,
          subject: { symbol, label: `${name} (${symbol})` },
          benchmark: { symbol: bench.symbol, label: `${bench.label} (${bench.symbol})` },
          event: null,
          defaultRange: '1Y',
        },
      },
      metric_table: { title: 'Risk and return, measured', asOf: st.asOf, rows, cites: [src] },
      followups: {
        placeholder: `Ask a follow-up about ${symbol}’s risk and return…`,
        related: questions(plan, related),
      },
      limitations: {
        items: [
          'Statistics from one window change with the window. A year of daily returns is a small sample.',
          'Sonar does not run backtests in this answer: no strategy, entry rule or trading cost is tested here.',
        ],
      },
    },
    sources: sources.list,
    thread: { subject: name, ticker: symbol, headline, summary: parts[0] },
  };
}

/* ── C01, C04, C05: a country's stored series ───────────────────────────── */

const COUNTRY_VIEWS = {
  C01: { families: [], limit: 10, title: 'The economy in stored series', noun: 'macro series' },
  C04: {
    families: [
      'policy_rate',
      'inflation_monthly',
      'inflation_annual',
      'credit_gap',
      'debt_service',
      'gov_debt',
      'gdp_growth',
    ],
    limit: 8,
    title: 'Rates, inflation and credit',
    noun: 'rates and inflation series',
  },
  C05: {
    families: [
      'fx_usd',
      'fx_effective',
      'fx_reserves',
      'current_account',
      'external_debt',
      'gov_debt',
      'policy_rate',
      'geopolitical_risk',
    ],
    limit: 9,
    title: 'Currency and external position',
    noun: 'currency and external series',
  },
};
const short = (item) => {
  const m = item.meta;
  const v =
    typeof m.value === 'number'
      ? m.value.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : String(m.value);
  const unit = m.unit ? (String(m.unit).startsWith('%') ? m.unit : ` ${m.unit}`) : '';
  return `${v}${unit}`;
};

export async function runCountryMacro(plan, deps, now, telemetry) {
  const country = countryOf(plan.resolvedQuestion);
  if (!country) return null;
  const view = COUNTRY_VIEWS[plan.primaryScenario] || COUNTRY_VIEWS.C01;
  const items = deps.countryBrief
    ? await step(telemetry, 'macro_series', 9000, () =>
        deps.countryBrief(country.iso3, { families: view.families, limit: view.limit, now }),
      )
    : null;
  const related = [
    plan.primaryScenario === 'C05'
      ? `What are ${country.name}’s inflation and policy rate?`
      : `How is ${country.name}’s currency doing?`,
    'What are the largest economies in the world?',
    plan.primaryScenario === 'C01' ? null : `How is ${country.name}’s economy doing?`,
  ];
  if (items === null) return notAvailable(plan, `Stored ${view.noun}`, country.name, related);
  const rows = (items || []).filter((i) => i?.meta?.name && i.meta.value != null);
  /* Nothing stored for this country on these measures: the existing pipeline may still help. */
  if (!rows.length) return null;
  const sources = sourceBook();
  const cited = rows.map((i) =>
    sources.add({
      key: `macro:${i.meta.attribution}`,
      title: i.meta.attribution,
      publisher: i.citation?.label || i.meta.attribution,
      date: String(i.meta.period),
      detail: 'Official statistics as published. Sonar does not adjust them.',
      kind: 'dataset',
    }),
  );
  const [a, b] = rows;
  /* The first series' own history, as stored: five years, every observation. */
  const charted = rows.find(
    (i) => i.meta.source && i.meta.series_key && typeof i.meta.value === 'number',
  );
  const history =
    charted && deps.seriesHistory
      ? await step(telemetry, 'series_history', 6000, () =>
          deps.seriesHistory(charted.meta.source, charted.meta.series_key, {
            since: String(now.getUTCFullYear() - 5),
          }),
        )
      : null;
  const headline = `${country.name}: ${a.meta.name.toLowerCase()} ${short(a)}${b ? `, ${b.meta.name.toLowerCase()} ${short(b)}` : ''}`;
  const text = rows
    .slice(0, 3)
    .map((i) => i.text)
    .filter(Boolean)
    .join(' ');
  const projections = rows.some((i) => i.meta.projection);
  return {
    built: {
      lead: {
        headline,
        text: text || `${rows.length} series are shown below with their periods and sources.`,
        cites: [...new Set(cited.slice(0, 3))],
        computed: true,
      },
      ...(history?.length >= 6
        ? {
            series_chart: {
              title: `${charted.meta.name}, ${history[0].period} to ${history.at(-1).period}`,
              note: [charted.meta.unit, charted.meta.attribution].filter(Boolean).join('. '),
              kind: 'line',
              format: String(charted.meta.unit || '').startsWith('%') ? 'percent' : 'number',
              categories: history.map((h) => h.period),
              series: [{ name: charted.meta.name, values: history.map((h) => h.value) }],
              cites: [cited[rows.indexOf(charted)]],
            },
          }
        : {}),
      macro_timeseries: {
        title: view.title,
        note: 'Each row is the latest published observation, with its own period.',
        cites: [...new Set(cited)],
        columns: [
          { key: 'name', label: 'Measure' },
          { key: 'value', label: 'Latest', num: true },
          { key: 'period', label: 'Period' },
          { key: 'kind', label: 'Basis' },
          { key: 'source', label: 'Source' },
        ],
        rows: rows.map((i, n) => ({
          id: `${n}-${i.meta.series_key || i.meta.name}`,
          cells: {
            name: i.meta.scope === 'euro_area' ? `${i.meta.name} (euro area)` : i.meta.name,
            value: short(i),
            period: String(i.title.match(/\(([^)]+)\)\s*$/)?.[1] || i.meta.period),
            kind: i.meta.projection ? 'Projection' : 'Observed',
            source: i.meta.attribution,
          },
        })),
      },
      followups: {
        placeholder: `Ask a follow-up about ${country.name}…`,
        related: questions(plan, related),
      },
      limitations: {
        items: [
          'Series are published on different schedules, so the periods in the table differ. They are not combined into one figure.',
          projections
            ? 'Rows marked Projection are the publishing institution’s forecast, not an observation.'
            : 'All rows are observations. No forecast is shown.',
        ],
      },
    },
    sources: sources.list,
    thread: { subject: country.name, headline, summary: rows[0].text || '' },
  };
}

/* ── C09: comparing economies ───────────────────────────────────────────── */

export async function runCountryCompare(plan, deps, now, telemetry) {
  const payload = deps.rankings
    ? await step(telemetry, 'macro_rankings', 8000, () => deps.rankings())
    : null;
  if (!payload?.metrics) return null;
  const q = ` ${plan.resolvedQuestion.toLowerCase()} `;
  const named = Object.entries(payload.names || {})
    .filter(([, n]) => n && n.length >= 4 && q.includes(` ${n.toLowerCase()}`))
    .map(([iso3, name]) => ({ iso3, name }))
    .slice(0, 6);
  if (named.length < 2) return null;
  const cols = ['gdp_nominal_usd', 'gdp_per_capita_usd', 'gdp_growth_real'].filter(
    (id) => payload.metrics[id],
  );
  if (!cols.length) return null;
  const at = (id, iso3) => payload.metrics[id].ranked.find((r) => r[0] === iso3) || null;
  const sources = sourceBook();
  const src = sources.add({
    key: 'wb:compare',
    title: `World Development Indicators, ${cols.map((id) => payload.metrics[id].year).join(' / ')}`,
    publisher: payload.attribution || 'World Bank, World Development Indicators',
    date: String(payload.metrics[cols[0]].year),
    detail: payload.scope || null,
    kind: 'dataset',
  });
  const fmt = (id, v) => (v == null ? NA : id === 'gdp_growth_real' ? pct(v) : money(v));
  const sized = named
    .map((c) => ({ ...c, size: at(cols[0], c.iso3)?.[2] ?? null }))
    .sort((x, y) => (y.size ?? -1) - (x.size ?? -1));
  const lead = sized[0];
  const first = payload.metrics[cols[0]];
  const headline = `${lead.name} is the largest of the ${sized.length} economies compared on ${first.label.charAt(0).toLowerCase() + first.label.slice(1)}`;
  const text = `${sized
    .filter((c) => c.size != null)
    .map((c) => `${c.name} ${fmt(cols[0], c.size)}`)
    .join(
      ', ',
    )} in ${first.year}. Each measure is shown for one common year, with the country's rank among all economies measured.`;
  return {
    built: {
      lead: { headline, text, cites: [src], computed: true },
      series_chart: {
        title: `${first.label}, ${first.year}`,
        note: first.unit || '',
        kind: 'bar',
        format: cols[0] === 'gdp_growth_real' ? 'percent' : 'money',
        categories: sized.map((c) => c.name),
        series: [{ name: first.label, values: sized.map((c) => c.size) }],
        cites: [src],
      },
      ranking: {
        title: 'Side by side',
        note: cols
          .map((id) => `${payload.metrics[id].label}: ${payload.metrics[id].year}`)
          .join('. '),
        cites: [src],
        columns: [
          { key: 'name', label: 'Economy' },
          ...cols.flatMap((id) => [
            { key: id, label: payload.metrics[id].label, num: true },
            { key: `${id}_r`, label: 'Rank', num: true },
          ]),
        ],
        rows: sized.map((c) => ({
          id: c.iso3,
          cells: Object.fromEntries([
            ['name', c.name],
            ...cols.flatMap((id) => {
              const r = at(id, c.iso3);
              return [
                [id, fmt(id, r?.[2] ?? null)],
                [`${id}_r`, r ? `${r[1]} of ${payload.metrics[id].of}` : NA],
              ];
            }),
          ]),
        })),
      },
      followups: {
        placeholder: 'Ask a follow-up about these economies…',
        related: questions(plan, [
          `How is ${lead.name}’s economy doing?`,
          'Which economies are growing the fastest?',
          `How is ${sized[1].name}’s currency doing?`,
        ]),
      },
      limitations: {
        items: [
          'Values in current US dollars move with exchange rates as well as output.',
          'A country with no value for the common year shows N/A; it is not carried forward from an earlier year.',
        ],
      },
    },
    sources: sources.list,
    thread: { headline, summary: text },
  };
}

/* ── C03: a commodity ───────────────────────────────────────────────────── */

export async function runCommodity(plan, deps, now, telemetry, deadlineAt) {
  const id = commodityIdOf(plan.resolvedQuestion);
  const meta = id ? COMMODITY_BY_ID[id] : null;
  if (!meta) return null;
  const series = deps.commodity
    ? await step(telemetry, 'commodity_series', 8000, () =>
        deps.commodity(id, isoDaysAgo(now, 365)),
      )
    : null;
  const st = series?.points?.length ? rangeStats(series.points) : null;
  const research = deps.synthesize
    ? await step(telemetry, 'live_research', researchMs(deadlineAt), () =>
        researchFindings(
          { synthesize: deps.synthesize },
          {
            mode: 'commodity',
            question: plan.resolvedQuestion,
            company: meta.label,
            context: st
              ? `Measured: ${meta.label} last ${st.last} on ${st.asOf}; one month ${st.change1mPct}%, three months ${st.change3mPct}%, one year ${st.change1yPct}%.`
              : null,
            now,
            deadlineAt: deadlineAt ? deadlineAt - 2500 : undefined,
          },
        ),
      )
    : null;
  if (deps.synthesize && !research && !telemetry.degraded.includes('live_research'))
    telemetry.degraded.push('live_research');
  const related = [
    `Which countries are the largest economies?`,
    `What is driving ${meta.label.toLowerCase()} supply?`,
    `How is demand for ${meta.label.toLowerCase()} changing?`,
  ];
  if (!st && !research) return notAvailable(plan, `${meta.label} prices`, meta.label, related);
  const sources = sourceBook();
  const cite = citer(sources, research);
  const built = {};
  const parts = [];
  let headline;
  let src = null;
  if (st) {
    src = sources.add({
      key: `commodity:${id}`,
      title: `${meta.label} daily prices`,
      publisher: series.proxy
        ? 'Market data (exchange-traded proxy)'
        : 'Market data (front-month futures)',
      date: st.asOf,
      detail: `${st.observations} daily observations from ${day(st.from)}.`,
      kind: 'dataset',
    });
    const dir = st.change1mPct == null ? null : st.change1mPct >= 0 ? 'up' : 'down';
    headline = `${meta.label} is at ${price(st.last)}${dir ? `, ${dir} ${Math.abs(st.change1mPct).toFixed(1)}% in a month` : ''}`;
    if (st.rangePositionPct != null)
      parts.push(
        `That is ${st.rangePositionPct}% of the way from its one-year low of ${price(st.low.value)} (${day(st.low.date)}) to its high of ${price(st.high.value)} (${day(st.high.date)}).`,
      );
    /* The stored closes, thinned to about sixty points by taking every nth: no smoothing. */
    const pts = series.points.filter((p) => p?.date && num(p.value) != null);
    const nth = Math.max(1, Math.ceil(pts.length / 60));
    const shown = pts.filter((_, i) => i % nth === 0 || i === pts.length - 1);
    if (shown.length >= 6)
      built.series_chart = {
        title: `${meta.label}: one year of daily closes`,
        note: `${day(shown[0].date)} to ${day(shown.at(-1).date)}.`,
        kind: 'line',
        format: 'dollars',
        categories: shown.map((p) => day(p.date).replace(/ \d+, (\d{4})$/, ' $1')),
        series: [{ name: meta.label, values: shown.map((p) => p.value) }],
        cites: [src],
      };
    built.metric_table = {
      title: 'The price, measured',
      asOf: st.asOf,
      cites: [src],
      rows: [
        {
          label: 'Latest',
          value: price(st.last),
          note: day(st.asOf),
          method: 'Last daily close in the series.',
        },
        st.change1mPct != null && {
          label: 'One month',
          value: pct(st.change1mPct),
          note: '',
          method: 'Against the close 30 days earlier.',
        },
        st.change3mPct != null && {
          label: 'Three months',
          value: pct(st.change3mPct),
          note: '',
          method: 'Against the close 91 days earlier.',
        },
        st.change1yPct != null && {
          label: 'One year',
          value: pct(st.change1yPct),
          note: '',
          method: 'Against the close 365 days earlier.',
        },
        {
          label: 'One-year high',
          value: price(st.high.value),
          note: day(st.high.date),
          method: 'Highest daily close in the window.',
        },
        {
          label: 'One-year low',
          value: price(st.low.value),
          note: day(st.low.date),
          method: 'Lowest daily close in the window.',
        },
      ].filter(Boolean),
    };
  }
  if (research) {
    if (research.answer) parts.push(research.answer);
    built.key_findings = {
      title: 'What is driving supply and demand',
      label:
        'From official statistics and reporting. Items without a source are marked as interpretation.',
      items: findingItems(research, cite),
    };
    if (research.watch.length)
      built.watchpoints = { title: 'What to monitor', items: research.watch };
  }
  if (!headline)
    headline =
      research.headline || `What official data and reporting say about ${meta.label.toLowerCase()}`;
  built.lead = {
    headline,
    text: parts.join(' ') || 'The measured price is shown below.',
    cites: src ? [src] : [],
  };
  built.followups = {
    placeholder: `Ask a follow-up about ${meta.label.toLowerCase()}…`,
    related: questions(plan, [...(research?.followups || []), ...related]),
  };
  const limits = [
    'Sonar reports the measured price and what sources say is driving it. It does not forecast where the price goes.',
  ];
  if (!st) limits.push('The price series could not be read, so no price is shown.');
  if (!research && deps.synthesize)
    limits.push(
      'The search for supply and demand reporting did not complete, so only the measured price is shown.',
    );
  built.limitations = { items: limits };
  return {
    built,
    sources: sources.list,
    thread: { subject: meta.label, headline, summary: parts[0] || '' },
  };
}

/* ── C08: prediction markets ────────────────────────────────────────────── */

const topicTerms = (plan) => {
  const country = countryOf(plan.resolvedQuestion);
  return [...plan.entities.flatMap((e) => [e.label, e.ticker]), country?.name].filter(
    (t) => t && String(t).length >= 3,
  );
};

export async function runPredictionMarkets(plan, deps, now, telemetry) {
  const terms = topicTerms(plan);
  if (!terms.length || !deps.retrieveMarkets) return null;
  const found = await step(telemetry, 'prediction_markets', 8000, () =>
    discoverMarkets(
      { retrieve: deps.retrieveMarkets, admin: deps.admin },
      { query: plan.resolvedQuestion, eventType: 'topic', entityTerms: terms, now, limit: 8 },
    ),
  );
  const subject = terms[0];
  const related = [
    `What has been reported about ${subject} this week?`,
    `What are the largest economies in the world?`,
  ];
  if (!found) return notAvailable(plan, 'The prediction market index', subject, related);
  const built = {};
  let headline;
  let text;
  if (found.markets.length) {
    const top = found.markets[0];
    headline = `${found.markets.length} open contract${found.markets.length === 1 ? '' : 's'} name${found.markets.length === 1 ? 's' : ''} ${subject}`;
    text = `The most traded asks: "${top.question}" Its last indexed price for Yes was ${Math.round(top.yesPrice * 100)} cents. A price is what traders paid on that venue; it is not a forecast, and contracts with different rules are not comparable.`;
    built.forecast_market = {
      title: 'Matching open contracts',
      note: 'Each row is one contract’s last indexed price on its own venue. Prices are not added or averaged across contracts.',
      markets: found.markets,
    };
  } else {
    headline = `No open prediction contract names ${subject}`;
    text = `Sonar checked ${found.considered} indexed contract${found.considered === 1 ? '' : 's'} and none is open, priced and about ${subject}. Nothing is shown in their place.`;
  }
  built.lead = { headline, text };
  built.followups = {
    placeholder: 'Ask a follow-up about these contracts…',
    related: questions(plan, related),
  };
  built.limitations = {
    items: [
      'Prices are refreshed on a schedule and shown with the time they were indexed. They are not live quotes.',
      'Read each contract’s resolution rules before comparing it with another: similar questions can settle differently.',
    ],
  };
  return {
    built,
    sources: [],
    thread: { subject, headline, summary: text },
    marketAudit: {
      considered: found.considered,
      shown: found.markets.length,
      rejected: found.rejected.slice(0, 8),
    },
  };
}

/* ── A07, A08, A10, C10: sourced research briefs ────────────────────────── */

const BRIEFS = {
  A07: {
    mode: 'regulatory',
    title: 'Where the matter stands',
    markets: true,
    terms: ['ruling', 'court', 'regulator', 'approval', 'antitrust', 'lawsuit', 'bill', 'vote'],
  },
  A08: {
    mode: 'geopolitical',
    title: 'What happened and how it travels',
    markets: true,
    terms: ['sanctions', 'tariff', 'conflict', 'election', 'strike', 'ceasefire', 'export'],
  },
  A10: {
    mode: 'narrative',
    title: 'How the view has changed',
    markets: false,
    terms: ['shares', 'analysts', 'sentiment', 'upgrade', 'downgrade', 'outlook'],
  },
  C10: {
    mode: 'supply_chain',
    title: 'Who supplies whom',
    markets: false,
    terms: ['supplier', 'supply', 'shortage', 'factory', 'shipping', 'export', 'capacity'],
  },
};

export async function runSourcedBrief(plan, deps, now, telemetry, deadlineAt) {
  const cfg = BRIEFS[plan.primaryScenario];
  if (!cfg || !deps.synthesize) return null;
  const company = companyOf(plan);
  const person = plan.entities.find((e) => e.type === 'person')?.label || null;
  const country = countryOf(plan.resolvedQuestion);
  const subject = company?.name || person || country?.name || null;
  const terms = [company?.name, company?.symbol, person, country?.name].filter(Boolean);
  const [research, clusters, market] = await Promise.all([
    step(telemetry, 'live_research', researchMs(deadlineAt, 4000), () =>
      researchFindings(
        { synthesize: deps.synthesize },
        {
          mode: cfg.mode,
          question: plan.resolvedQuestion,
          company: company?.name || subject,
          ticker: company?.symbol,
          now,
          deadlineAt: deadlineAt ? deadlineAt - 4000 : undefined,
        },
      ),
    ),
    terms.length
      ? newsItems(deps, telemetry, {
          tickers: company?.symbol ? [company.symbol] : [],
          phrase: terms.join(' '),
          entityTerms: terms,
          eventTerms: cfg.terms,
          now,
          limit: 6,
        })
      : [],
    cfg.markets && terms.length && deps.retrieveMarkets
      ? step(telemetry, 'prediction_markets', 6000, () =>
          discoverMarkets(
            { retrieve: deps.retrieveMarkets, admin: deps.admin },
            { query: plan.resolvedQuestion, eventType: 'topic', entityTerms: terms, now, limit: 4 },
          ),
        )
      : null,
  ]);
  if (!research) telemetry.degraded.push('live_research');
  /* With neither a checked brief nor any coverage there is nothing to stand on: decline. */
  if (!research && !clusters.length) return null;
  const sources = sourceBook();
  const cite = citer(sources, research);
  const built = {};
  if (research) {
    built.key_findings = {
      title: cfg.title,
      label:
        'From primary documents and reporting. Items without a source are marked as interpretation.',
      items: findingItems(research, cite),
    };
    if (research.watch.length)
      built.watchpoints = { title: 'What to monitor', items: research.watch };
  }
  const sourced = research?.headline;
  built.lead = sourced
    ? {
        headline: research.headline,
        text: research.answer,
        cites: cite(research.findings.flatMap((f) => f.sourceUrls).slice(0, 3)),
      }
    : {
        headline: `Sonar could not source an answer to this just now`,
        text: `${research ? 'The research step returned no finding it could tie to a retrieved source, so its summary is not shown; the points below are marked as interpretation. ' : 'The research step did not complete. '}${clusters.length ? 'Recent coverage from the news cache is listed below. ' : ''}Nothing is filled in from memory.`,
      };
  const timeline = timelineFrom(clusters, sources);
  if (timeline.length)
    built.news_timeline = {
      title: 'Recent coverage',
      note: 'Context from the news cache, in date order.',
      items: timeline.slice(-8),
    };
  if (market?.markets?.length)
    built.forecast_market = {
      title: 'What matching contracts are pricing',
      note: 'Each row is one contract’s last indexed price on its own venue. A price is not a forecast.',
      markets: market.markets,
    };
  if (company?.symbol && plan.primaryScenario === 'A10') {
    const bench = benchmarkFor({ ticker: company.symbol, industry: '', sector: '' });
    built.price_comparison = {
      secondary: true,
      chart: {
        kicker: 'Market context',
        title: `${company.name} vs. ${bench.label}`,
        subject: { symbol: company.symbol, label: `${company.name} (${company.symbol})` },
        benchmark: { symbol: bench.symbol, label: `${bench.label} (${bench.symbol})` },
        event: null,
        defaultRange: '3M',
      },
    };
  }
  built.followups = {
    placeholder: 'Ask a follow-up…',
    related: questions(plan, [
      ...(research?.followups || []),
      company?.symbol ? `Why is ${company.symbol} stock moving this week?` : null,
      company?.symbol ? `What are ${company.symbol}’s biggest risks?` : null,
      country ? `How is ${country.name}’s economy doing?` : null,
    ]),
  };
  const limits = [
    'This answer rests on documents and reporting retrieved for it. Points marked as interpretation are a reading, not a reported fact, and nothing here predicts an outcome.',
  ];
  if (!research) limits.push('The research step did not complete for this answer.');
  built.limitations = { items: limits };
  return {
    built,
    sources: sources.list,
    thread: {
      subject,
      ticker: company?.symbol || null,
      person,
      headline: built.lead.headline,
      summary: built.lead.text,
    },
    marketAudit: market
      ? {
          considered: market.considered,
          shown: market.markets.length,
          rejected: market.rejected.slice(0, 8),
        }
      : null,
  };
}
