/**
 * One adapter per LIVE taxonomy dataset, for the /datasets pulse: the belt of
 * signals in the top bar and the brief each signal opens on the page.
 *
 * Contract (read.js enforces it):
 *   label   the dataset's exact `label` in DATASET_TAXONOMY. The dimension,
 *           icon and page href all come from the taxonomy, never from here.
 *   source  the PUBLIC data source shown in the brief's footer. Never name
 *           Ezana infrastructure (no BigQuery, Supabase, cron, table names).
 *   read()  the SAME server reader the dataset page uses. May throw or hang;
 *           read.js bounds it with a timeout and drops it on failure.
 *   map(data, ctx) -> { items, dataset }
 *     items    belt signals, newest or strongest first, at most 4 used.
 *              { id, headline, meta, at, detail: { title, findings, stats,
 *                chart?, rows? } }
 *     dataset  the dataset-level context every one of its items shares.
 *              { asOf, findings, stats, chart?, rows? }
 *
 * Zero data invention: every number is computed from the rows the reader
 * returned, and a row missing a field its sentence needs is dropped. Prose
 * states findings, never advice. No em dashes anywhere in the copy.
 *
 * Charts are specs, not pictures (PulseBrief draws them):
 *   { kind: 'bars', title, unit, points: [{ label, value }] }
 *   { kind: 'line', title, unit, points: [{ label, value }] }   // label = date
 *   unit: 'usd' | 'pct' | 'count' | 'index' | 'raw'
 */
import { readOrbitalFeed } from '@/lib/datasets/orbital-feed';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';
import { CF_DEFAULT_CYCLE, getCampaignFinanceOverview } from '@/lib/campaign-finance/load';
import { argsFor as lobbyingArgsFor, readView as readLobbyingView } from '@/lib/lobbying/page-read';
import { getCommitteeIndex } from '@/lib/congress/committee-data';
import { getTrendingMarkets } from '@/lib/prediction-markets/trending-store';
import { getOecdLatest } from '@/lib/oecd-store';
import { OECD_CURATED_SERIES, PROJECTION_FROM_YEAR } from '@/lib/oecd-curated';
import {
  getInstitutionalOverview,
  getActivistStakes,
  getInsiderOverview,
  getExecCompTable,
  getEtfFunds,
  getFundamentalsTable,
} from '@/lib/titans/store';
import { getWhaleMoves } from '@/lib/whale-moves-store';
import { getSecFilings } from '@/lib/sec-filings-store';
import { getSupplyChain, getPatents, getNightLights, getCre } from '@/lib/eyes/store';
import { lighthouseLatest, openCrowdForecasts, sanctionsEntries } from '@/lib/lighthouse/store';
import { getSanctionsSummary } from '@/lib/sanctions/summary';
import {
  num,
  compactUsd,
  compactInt,
  pctStr,
  signedNum,
  shortDate,
  longDate,
  monthLabel,
  daysBetween,
  lastName,
  entityName,
  agencyName,
  clip,
  bandShort,
  rankBy,
  stats,
  lines,
  maxIso,
} from './format';

const VERB = { purchase: 'buys', sale: 'sells', exchange: 'exchanges' };
const HONORIFIC = { House: 'Rep.', Senate: 'Sen.' };
const CHANGE_VERB = {
  new: 'opens',
  doubled: 'doubles',
  added: 'adds',
  trimmed: 'trims',
  exited: 'exits',
};
const byAbs = (k) => (a, b) => Math.abs(b[k] ?? 0) - Math.abs(a[k] ?? 0);
const tone = (v) => (num(v) == null ? undefined : num(v) >= 0 ? 'up' : 'down');

/* Change of a series' latest point against the point ~12 months before it. */
function yoy(points) {
  const pts = (points || []).filter((p) => num(p.value) != null);
  if (pts.length < 2) return null;
  const last = pts[pts.length - 1];
  const target =
    Date.parse(`${String(last.date || last.month).slice(0, 10)}T00:00:00Z`) - 365 * 86400000;
  let base = null;
  for (const p of pts) {
    const t = Date.parse(`${String(p.date || p.month).slice(0, 10)}T00:00:00Z`);
    if (t <= target + 20 * 86400000) base = p;
  }
  if (!base || !num(base.value)) return null;
  return {
    last,
    base,
    change: ((num(last.value) - num(base.value)) / Math.abs(num(base.value))) * 100,
  };
}

const linePoints = (points, n = 36) =>
  (points || [])
    .filter((p) => num(p.value) != null)
    .slice(-n)
    .map((p) => ({ label: String(p.date || p.month).slice(0, 10), value: num(p.value) }));

/* ── Capitol Watch ───────────────────────────────────────────────────── */

const politicianTracker = {
  label: 'Politician Tracker',
  source: 'House Clerk and Senate eFD periodic transaction reports',
  read: () => readOrbitalFeed(),
  map(feed) {
    const trades = feed?.trades || [];
    const seen = new Set();
    const items = [];
    for (const t of trades) {
      const name = lastName(t.name);
      const verb = VERB[t.side];
      if (!name || !verb || !t.ticker) continue;
      const k = `${t.bioguideId}:${t.ticker}:${t.side}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const who = HONORIFIC[t.chamber] ? `${HONORIFIC[t.chamber]} ${name}` : name;
      const lag = daysBetween(t.tradedAt, t.filedAt);
      const band = bandShort(t.amountBand);
      items.push({
        id: String(t.id),
        headline: `${who} ${verb} ${t.ticker}`,
        meta: band || shortDate(t.filedAt || t.tradedAt),
        at: t.filedAt || t.tradedAt,
        detail: {
          title: `${t.name} ${verb} ${t.ticker}`,
          findings: lines(
            band &&
              `Disclosed range ${band}${t.owner ? `, held by ${String(t.owner).toLowerCase()}` : ''}.`,
            t.tradedAt &&
              `Traded ${longDate(t.tradedAt)}${t.filedAt ? `, filed ${longDate(t.filedAt)}` : ''}.`,
            lag != null &&
              lag >= 0 &&
              `Reported ${lag} day${lag === 1 ? '' : 's'} after the trade.`,
          ),
          stats: stats(
            { label: 'Range', value: band },
            { label: 'Chamber', value: t.chamber },
            { label: 'Traded', value: shortDate(t.tradedAt) },
            { label: 'Filing lag', value: lag != null && lag >= 0 ? `${lag}d` : null },
          ),
        },
      });
    }
    const buys = trades.filter((t) => t.side === 'purchase').length;
    const sells = trades.filter((t) => t.side === 'sale').length;
    const members = new Set(trades.map((t) => t.bioguideId).filter(Boolean)).size;
    const byTicker = rankBy(
      trades,
      (t) => t.ticker,
      () => 1,
      8,
    );
    return {
      items,
      dataset: {
        asOf: maxIso(...trades.map((t) => t.filedAt)),
        findings: lines(
          trades.length && `${trades.length} of the newest disclosures in the last 90 days.`,
          byTicker[0] &&
            `${byTicker[0].label} is the most traded ticker in this set (${byTicker[0].value} disclosures).`,
        ),
        stats: stats(
          { label: 'Disclosures', value: compactInt(trades.length) },
          { label: 'Buys', value: compactInt(buys) },
          { label: 'Sells', value: compactInt(sells) },
          { label: 'Members', value: compactInt(members) },
        ),
        chart: byTicker.length
          ? { kind: 'bars', title: 'Disclosures by ticker', unit: 'count', points: byTicker }
          : null,
      },
    };
  },
};

const governmentContracts = {
  label: 'Government Contracts',
  source: 'USAspending.gov federal award data',
  read: () => readOrbitalFeed(),
  map(feed) {
    const awards = feed?.awards || [];
    const items = [];
    for (const a of awards) {
      const who = entityName(a.parent || a.recipient);
      const amt = compactUsd(a.amount);
      if (!who || !amt) continue;
      const agency = agencyName(a.agency);
      items.push({
        id: String(a.id),
        headline: `${who} wins ${amt}`,
        meta: agency || shortDate(a.date),
        at: a.date,
        detail: {
          title: `${who} wins ${amt}${agency ? ` from ${agency}` : ''}`,
          findings: lines(
            `Award of ${amt} dated ${longDate(a.date) || 'recently'}.`,
            a.subAgency && `Awarding office: ${a.subAgency}.`,
            a.naicsLabel && `Industry: ${entityName(a.naicsLabel)}.`,
          ),
          stats: stats(
            { label: 'Amount', value: amt },
            { label: 'Agency', value: agency },
            { label: 'Date', value: shortDate(a.date) },
            { label: 'Fiscal year', value: a.fiscalYear ? `FY${a.fiscalYear}` : null },
          ),
        },
      });
    }
    const total = awards.reduce((s, a) => s + (num(a.amount) || 0), 0);
    const byAgency = rankBy(
      awards,
      (a) => agencyName(a.agency),
      (a) => a.amount,
      8,
    );
    return {
      items,
      dataset: {
        asOf: maxIso(...awards.map((a) => a.date)),
        findings: lines(
          awards.length &&
            `${awards.length} of the newest federal awards, ${compactUsd(total)} in total.`,
          byAgency[0] && `${byAgency[0].label} accounts for the largest share of that value.`,
        ),
        stats: stats(
          { label: 'Awards', value: compactInt(awards.length) },
          { label: 'Total value', value: compactUsd(total) },
          {
            label: 'Largest',
            value: compactUsd(Math.max(0, ...awards.map((a) => num(a.amount) || 0))),
          },
          { label: 'Agencies', value: compactInt(new Set(awards.map((a) => a.agency)).size) },
        ),
        chart: byAgency.length
          ? { kind: 'bars', title: 'Award value by agency', unit: 'usd', points: byAgency }
          : null,
      },
    };
  },
};

/* ── Titans Shadow ───────────────────────────────────────────────────── */

const insiderTrading = {
  label: 'Insider Trading',
  source: 'SEC EDGAR Form 4 filings',
  read: () => getInsiderOverview(),
  map(o) {
    if (!o) return { items: [], dataset: null };
    const row = (r, verb) => {
      const v = compactUsd(r.value);
      const who = lastName(r.insider);
      if (!v || !who || !r.ticker) return null;
      return {
        id: r.id,
        headline: `${entityName(who)} ${verb} ${r.ticker} ${v}`,
        meta: r.title ? clip(r.title, 18) : shortDate(r.date),
        at: r.date,
        detail: {
          title: `${entityName(r.insider)} ${verb} ${v} of ${entityName(r.company) || r.ticker}`,
          findings: lines(
            r.title && `Role: ${r.title}.`,
            r.shares &&
              r.price &&
              `${compactInt(r.shares)} shares at $${num(r.price).toFixed(2)} on ${longDate(r.date)}.`,
            r.ownedAfter && `Holds ${compactInt(r.ownedAfter)} shares after the trade.`,
          ),
          stats: stats(
            { label: 'Value', value: v },
            { label: 'Shares', value: compactInt(r.shares) },
            { label: 'Price', value: num(r.price) ? `$${num(r.price).toFixed(2)}` : null },
            { label: 'Date', value: shortDate(r.date) },
          ),
        },
      };
    };
    const items = [
      ...(o.topBuys || []).slice(0, 3).map((r) => row(r, 'buys')),
      ...(o.topSells || []).slice(0, 2).map((r) => row(r, 'sells')),
    ].filter(Boolean);
    const s = o.stats || {};
    const chart = (o.topBuys || [])
      .filter((r) => r.ticker && num(r.value))
      .slice(0, 8)
      .map((r) => ({ label: r.ticker, value: num(r.value) }));
    return {
      items,
      dataset: {
        asOf: o.asOf,
        findings: lines(
          s.buys != null &&
            `${s.buys} open-market buys and ${s.sells} sells by insiders in the last 30 days.`,
          s.buyValue != null &&
            s.sellValue != null &&
            `Buying totals ${compactUsd(s.buyValue) || '$0'} against ${compactUsd(s.sellValue) || '$0'} of selling.`,
        ),
        stats: stats(
          { label: 'Buys 30d', value: compactInt(s.buys) },
          { label: 'Buy value', value: compactUsd(s.buyValue), tone: 'up' },
          { label: 'Sells 30d', value: compactInt(s.sells) },
          { label: 'Sell value', value: compactUsd(s.sellValue), tone: 'down' },
        ),
        chart: chart.length
          ? { kind: 'bars', title: 'Largest insider buys, 30 days', unit: 'usd', points: chart }
          : null,
      },
    };
  },
};

const activist = {
  label: 'Activist',
  source: 'SEC EDGAR Schedule 13D and 13G filings',
  read: () => getActivistStakes({ limit: 40 }),
  map(rows) {
    const list = (rows || []).filter(
      (r) => r.filer && (r.ticker || r.subject) && num(r.percentOfClass) != null,
    );
    const items = list.slice(0, 4).map((r) => ({
      id: r.accessionNo,
      headline: `${clip(entityName(r.filer), 24)} holds ${pctStr(r.percentOfClass, 1, false)} of ${r.ticker || clip(entityName(r.subject), 18)}`,
      meta: `${r.form || '13D/G'}${r.isAmendment ? ' A' : ''}`,
      at: r.filedAt,
      detail: {
        title: `${entityName(r.filer)} discloses ${pctStr(r.percentOfClass, 2, false)} of ${entityName(r.subject) || r.ticker}`,
        findings: lines(
          `Filed ${longDate(r.filedAt)} on Schedule ${r.form || '13D/G'}${r.isAmendment ? ' (amendment)' : ''}.`,
          r.shares && `${compactInt(r.shares)} shares reported.`,
          r.reportingPersons > 1 && `${r.reportingPersons} reporting persons on the filing.`,
        ),
        stats: stats(
          { label: 'Stake', value: pctStr(r.percentOfClass, 2, false) },
          { label: 'Shares', value: compactInt(r.shares) },
          { label: 'Form', value: r.form },
          { label: 'Filed', value: shortDate(r.filedAt) },
        ),
      },
    }));
    const top = [...list].sort((a, b) => b.percentOfClass - a.percentOfClass).slice(0, 8);
    return {
      items,
      dataset: {
        asOf: maxIso(...list.map((r) => r.filedAt)),
        findings: lines(
          list.length &&
            `${list.length} of the newest beneficial-ownership filings above the 5% threshold.`,
          top[0] &&
            `Largest disclosed stake: ${pctStr(top[0].percentOfClass, 1, false)} of ${top[0].ticker || entityName(top[0].subject)}.`,
        ),
        stats: stats(
          { label: 'Filings', value: compactInt(list.length) },
          { label: '13D', value: compactInt(list.filter((r) => /13D/i.test(r.form || '')).length) },
          { label: '13G', value: compactInt(list.filter((r) => /13G/i.test(r.form || '')).length) },
          { label: 'Largest', value: top[0] ? pctStr(top[0].percentOfClass, 1, false) : null },
        ),
        chart: top.length
          ? {
              kind: 'bars',
              title: 'Largest disclosed stakes',
              unit: 'pct',
              points: top.map((r) => ({
                label: r.ticker || clip(entityName(r.subject), 14),
                value: r.percentOfClass,
              })),
            }
          : null,
      },
    };
  },
};

const whaleMoves = {
  label: 'Whale Moves',
  source: 'SEC EDGAR 13F, 13D and 13G filings, scored by Ezana',
  read: () => getWhaleMoves({ limit: 40 }),
  map(rows) {
    const list = (rows || []).filter((r) => r.filer_name && (r.ticker || r.issuer));
    const items = list.slice(0, 4).map((r) => {
      const verb = CHANGE_VERB[r.change_type] || 'moves on';
      return {
        id: String(r.id),
        headline: `${clip(entityName(r.filer_name), 26)} ${verb} ${r.ticker || clip(entityName(r.issuer), 16)}`,
        meta: num(r.whale_score) != null ? `Score ${Math.round(num(r.whale_score))}` : r.tier,
        at: r.filed_at,
        detail: {
          title: `${entityName(r.filer_name)} ${verb} ${entityName(r.issuer) || r.ticker}`,
          findings: lines(
            r.tier && `Classified as ${r.tier.toLowerCase()}.`,
            num(r.conviction_pct) != null &&
              `The position is ${pctStr(r.conviction_pct, 1, false)} of the filer's reported portfolio.`,
            r.quarter && `Quarter: ${r.quarter}.`,
          ),
          stats: stats(
            {
              label: 'Score',
              value: num(r.whale_score) != null ? String(Math.round(num(r.whale_score))) : null,
            },
            { label: 'Value', value: compactUsd(r.value_usd) },
            { label: 'Conviction', value: pctStr(r.conviction_pct, 1, false) },
            { label: 'Change', value: r.change_type },
          ),
        },
      };
    });
    const chart = list
      .slice(0, 8)
      .map((r) => ({
        label: r.ticker || clip(entityName(r.issuer), 12),
        value: num(r.whale_score),
      }))
      .filter((p) => p.value != null);
    return {
      items,
      dataset: {
        asOf: maxIso(...list.map((r) => r.filed_at)),
        findings: lines(
          list.length && `${list.length} highest-scoring institutional and activist moves on file.`,
        ),
        stats: stats(
          { label: 'Moves', value: compactInt(list.length) },
          {
            label: 'New positions',
            value: compactInt(list.filter((r) => r.change_type === 'new').length),
          },
          {
            label: 'Exits',
            value: compactInt(list.filter((r) => r.change_type === 'exited').length),
          },
          { label: 'Top score', value: chart[0] ? String(Math.round(chart[0].value)) : null },
        ),
        chart: chart.length
          ? { kind: 'bars', title: 'Whale score, top moves', unit: 'raw', points: chart }
          : null,
      },
    };
  },
};

const institutional = {
  label: 'Institutional',
  source: 'SEC EDGAR Form 13F filings',
  read: () => getInstitutionalOverview(),
  map(o) {
    if (!o) return { items: [], dataset: null };
    const items = (o.newPositions || [])
      .filter((r) => r.filer && (r.ticker || r.issuer) && compactUsd(r.valueUsd))
      .slice(0, 3)
      .map((r, i) => ({
        id: `${r.cik || i}:${r.cusip || r.ticker}`,
        headline: `${clip(entityName(r.filer), 26)} opens ${r.ticker || clip(entityName(r.issuer), 16)} ${compactUsd(r.valueUsd)}`,
        meta: o.quarterLabel,
        at: o.computedAt,
        detail: {
          title: `${entityName(r.filer)} opens a ${compactUsd(r.valueUsd)} position in ${entityName(r.issuer) || r.ticker}`,
          findings: lines(
            `A new position in the ${o.quarterLabel} 13F, absent from the prior quarter.`,
            r.shares && `${compactInt(r.shares)} shares reported.`,
          ),
          stats: stats(
            { label: 'Value', value: compactUsd(r.valueUsd) },
            { label: 'Shares', value: compactInt(r.shares) },
            { label: 'Quarter', value: o.quarterLabel },
          ),
        },
      }));
    const held = (o.widelyHeld || [])
      .filter((r) => num(r.holders))
      .slice(0, 8)
      .map((r) => ({ label: r.ticker || clip(entityName(r.issuer), 12), value: r.holders }));
    return {
      items,
      dataset: {
        asOf: o.computedAt,
        findings: lines(
          `${compactInt(o.filers)} filers reported ${compactUsd(o.totalValueUsd)} across ${compactInt(o.holdings)} holdings for ${o.quarterLabel}.`,
          held[0] &&
            `${held[0].label} is the most widely held security (${compactInt(held[0].value)} filers).`,
        ),
        stats: stats(
          { label: 'Filers', value: compactInt(o.filers) },
          { label: 'Holdings', value: compactInt(o.holdings) },
          { label: 'Reported value', value: compactUsd(o.totalValueUsd) },
          { label: 'Quarter', value: o.quarterLabel },
        ),
        chart: held.length
          ? { kind: 'bars', title: 'Most widely held, by filers', unit: 'count', points: held }
          : null,
      },
    };
  },
};

function filingsAdapter(label, family, source) {
  return {
    label,
    source,
    read: () => getSecFilings({ family, limit: 40 }),
    map(rows) {
      const list = (rows || []).filter((r) => r.filer_name && r.form_type);
      const items = list.slice(0, 2).map((r) => ({
        id: r.accession_no,
        headline: `${clip(entityName(r.filer_name), 30)} files ${r.form_type}`,
        meta: r.ticker || shortDate(r.filed_at),
        at: r.filed_at,
        detail: {
          title: `${entityName(r.filer_name)} files a ${r.form_type}`,
          findings: lines(
            `Filed ${longDate(r.filed_at)}.`,
            r.period_of_report && `Period of report: ${longDate(r.period_of_report)}.`,
          ),
          stats: stats(
            { label: 'Form', value: r.form_type },
            { label: 'Ticker', value: r.ticker },
            { label: 'Filed', value: shortDate(r.filed_at) },
          ),
        },
      }));
      const byForm = rankBy(
        list,
        (r) => r.form_type,
        () => 1,
        8,
      );
      return {
        items,
        dataset: {
          asOf: maxIso(...list.map((r) => r.filed_at)),
          findings: lines(
            list.length && `${list.length} of the newest filings on EDGAR in this family.`,
          ),
          stats: stats(
            { label: 'Filings', value: compactInt(list.length) },
            { label: 'Form types', value: compactInt(byForm.length) },
            { label: 'Newest', value: shortDate(list[0]?.filed_at) },
          ),
          chart: byForm.length
            ? { kind: 'bars', title: 'Newest filings by form', unit: 'count', points: byForm }
            : null,
        },
      };
    },
  };
}

const execComp = {
  label: 'Executive Compensation',
  source: 'SEC EDGAR pay-versus-performance disclosures',
  read: () => getExecCompTable(),
  map(rows) {
    const list = (rows || []).filter((r) => compactUsd(r.totalComp) && (r.ticker || r.company));
    const items = list.slice(0, 3).map((r) => ({
      id: `${r.cik}:${r.fiscalYear}`,
      headline: `${r.ticker || clip(entityName(r.company), 20)} top executive pay ${compactUsd(r.totalComp)}`,
      meta: r.fiscalYear ? `FY${r.fiscalYear}` : null,
      at: r.filedAt,
      detail: {
        title: `${r.peoName || 'The principal executive'} at ${entityName(r.company)}: ${compactUsd(r.totalComp)}`,
        findings: lines(
          compactUsd(r.paid) && `Compensation actually paid: ${compactUsd(r.paid)}.`,
          num(r.tsr) != null &&
            `Company total shareholder return value: ${num(r.tsr).toFixed(1)}${num(r.peerTsr) != null ? ` against ${num(r.peerTsr).toFixed(1)} for its peer group` : ''}.`,
          r.measureName && `Company-selected measure: ${r.measureName}.`,
        ),
        stats: stats(
          { label: 'Total pay', value: compactUsd(r.totalComp) },
          { label: 'Actually paid', value: compactUsd(r.paid) },
          { label: 'Other NEO avg', value: compactUsd(r.neoTotal) },
          { label: 'Fiscal year', value: r.fiscalYear ? String(r.fiscalYear) : null },
        ),
      },
    }));
    const top = list
      .slice(0, 8)
      .map((r) => ({ label: r.ticker || clip(entityName(r.company), 12), value: r.totalComp }));
    return {
      items,
      dataset: {
        asOf: maxIso(...list.map((r) => r.filedAt)),
        findings: lines(
          list.length && `Latest fiscal year pay for ${compactInt(list.length)} companies.`,
        ),
        stats: stats(
          { label: 'Companies', value: compactInt(list.length) },
          { label: 'Highest', value: compactUsd(list[0]?.totalComp) },
        ),
        chart: top.length
          ? { kind: 'bars', title: 'Highest principal executive pay', unit: 'usd', points: top }
          : null,
      },
    };
  },
};

const etfHoldings = {
  label: 'ETF Holdings',
  source: 'SEC EDGAR Form N-PORT filings',
  read: () => getEtfFunds(),
  map(o) {
    const funds = (o?.funds || []).filter((f) => f.ticker && compactUsd(f.netAssets));
    const items = funds.slice(0, 2).map((f) => ({
      id: f.seriesId,
      headline: `${f.ticker} net assets ${compactUsd(f.netAssets)}`,
      meta: f.holdings ? `${compactInt(f.holdings)} holdings` : shortDate(f.reportDate),
      at: f.reportDate,
      detail: {
        title: `${f.name || f.ticker}: ${compactUsd(f.netAssets)} in net assets`,
        findings: lines(
          f.holdings && `${compactInt(f.holdings)} holdings in its latest N-PORT report.`,
          f.reportDate && `Report date ${longDate(f.reportDate)}.`,
        ),
        stats: stats(
          { label: 'Net assets', value: compactUsd(f.netAssets) },
          { label: 'Holdings', value: compactInt(f.holdings) },
          { label: 'Reported', value: shortDate(f.reportDate) },
        ),
      },
    }));
    const total = funds.reduce((s, f) => s + (num(f.netAssets) || 0), 0);
    return {
      items,
      dataset: {
        asOf: maxIso(...funds.map((f) => f.reportDate)),
        findings: lines(
          funds.length &&
            `${funds.length} ETFs with public holdings, ${compactUsd(total)} in combined net assets.`,
        ),
        stats: stats(
          { label: 'Funds', value: compactInt(funds.length) },
          { label: 'Net assets', value: compactUsd(total) },
          { label: 'Largest', value: funds[0]?.ticker },
        ),
        chart: funds.length
          ? {
              kind: 'bars',
              title: 'Net assets, largest funds',
              unit: 'usd',
              points: funds.slice(0, 8).map((f) => ({ label: f.ticker, value: f.netAssets })),
            }
          : null,
      },
    };
  },
};

const fundamentals = {
  label: 'Prices & Fundamentals',
  source: 'SEC EDGAR XBRL company facts',
  read: () => getFundamentalsTable({ limit: 300 }),
  map(o) {
    const rows = (o?.rows || []).filter(
      (r) => r.ticker && num(r.revenue) >= 1e9 && num(r.revenue_growth) != null,
    );
    const fastest = [...rows].sort((a, b) => b.revenue_growth - a.revenue_growth);
    const items = fastest.slice(0, 3).map((r) => ({
      id: `${r.cik}:${o.year}`,
      headline: `${r.ticker} revenue ${pctStr(r.revenue_growth, 1)}`,
      meta: o.year ? `CY${o.year}` : null,
      at: r.period_end,
      detail: {
        title: `${entityName(r.company) || r.ticker} grew revenue ${pctStr(r.revenue_growth, 1)} in ${o.year}`,
        findings: lines(
          `Revenue of ${compactUsd(r.revenue)} for calendar ${o.year}.`,
          num(r.net_income) != null &&
            `Net income of ${num(r.net_income) < 0 ? '-' : ''}${compactUsd(Math.abs(num(r.net_income)))}.`,
        ),
        stats: stats(
          { label: 'Revenue', value: compactUsd(r.revenue) },
          { label: 'Growth', value: pctStr(r.revenue_growth, 1), tone: tone(r.revenue_growth) },
          {
            label: 'Net income',
            value:
              num(r.net_income) != null
                ? `${num(r.net_income) < 0 ? '-' : ''}${compactUsd(Math.abs(num(r.net_income)))}`
                : null,
          },
        ),
      },
    }));
    return {
      items,
      dataset: {
        asOf: null,
        findings: lines(
          o?.year &&
            `Calendar ${o.year} filings for ${compactInt(o.companies)} companies; growth shown for companies above $1B in revenue.`,
        ),
        stats: stats(
          { label: 'Companies', value: compactInt(o?.companies) },
          { label: 'Year', value: o?.year ? `CY${o.year}` : null },
        ),
        chart: fastest.length
          ? {
              kind: 'bars',
              title: 'Fastest revenue growth, above $1B',
              unit: 'pct',
              points: fastest
                .slice(0, 8)
                .map((r) => ({ label: r.ticker, value: r.revenue_growth })),
            }
          : null,
      },
    };
  },
};

/* ── Eyes Above ──────────────────────────────────────────────────────── */

const supplyChain = {
  label: 'Supply Chain Monitoring',
  source: 'IMF PortWatch vessel transit data',
  read: () => getSupplyChain(),
  map(o) {
    const choke = (o?.chokepoints || []).filter((c) => c.name && num(c.change) != null);
    const moved = [...choke].sort(byAbs('change'));
    const items = moved.slice(0, 3).map((c) => ({
      id: String(c.id),
      headline: `${c.name} transits ${pctStr(c.change, 1)}`,
      meta: '7D vs base',
      at: c.lastDate,
      detail: {
        title: `${c.name}: daily transits ${pctStr(c.change, 1)} against the baseline`,
        findings: lines(
          num(c.recent) != null &&
            num(c.base) != null &&
            `A 7-day average of ${num(c.recent).toFixed(1)} transits a day against ${num(c.base).toFixed(1)} at baseline.`,
          num(c.tankers) != null &&
            `${num(c.tankers).toFixed(1)} tankers and ${num(c.containers ?? 0).toFixed(1)} container ships a day in the recent window.`,
          c.lastDate && `Data through ${longDate(c.lastDate)}.`,
        ),
        stats: stats(
          { label: 'Change', value: pctStr(c.change, 1), tone: tone(c.change) },
          { label: '7d avg', value: num(c.recent) != null ? num(c.recent).toFixed(1) : null },
          { label: 'Baseline', value: num(c.base) != null ? num(c.base).toFixed(1) : null },
          { label: 'Through', value: shortDate(c.lastDate) },
        ),
      },
    }));
    return {
      items,
      dataset: {
        asOf: o?.through,
        findings: lines(
          choke.length && `${choke.length} maritime chokepoints tracked by daily vessel transits.`,
        ),
        stats: stats(
          { label: 'Chokepoints', value: compactInt(choke.length) },
          { label: 'Ports', value: compactInt((o?.ports || []).length) },
          { label: 'Through', value: shortDate(o?.through) },
        ),
        chart: choke.length
          ? {
              kind: 'bars',
              title: 'Transit change, 7 days vs baseline',
              unit: 'pct',
              points: moved.slice(0, 8).map((c) => ({ label: clip(c.name, 16), value: c.change })),
            }
          : null,
      },
    };
  },
};

const patents = {
  label: 'Patent Activity',
  source: 'USPTO PatentsView grant data',
  read: () => getPatents(),
  map(o) {
    const mom = (o?.momentum || []).filter((m) => m.assignee && num(m.change) != null);
    const rising = [...mom].sort((a, b) => b.change - a.change);
    const items = rising.slice(0, 3).map((m) => ({
      id: m.ticker || m.assignee,
      headline: `${m.ticker || clip(entityName(m.assignee), 20)} patent grants ${pctStr(m.change, 0)}`,
      meta: `${compactInt(m.grants12)} in 12M`,
      at: m.lastGrant,
      detail: {
        title: `${entityName(m.assignee)}: ${compactInt(m.grants12)} grants in 12 months`,
        findings: lines(
          `${compactInt(m.grants12)} grants in the last 12 months against ${compactInt(m.prior12)} in the 12 before.`,
          m.topCpc && `Most grants fall in CPC section ${m.topCpc}.`,
          m.lastGrant && `Latest grant ${longDate(m.lastGrant)}.`,
        ),
        stats: stats(
          { label: 'Grants 12m', value: compactInt(m.grants12) },
          { label: 'Prior 12m', value: compactInt(m.prior12) },
          { label: 'Change', value: pctStr(m.change, 0), tone: tone(m.change) },
          { label: 'Ticker', value: m.ticker },
        ),
      },
    }));
    const top = [...mom].sort((a, b) => (b.grants12 || 0) - (a.grants12 || 0)).slice(0, 8);
    return {
      items,
      dataset: {
        asOf: o?.through,
        findings: lines(
          o?.total &&
            `${compactInt(o.total)} patent grants on file, ${compactInt(o.matched)} matched to a listed company.`,
        ),
        stats: stats(
          { label: 'Grants', value: compactInt(o?.total) },
          { label: 'Matched', value: compactInt(o?.matched) },
          { label: 'Through', value: shortDate(o?.through) },
        ),
        chart: top.length
          ? {
              kind: 'bars',
              title: 'Most grants, last 12 months',
              unit: 'count',
              points: top.map((m) => ({
                label: m.ticker || clip(entityName(m.assignee), 12),
                value: m.grants12,
              })),
            }
          : null,
      },
    };
  },
};

const nightLights = {
  label: 'Satellite Imagery',
  source: 'NASA Black Marble night-time lights',
  read: () => getNightLights(),
  map(o) {
    const regions = (o?.regions || [])
      .map((r) => ({ ...r, y: yoy(r.points) }))
      .filter((r) => r.name && r.y);
    const moved = [...regions].sort((a, b) => Math.abs(b.y.change) - Math.abs(a.y.change));
    const items = moved.slice(0, 3).map((r) => ({
      id: String(r.id),
      headline: `${clip(r.name, 26)} night lights ${pctStr(r.y.change, 1)} YoY`,
      meta: monthLabel(r.y.last.month),
      at: r.y.last.month,
      detail: {
        title: `${r.name}: night-time radiance ${pctStr(r.y.change, 1)} year over year`,
        findings: lines(
          `Mean radiance ${num(r.y.last.value).toFixed(2)} in ${monthLabel(r.y.last.month)} against ${num(r.y.base.value).toFixed(2)} in ${monthLabel(r.y.base.month)}.`,
          r.country && `Region in ${r.country}.`,
        ),
        stats: stats(
          { label: 'YoY', value: pctStr(r.y.change, 1), tone: tone(r.y.change) },
          { label: 'Latest', value: num(r.y.last.value).toFixed(2) },
          { label: 'Month', value: monthLabel(r.y.last.month) },
        ),
        chart: {
          kind: 'line',
          title: 'Mean radiance by month',
          unit: 'raw',
          points: linePoints(r.points, 26),
        },
      },
    }));
    return {
      items,
      dataset: {
        asOf: o?.through,
        findings: lines(
          regions.length && `${regions.length} regions with a year-over-year reading.`,
        ),
        stats: stats(
          { label: 'Regions', value: compactInt((o?.regions || []).length) },
          { label: 'Through', value: monthLabel(o?.through) },
        ),
        chart: moved.length
          ? {
              kind: 'bars',
              title: 'Radiance change, year over year',
              unit: 'pct',
              points: moved
                .slice(0, 8)
                .map((r) => ({ label: clip(r.name, 16), value: r.y.change })),
            }
          : null,
      },
    };
  },
};

const cre = {
  label: 'Commercial Real Estate Activity',
  source: 'FRED and U.S. Census Bureau series',
  read: () => getCre(),
  map(o) {
    const series = (o?.series || [])
      .map((s) => ({ ...s, y: yoy(s.points) }))
      .filter((s) => s.title && s.y);
    const moved = [...series].sort((a, b) => Math.abs(b.y.change) - Math.abs(a.y.change));
    const items = moved.slice(0, 3).map((s) => ({
      id: s.id,
      headline: `${clip(s.title, 34)} ${pctStr(s.y.change, 1)} YoY`,
      meta: shortDate(s.lastDate),
      at: s.lastDate,
      detail: {
        title: `${s.title}: ${pctStr(s.y.change, 1)} year over year`,
        findings: lines(
          `Latest ${compactInt(s.y.last.value)}${s.units ? ` (${s.units})` : ''} against ${compactInt(s.y.base.value)} a year earlier.`,
          s.frequency && `Published ${String(s.frequency).toLowerCase()}.`,
        ),
        stats: stats(
          { label: 'YoY', value: pctStr(s.y.change, 1), tone: tone(s.y.change) },
          { label: 'Latest', value: compactInt(s.y.last.value) },
          { label: 'Through', value: shortDate(s.lastDate) },
        ),
        chart: { kind: 'line', title: s.title, unit: 'raw', points: linePoints(s.points, 36) },
      },
    }));
    return {
      items,
      dataset: {
        asOf: o?.through,
        findings: lines(
          series.length &&
            `${series.length} commercial real estate series with a year-over-year reading.`,
        ),
        stats: stats(
          { label: 'Series', value: compactInt((o?.series || []).length) },
          { label: 'Through', value: shortDate(o?.through) },
        ),
        chart: null,
      },
    };
  },
};

/* ── The Hive ────────────────────────────────────────────────────────── */

const crowdForecasts = {
  label: 'Crowdsourced Intelligence',
  source: 'Manifold public forecasts (play money)',
  read: () => openCrowdForecasts(40),
  map(rows) {
    const list = (rows || []).filter((r) => r.question && num(r.probability) != null);
    const items = list.slice(0, 3).map((r) => ({
      id: String(r.forecast_id),
      headline: `${clip(r.question, 40)} ${Math.round(num(r.probability) * 100)}%`,
      meta: r.forecasters ? `${compactInt(r.forecasters)} forecasters` : null,
      at: r.indexed_at,
      detail: {
        title: r.question,
        findings: lines(
          `The crowd puts this at ${Math.round(num(r.probability) * 100)}%${r.forecasters ? ` across ${compactInt(r.forecasters)} forecasters` : ''}.`,
          r.close_date && `Closes ${longDate(r.close_date)}.`,
          'Manifold forecasts use play money: a probability shows expectation, not money at stake.',
        ),
        stats: stats(
          { label: 'Probability', value: `${Math.round(num(r.probability) * 100)}%` },
          { label: 'Forecasters', value: compactInt(r.forecasters) },
          { label: 'Closes', value: shortDate(r.close_date) },
          { label: 'Category', value: r.category },
        ),
      },
    }));
    return {
      items,
      dataset: {
        asOf: maxIso(...list.map((r) => r.indexed_at)),
        findings: lines(list.length && `${list.length} of the most forecast open questions.`),
        stats: stats({ label: 'Open questions', value: compactInt(list.length) }),
        chart: list.length
          ? {
              kind: 'bars',
              title: 'Crowd probability, most forecast questions',
              unit: 'pct',
              points: list
                .slice(0, 8)
                .map((r) => ({ label: clip(r.question, 22), value: num(r.probability) * 100 })),
            }
          : null,
      },
    };
  },
};

/* ── Global Empire Lighthouse ────────────────────────────────────────── */

const geopoliticalRisk = {
  label: 'Geopolitical Risk Indices',
  source: 'Caldara and Iacoviello Geopolitical Risk Index',
  read: () => lighthouseLatest('gpr', ['GPR', 'GPRC']),
  map(obs) {
    const rows = (obs || [])
      .filter((o) => o.indicator === 'GPRC' && num(o.latest_value) != null)
      .map((o) => ({
        id: o.ref_area,
        country: o.ref_area_name || o.ref_area,
        value: num(o.latest_value),
        prior: num(o.prior_value),
        change: num(o.prior_value) != null ? num(o.latest_value) - num(o.prior_value) : null,
        period: o.latest_period,
      }));
    const global = (obs || []).find((o) => o.indicator === 'GPR' && o.ref_area === 'WLD');
    const items = [...rows]
      .filter((r) => r.change != null)
      .sort(byAbs('change'))
      .slice(0, 3)
      .map((r) => ({
        id: r.id,
        headline: `${r.country} risk index ${signedNum(r.change, 2)}`,
        meta: monthLabel(r.period),
        at: r.period,
        detail: {
          title: `${r.country}: geopolitical risk ${signedNum(r.change, 2)} on the month`,
          findings: lines(
            `Index at ${r.value.toFixed(2)} in ${monthLabel(r.period)}, from ${r.prior.toFixed(2)} the month before.`,
            global && `The global index stands at ${num(global.latest_value).toFixed(1)}.`,
          ),
          stats: stats(
            { label: 'Index', value: r.value.toFixed(2) },
            { label: 'Prior', value: r.prior.toFixed(2) },
            { label: 'Change', value: signedNum(r.change, 2), tone: tone(-r.change) },
            { label: 'Month', value: monthLabel(r.period) },
          ),
        },
      }));
    const top = [...rows].sort((a, b) => b.value - a.value).slice(0, 8);
    return {
      items,
      dataset: {
        asOf: global?.latest_period || top[0]?.period,
        findings: lines(
          global &&
            `Global geopolitical risk index: ${num(global.latest_value).toFixed(1)} in ${monthLabel(global.latest_period)}.`,
          top[0] && `${top[0].country} carries the highest country reading.`,
        ),
        stats: stats(
          { label: 'Global GPR', value: global ? num(global.latest_value).toFixed(1) : null },
          { label: 'Countries', value: compactInt(rows.length) },
          { label: 'Month', value: monthLabel(global?.latest_period) },
        ),
        chart: top.length
          ? {
              kind: 'bars',
              title: 'Highest country risk readings',
              unit: 'index',
              points: top.map((r) => ({ label: r.country, value: r.value })),
            }
          : null,
      },
    };
  },
};

const GDP = 'NY.GDP.MKTP.KD.ZG';
const worldBank = {
  label: 'World Bank Economic Indicators',
  source: 'World Bank World Development Indicators',
  read: () => lighthouseLatest('worldbank', [GDP]),
  map(obs) {
    const rows = (obs || [])
      .filter((o) => o.indicator === GDP && num(o.latest_value) != null)
      .map((o) => ({
        id: o.ref_area,
        country: o.ref_area_name || o.ref_area,
        value: num(o.latest_value),
        prior: num(o.prior_value),
        year: String(o.latest_period).slice(0, 4),
      }))
      .sort((a, b) => b.value - a.value);
    const pick = [...rows.slice(0, 2), ...rows.slice(-1)];
    const items = pick.map((r) => ({
      id: r.id,
      headline: `${r.country} GDP growth ${pctStr(r.value, 1)}`,
      meta: r.year,
      at: `${r.year}-12-31`,
      detail: {
        title: `${r.country}: real GDP growth of ${pctStr(r.value, 1, false)} in ${r.year}`,
        findings: lines(
          r.prior != null && `Growth was ${pctStr(r.prior, 1, false)} the year before.`,
          `Ranked ${rows.indexOf(r) + 1} of ${rows.length} reporting economies.`,
        ),
        stats: stats(
          { label: 'Growth', value: pctStr(r.value, 1), tone: tone(r.value) },
          { label: 'Prior year', value: pctStr(r.prior, 1) },
          { label: 'Year', value: r.year },
        ),
      },
    }));
    return {
      items,
      dataset: {
        asOf: null,
        findings: lines(
          rows.length && `Real GDP growth for ${rows.length} economies, latest annual reading.`,
        ),
        stats: stats({ label: 'Economies', value: compactInt(rows.length) }),
        chart: rows.length
          ? {
              kind: 'bars',
              title: 'Fastest real GDP growth',
              unit: 'pct',
              points: rows.slice(0, 8).map((r) => ({ label: r.country, value: r.value })),
            }
          : null,
      },
    };
  },
};

const sanctions = {
  label: 'Sanctions & Trade Policy Tracking',
  source: 'U.S. Treasury OFAC Specially Designated Nationals list',
  read: () => Promise.all([sanctionsEntries(40), getSanctionsSummary()]),
  map([entries, summary]) {
    const list = (entries || []).filter((e) => e.name);
    const items = list.slice(0, 3).map((e) => {
      const programs = Array.isArray(e.programs) ? e.programs : [];
      const countries = Array.isArray(e.countries) ? e.countries : [];
      return {
        id: String(e.ent_num),
        headline: `OFAC lists ${clip(entityName(e.name), 32)}`,
        meta: programs[0] || e.entry_type,
        at: e.first_seen,
        detail: {
          title: `${entityName(e.name)} added to the SDN list`,
          findings: lines(
            e.entry_type && `Listed as ${String(e.entry_type).toLowerCase()}.`,
            programs.length && `Programs: ${programs.slice(0, 4).join(', ')}.`,
            countries.length && `Countries: ${countries.slice(0, 4).join(', ')}.`,
            e.first_seen && `First seen ${longDate(e.first_seen)}.`,
          ),
          stats: stats(
            { label: 'Type', value: e.entry_type },
            { label: 'Program', value: programs[0] },
            { label: 'First seen', value: shortDate(e.first_seen) },
          ),
        },
      };
    });
    const byType = summary?.byType || {};
    const typePoints = Object.entries(byType)
      .filter(([, v]) => num(v))
      .map(([k, v]) => ({ label: k.charAt(0).toUpperCase() + k.slice(1), value: num(v) }))
      .sort((a, b) => b.value - a.value);
    return {
      items,
      dataset: {
        asOf: summary?.synced || maxIso(...list.map((e) => e.first_seen)),
        findings: lines(
          num(summary?.active) &&
            `${compactInt(summary.active)} active designations on the SDN list.`,
          num(summary?.addedSince) &&
            `${compactInt(summary.addedSince)} added since tracking began.`,
        ),
        stats: stats(
          { label: 'Active', value: compactInt(summary?.active) },
          { label: 'Entities', value: compactInt(byType.entity) },
          { label: 'Individuals', value: compactInt(byType.individual) },
          { label: 'Vessels', value: compactInt(byType.vessel) },
        ),
        chart: typePoints.length
          ? {
              kind: 'bars',
              title: 'Active designations by type',
              unit: 'count',
              points: typePoints,
            }
          : null,
      },
    };
  },
};

/*
 * Every adapter, in taxonomy order. read.js warns (server log) for any LIVE
 * taxonomy dataset with no adapter here, so a new live dataset cannot be
 * forgotten silently. Datasets that share a page (SEC EDGAR and Fund Holdings
 * Data) still get one adapter each, keyed by their own label.
 */
/* ── Capitol Watch, the audited three ────────────────────────────────────
   Sample row shapes (printed from the live readers, Oct 22, 2026):
   campaign finance member: { id, name, party, chamber, state, district,
     raised, spent, cash, debt, itemized, pac, periodEnd, support, oppose,
     rankRaised, rankCash }
   lobbying leaders row: { key, name, spend, filings, ticker, verified,
     company }; pulse: { now, prior } with { filings, paidFilings, spend,
     clients, firms, doorLobbyists, latestPosted }
   committees belt row: { transaction_date, ticker, type, amount_min,
     amount_max, committee: { thomasId, chamber, name, shortName },
     sector: { key, label }, bioguideId, member } */

const campaignFinance = {
  label: 'Campaign Finance Records',
  source: 'Federal Election Commission candidate committee filings',
  read: () => getCampaignFinanceOverview(CF_DEFAULT_CYCLE),
  map(o) {
    if (!o?.ready) return { items: [], dataset: null };
    const members = (o.members || []).filter((m) => m.name && num(m.raised) != null);
    const topRaised = [...members].sort((a, b) => (num(b.raised) || 0) - (num(a.raised) || 0));
    const items = topRaised.slice(0, 4).map((m) => ({
      id: m.id,
      headline: `${clip(m.name, 24)} raised ${compactUsd(m.raised)}`,
      meta: m.party && m.state ? `${m.party}-${m.state}` : `${o.cycle} cycle`,
      at: m.periodEnd,
      detail: {
        title: `${m.name}: ${compactUsd(m.raised)} raised in the ${o.cycle} cycle`,
        findings: lines(
          `Receipts of ${compactUsd(m.raised)}${compactUsd(m.spent) ? ` against ${compactUsd(m.spent)} spent` : ''}.`,
          compactUsd(m.cash) &&
            `Cash on hand ${compactUsd(m.cash)}${num(m.debt) > 0 ? `, committee debt ${compactUsd(m.debt)}` : ''}.`,
          num(m.support) > 0 &&
            `Outside groups report ${compactUsd(m.support)} supporting and ${compactUsd(m.oppose) || '$0'} opposing.`,
          m.periodEnd && `Filings cover through ${longDate(m.periodEnd)}.`,
        ),
        stats: stats(
          { label: 'Raised', value: compactUsd(m.raised) },
          { label: 'Spent', value: compactUsd(m.spent) },
          { label: 'Cash', value: compactUsd(m.cash) },
          { label: 'Rank', value: m.rankRaised ? `#${m.rankRaised}` : null },
        ),
      },
    }));
    const chart = topRaised
      .slice(0, 8)
      .map((m) => ({ label: lastName(m.name) || m.id, value: num(m.raised) }))
      .filter((p) => p.value != null);
    return {
      items,
      dataset: {
        asOf: o.latestPeriodEnd,
        findings: lines(
          `${compactInt(members.length)} members of Congress with FEC filings in the ${o.cycle} cycle, ${compactUsd(o.totals?.raised)} raised in total.`,
          topRaised[0] && `${topRaised[0].name} leads with ${compactUsd(topRaised[0].raised)}.`,
        ),
        stats: stats(
          { label: 'Members', value: compactInt(members.length) },
          { label: 'Raised', value: compactUsd(o.totals?.raised) },
          { label: 'Spent', value: compactUsd(o.totals?.spent) },
          { label: 'Cash', value: compactUsd(o.totals?.cash) },
        ),
        chart: chart.length
          ? { kind: 'bars', title: `Most raised, ${o.cycle} cycle`, unit: 'usd', points: chart }
          : null,
      },
    };
  },
};

const lobbying = {
  label: 'Lobbying Activity',
  source: 'Senate LDA (lda.gov)',
  read: async () => {
    const now = Date.now();
    const sp = new URLSearchParams();
    const [pulse, leaders] = await Promise.all([
      readLobbyingView('pulse', lobbyingArgsFor('pulse', sp, now)),
      readLobbyingView('leaders', lobbyingArgsFor('leaders', sp, now)),
    ]);
    return { pulse, leaders };
  },
  map(data) {
    const nowP = data?.pulse?.now || null;
    const rows = (data?.leaders?.rows || []).filter((r) => r.name && num(r.spend));
    const items = rows.slice(0, 4).map((r) => ({
      id: r.key,
      headline: `${clip(entityName(r.name), 28)} discloses ${compactUsd(r.spend)}`,
      meta: r.ticker || (num(r.filings) ? `${compactInt(r.filings)} filings` : null),
      at: nowP?.latestPosted,
      detail: {
        title: `${entityName(r.name)}: ${compactUsd(r.spend)} in disclosed lobbying spend`,
        findings: lines(
          `${compactUsd(r.spend)} across ${compactInt(r.filings)} filings loaded so far this period.`,
          r.ticker &&
            `Mapped to the public company ${r.company || r.ticker} (${r.ticker})${r.verified ? '' : ', by name match'}.`,
        ),
        stats: stats(
          { label: 'Spend', value: compactUsd(r.spend) },
          { label: 'Filings', value: compactInt(r.filings) },
          { label: 'Ticker', value: r.ticker },
        ),
      },
    }));
    const chart = rows
      .slice(0, 8)
      .map((r) => ({ label: r.ticker || clip(entityName(r.name), 14), value: num(r.spend) }))
      .filter((p) => p.value != null);
    return {
      items,
      dataset: {
        asOf: nowP?.latestPosted,
        findings: lines(
          nowP &&
            `${compactInt(nowP.filings)} filings and ${compactUsd(nowP.spend) || '$0'} in disclosed spend loaded so far this period.`,
          nowP &&
            `${compactInt(nowP.clients)} distinct clients and ${compactInt(nowP.firms)} firms.`,
        ),
        stats: stats(
          { label: 'Filings', value: compactInt(nowP?.filings) },
          { label: 'Spend', value: compactUsd(nowP?.spend) },
          { label: 'Clients', value: compactInt(nowP?.clients) },
          { label: 'Firms', value: compactInt(nowP?.firms) },
        ),
        chart: chart.length
          ? {
              kind: 'bars',
              title: 'Top disclosed spenders, this period',
              unit: 'usd',
              points: chart,
            }
          : null,
      },
    };
  },
};

const committees = {
  label: 'Committee Assignments',
  source:
    'House Clerk and Senate records via the congress-legislators project; Periodic Transaction Reports',
  read: () => (isServerSupabaseConfigured() ? getCommitteeIndex(getAdminClient()) : null),
  map(data) {
    if (!data) return { items: [], dataset: null };
    const belt = (data.belt || []).filter((t) => t.member && t.ticker);
    const items = belt.slice(0, 4).map((t, i) => {
      const verb =
        VERB[
          String(t.type || '')
            .toLowerCase()
            .startsWith('p')
            ? 'purchase'
            : 'sale'
        ];
      const band = bandShort({ min: t.amount_min, max: t.amount_max });
      return {
        id: `${t.bioguideId}:${t.transaction_date}:${t.ticker}:${i}`,
        headline: `${lastName(t.member) || t.member} ${verb} ${t.ticker}`,
        meta: clip(t.committee?.shortName, 22),
        at: t.transaction_date,
        detail: {
          title: `${t.member} ${verb} ${t.ticker} in a sector ${t.committee?.shortName} oversees`,
          findings: lines(
            band && `Disclosed range ${band}, traded ${longDate(t.transaction_date)}.`,
            t.sector?.label &&
              `${t.ticker} sits in ${t.sector.label}, a sector ${t.committee?.shortName} oversees.`,
            'A trade in an overseen sector is a disclosure pattern, not evidence of wrongdoing.',
          ),
          stats: stats(
            { label: 'Range', value: band },
            { label: 'Sector', value: t.sector?.label },
            { label: 'Committee', value: t.committee?.thomasId },
            { label: 'Traded', value: shortDate(t.transaction_date) },
          ),
        },
      };
    });
    const bySeats = (data.committees || [])
      .filter((c) => num(c.seats))
      .sort((a, b) => b.seats - a.seats)
      .slice(0, 8)
      .map((c) => ({ label: clip(c.shortName, 16), value: c.seats }));
    return {
      items,
      dataset: {
        asOf: data.syncedAt,
        findings: lines(
          data.counts &&
            `${data.counts.committees} committees and ${data.counts.subcommittees} subcommittees hold ${compactInt(data.counts.seats)} seats.`,
          data.split &&
            `${compactInt(data.split.majority)} majority seats against ${compactInt(data.split.minority)} minority.`,
        ),
        stats: stats(
          { label: 'Committees', value: compactInt(data.counts?.committees) },
          { label: 'Subcommittees', value: compactInt(data.counts?.subcommittees) },
          { label: 'Seats', value: compactInt(data.counts?.seats) },
          { label: 'Members', value: compactInt(data.counts?.members) },
        ),
        chart: bySeats.length
          ? { kind: 'bars', title: 'Largest committees by seats', unit: 'count', points: bySeats }
          : null,
      },
    };
  },
};

/* Prediction markets: probability and 24h change arrive on a 0..1 scale.
   Sample market: { id, venue, eventTitle, outcome, question, probability,
   change24h, volume, volume24h, volumeUnit, closes, category, score,
   indexedAt, outcomes: [{ label, probability, change24h }] } */
const predictionMarkets = {
  label: 'Prediction Markets',
  source: 'Polymarket and Kalshi market data',
  read: () => getTrendingMarkets({ limit: 12 }),
  map(o) {
    const markets = (o?.markets || []).filter((m) => m.eventTitle && num(m.probability) != null);
    const probPct = (p) => pctStr(num(p) * 100, 0, false);
    const volStr = (m, v) =>
      m.volumeUnit === 'contracts'
        ? num(v) != null
          ? `${compactInt(v)} contracts`
          : null
        : compactUsd(v);
    const items = markets.slice(0, 4).map((m) => ({
      id: String(m.id),
      headline: `${clip(m.outcome || m.eventTitle, 32)} at ${probPct(m.probability)}`,
      meta: m.venue === 'kalshi' ? 'Kalshi' : 'Polymarket',
      at: m.indexedAt,
      detail: {
        title: `${m.eventTitle}: ${m.outcome ? `${m.outcome} at ` : ''}${probPct(m.probability)}`,
        findings: lines(
          `The market prices ${m.outcome || 'yes'} at ${probPct(m.probability)}${num(m.change24h) != null ? `, ${signedNum(num(m.change24h) * 100, 1)} points in 24 hours` : ''}.`,
          volStr(m, m.volume) &&
            `Volume ${volStr(m, m.volume)}${volStr(m, m.volume24h) ? `, ${volStr(m, m.volume24h)} in the last day` : ''}.`,
          m.closes && `Trading closes ${longDate(m.closes)}.`,
        ),
        stats: stats(
          { label: 'Probability', value: probPct(m.probability) },
          {
            label: '24h move',
            value: num(m.change24h) != null ? `${signedNum(num(m.change24h) * 100, 1)} pts` : null,
            tone: tone(m.change24h),
          },
          { label: 'Volume', value: volStr(m, m.volume) },
          { label: 'Closes', value: shortDate(m.closes) },
        ),
        chart:
          (m.outcomes || []).filter((x) => x.label && num(x.probability) != null).length > 1
            ? {
                kind: 'bars',
                title: 'Outcome probabilities',
                unit: 'pct',
                points: m.outcomes
                  .filter((x) => x.label && num(x.probability) != null)
                  .slice(0, 8)
                  .map((x) => ({ label: clip(x.label, 14), value: num(x.probability) * 100 })),
              }
            : null,
      },
    }));
    const top = markets.slice(0, 8).map((m) => ({
      label: clip(m.outcome || m.eventTitle, 14),
      value: num(m.probability) * 100,
    }));
    return {
      items,
      dataset: {
        asOf: o?.updatedAt,
        findings: lines(
          markets.length &&
            `${markets.length} trending real-money markets across Polymarket and Kalshi.`,
        ),
        stats: stats(
          { label: 'Markets', value: compactInt(markets.length) },
          {
            label: 'Polymarket',
            value: compactInt(markets.filter((m) => m.venue === 'polymarket').length),
          },
          {
            label: 'Kalshi',
            value: compactInt(markets.filter((m) => m.venue === 'kalshi').length),
          },
        ),
        chart: top.length
          ? {
              kind: 'bars',
              title: 'Trending markets, implied probability',
              unit: 'pct',
              points: top,
            }
          : null,
      },
    };
  },
};

/* OECD rows: { ezana_slug, ref_area, ref_area_name, latest_year,
   latest_value, prior_year, prior_value, unit_label }. Values from
   PROJECTION_FROM_YEAR (2024) onward are OECD projections, said in the
   finding text, never silently. */
const HEADLINE_OECD = ['eo-gdpv_annpct', 'eo-cpi_annpct', 'eo-unr', 'eo-irs'];
const oecdMacro = {
  label: 'OECD Macro Data',
  source: 'OECD SDMX API (CC BY 4.0)',
  map(rows) {
    const series = new Map(OECD_CURATED_SERIES.map((s) => [s.slug, s]));
    const list = (rows || []).filter(
      (r) => series.has(r.ezana_slug) && num(r.latest_value) != null && r.latest_year,
    );
    const fmtVal = (s, v) => {
      const n = num(v);
      if (n == null) return null;
      const body = n.toFixed(s.decimals ?? 1);
      return `${s.signed && n > 0 ? '+' : ''}${body}${String(s.unitLabel || '').startsWith('%') ? '%' : ''}`;
    };
    const projNote = (year) =>
      year >= PROJECTION_FROM_YEAR
        ? ` The ${year} value is an OECD projection, not an actual.`
        : '';
    const us = list.filter((r) => r.ref_area === 'USA');
    const picks = HEADLINE_OECD.map((slug) => us.find((r) => r.ezana_slug === slug)).filter(
      Boolean,
    );
    const items = picks.map((r) => {
      const s = series.get(r.ezana_slug);
      return {
        id: `${r.ezana_slug}:${r.ref_area}`,
        headline: `US ${s.label.toLowerCase()} ${fmtVal(s, r.latest_value)}`,
        meta: String(r.latest_year),
        at: `${r.latest_year}-01-01`,
        detail: {
          title: `United States ${s.label.toLowerCase()}: ${fmtVal(s, r.latest_value)} in ${r.latest_year}`,
          findings: lines(
            `${s.label} of ${fmtVal(s, r.latest_value)} (${r.unit_label || s.unitLabel}) in ${r.latest_year}${num(r.prior_value) != null ? `, against ${fmtVal(s, r.prior_value)} in ${r.prior_year}` : ''}.${projNote(r.latest_year)}`,
          ),
          stats: stats(
            { label: String(r.latest_year), value: fmtVal(s, r.latest_value) },
            { label: String(r.prior_year || 'Prior'), value: fmtVal(s, r.prior_value) },
            { label: 'Series', value: s.short || s.label },
          ),
        },
      };
    });
    const gdp = list
      .filter((r) => r.ezana_slug === 'eo-gdpv_annpct')
      .sort((a, b) => num(b.latest_value) - num(a.latest_value))
      .slice(0, 8)
      .map((r) => ({ label: r.ref_area, value: num(r.latest_value) }));
    const latestYear = Math.max(0, ...list.map((r) => r.latest_year || 0)) || null;
    return {
      items,
      dataset: {
        asOf: null,
        findings: lines(
          list.length &&
            `${new Set(list.map((r) => r.ref_area)).size} economies across ${new Set(list.map((r) => r.ezana_slug)).size} curated indicators.`,
          latestYear &&
            latestYear >= PROJECTION_FROM_YEAR &&
            `Values from ${PROJECTION_FROM_YEAR} onward are OECD projections, not actuals.`,
        ),
        stats: stats(
          { label: 'Economies', value: compactInt(new Set(list.map((r) => r.ref_area)).size) },
          { label: 'Indicators', value: compactInt(new Set(list.map((r) => r.ezana_slug)).size) },
          { label: 'Latest year', value: latestYear ? String(latestYear) : null },
        ),
        chart: gdp.length
          ? { kind: 'bars', title: 'Real GDP growth, latest year', unit: 'pct', points: gdp }
          : null,
      },
    };
  },
  read: () => getOecdLatest(),
};

export const PULSE_ADAPTERS = [
  politicianTracker,
  campaignFinance,
  lobbying,
  committees,
  governmentContracts,
  institutional,
  activist,
  filingsAdapter('Fund Holdings Data', 'institutional', 'SEC EDGAR Form 13F filings'),
  filingsAdapter('SEC EDGAR', undefined, 'SEC EDGAR full-text filing index'),
  insiderTrading,
  execComp,
  whaleMoves,
  etfHoldings,
  fundamentals,
  patents,
  nightLights,
  cre,
  supplyChain,
  predictionMarkets,
  crowdForecasts,
  oecdMacro,
  worldBank,
  geopoliticalRisk,
  sanctions,
];
