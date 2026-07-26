'use client';

import { useMemo, useState } from 'react';
import { Ticker, EntityName } from '@/components/marketing/DatasetTable';
import CategoryBar from '@/components/datasets/CategoryBar';
import DatasetTicker from '@/components/datasets/DatasetTicker';
import { WEIGHTS } from '@/lib/whale-score';
import { WHALE_MOVES_SAMPLE } from './whale-moves-sample';
import '../../marketing-explore.css';
import './whale-moves.css';

/* ── formatting ── */
function fmtUSD(v) {
  const n = Number(v) || 0;
  if (!n) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}
function fmtPct(v) {
  return v == null ? '—' : `${Number(v).toFixed(1)}%`;
}

// Change type → label + tone (institutional). Activist rows carry no change_type;
// their delta is escalation, handled separately.
const CHANGE_LABEL = {
  new: 'New',
  doubled: 'Doubled',
  added: 'Added',
  trimmed: 'Trimmed',
  exited: 'Exited',
  flat: 'Flat',
};
const CHANGE_TONE = {
  new: 'pos',
  doubled: 'pos',
  added: 'pos',
  trimmed: 'neg',
  exited: 'neg',
  flat: 'mut',
};

// Tier → tone for the badge colour.
const TIER_TONE = {
  'Fresh conviction': 'pos',
  'Doubling down': 'pos',
  'Activist stake': 'pos',
  Adding: 'mild',
  'Quiet accumulation': 'mild',
  'New position': 'mild',
  Holding: 'mut',
  Trimming: 'neg',
  'Heading for the exit': 'neg',
};

function TierBadge({ tier }) {
  if (!tier) return <span className="wm-muted">—</span>;
  return <span className={`wm-tier wm-tier--${TIER_TONE[tier] || 'mut'}`}>{tier}</span>;
}

function DeltaCell({ row }) {
  if (row.kind === 'activist') {
    return (
      <span className={`wm-delta wm-delta--${row.factors?.escalated ? 'pos' : 'mut'}`}>
        {row.factors?.escalated ? 'Escalated' : row.form || '—'}
      </span>
    );
  }
  const ct = row.change_type;
  if (!ct) return <span className="wm-muted">—</span>;
  return <span className={`wm-delta wm-delta--${CHANGE_TONE[ct] || 'mut'}`}>{CHANGE_LABEL[ct]}</span>;
}

function ScoreCell({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <span className="wm-score" title={`Whale Score ${pct}/100`}>
      <span className="wm-score-bar" aria-hidden="true">
        <span className="wm-score-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="wm-score-num gcx-mono">{pct}</span>
    </span>
  );
}

/** The one-line "why it scored" summary used in the highlight card. */
function dominantFactor(row) {
  if (row.kind === 'activist') {
    return `${row.form || '13D/G'} at ${fmtPct(row.percent_of_class)}`;
  }
  const ct = CHANGE_LABEL[row.change_type] || row.change_type || 'position';
  return `${ct.toLowerCase()} · ${fmtPct(row.conviction_pct)} of book`;
}

const SORTS = [
  { id: 'score', label: 'Whale Score' },
  { id: 'value', label: 'Position value' },
  { id: 'conviction', label: 'Conviction %' },
];
const KINDS = [
  { id: 'all', label: 'All filers' },
  { id: 'institutional', label: 'Institutional (13F)' },
  { id: 'activist', label: 'Activist (13D/13G)' },
];

export function WhaleMovesClient({ moves }) {
  const isLive = Array.isArray(moves) && moves.length > 0;
  const rows = isLive ? moves : WHALE_MOVES_SAMPLE;

  const [kind, setKind] = useState('all');
  const [tier, setTier] = useState('all');
  const [sort, setSort] = useState('score');

  const tiers = useMemo(() => {
    const seen = [];
    for (const r of rows) if (r.tier && !seen.includes(r.tier)) seen.push(r.tier);
    return seen;
  }, [rows]);

  const view = useMemo(() => {
    const filtered = rows
      .filter((r) => (kind === 'all' ? true : r.kind === kind))
      .filter((r) => (tier === 'all' ? true : r.tier === tier));
    const key =
      sort === 'value' ? 'value_usd' : sort === 'conviction' ? 'conviction_pct' : 'whale_score';
    return [...filtered].sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0));
  }, [rows, kind, tier, sort]);

  const top = useMemo(
    () => [...rows].sort((a, b) => (Number(b.whale_score) || 0) - (Number(a.whale_score) || 0)).slice(0, 5),
    [rows],
  );

  const tickerItems = useMemo(
    () =>
      [...rows]
        .sort((a, b) => (Number(b.whale_score) || 0) - (Number(a.whale_score) || 0))
        .slice(0, 20)
        .map((r) => ({
          id: r.id ?? r.accession_no,
          lead: r.tier,
          main: `${r.filer_name}${r.ticker ? ` → ${r.ticker}` : r.issuer ? ` → ${r.issuer}` : ''}`,
          value: String(Math.round(Number(r.whale_score) || 0)),
        })),
    [rows],
  );

  const iw = WEIGHTS.institutional;

  return (
    <div className="mkt-page">
      <CategoryBar active="titans" activeItem="Whale Moves" />
      <DatasetTicker items={tickerItems} ariaLabel="Top whale moves by score" />

      <main className="mkt-main">
        <div className="mkt-hero">
          <p className="mkt-eyebrow">TITANS SHADOW · SEC EDGAR</p>
          <h1 className="mkt-h1">Whale Moves</h1>
          <p className="mkt-lead">
            The institutional and activist bets that actually signal conviction, not just size. Every
            move is scored by how much of the filer&apos;s own book it represents, how new it is, and
            how concentrated the fund is — so a fresh 15%-of-portfolio bet outranks a mega-fund&apos;s
            rounding-error rebalance.
          </p>
        </div>

        {!isLive && (
          <div className="wm-sample-note">
            Sample data — not live. Whale Moves is a derived dataset: the live feed appears once the
            SEC EDGAR ingestion has loaded two quarters of 13F history (the score needs a prior
            quarter to diff against).
          </div>
        )}

        {/* Highlight — highest-conviction moves this quarter */}
        <section className="mkt-ds-section">
          <h2 className="mkt-section-title">Highest-conviction moves this quarter</h2>
          <div className="wm-highlights">
            {top.map((r) => (
              <div className="wm-hl" key={r.id ?? r.accession_no}>
                <div className="wm-hl-top">
                  <TierBadge tier={r.tier} />
                  <span className="wm-hl-score gcx-mono">{Math.round(Number(r.whale_score) || 0)}</span>
                </div>
                <div className="wm-hl-filer">{r.filer_name}</div>
                <div className="wm-hl-sub">
                  {r.ticker ? <Ticker symbol={r.ticker} /> : null}
                  <span className="wm-hl-issuer">{r.issuer}</span>
                </div>
                <div className="wm-hl-why">{dominantFactor(r)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Controls + table */}
        <section className="mkt-ds-section">
          <div className="wm-controls" role="group" aria-label="Filter and sort whale moves">
            <label className="wm-control">
              <span className="wm-control-label">Filer</span>
              <select className="wm-select" value={kind} onChange={(e) => setKind(e.target.value)}>
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="wm-control">
              <span className="wm-control-label">Tier</span>
              <select className="wm-select" value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="all">All tiers</option>
                {tiers.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="wm-control">
              <span className="wm-control-label">Sort by</span>
              <select className="wm-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="wm-count gcx-mono">{view.length} shown</span>
          </div>

          <div className="mkt-ds-table-wrap" role="region" aria-label="Whale moves table" tabIndex={0}>
            <table className="mkt-ds-table wm-table">
              <thead>
                <tr>
                  <th scope="col">Filer</th>
                  <th scope="col">Ticker / issuer</th>
                  <th scope="col">Tier</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Conviction
                  </th>
                  <th scope="col">Δ vs prior qtr</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Value
                  </th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.length === 0 ? (
                  <tr>
                    <td className="mkt-ds-empty" colSpan={7}>
                      No moves match the current filters.
                    </td>
                  </tr>
                ) : (
                  view.map((r) => (
                    <tr key={r.id ?? r.accession_no}>
                      <td>
                        <EntityName>{r.filer_name}</EntityName>
                      </td>
                      <td>
                        {r.ticker ? <Ticker symbol={r.ticker} /> : null}
                        <span className="wm-issuer">{r.issuer}</span>
                      </td>
                      <td>
                        <TierBadge tier={r.tier} />
                      </td>
                      <td className="mkt-ds-mono" style={{ textAlign: 'right' }}>
                        {r.kind === 'activist' ? fmtPct(r.percent_of_class) : fmtPct(r.conviction_pct)}
                      </td>
                      <td>
                        <DeltaCell row={r} />
                      </td>
                      <td className="mkt-ds-mono" style={{ textAlign: 'right' }}>
                        {fmtUSD(r.value_usd)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <ScoreCell value={r.whale_score} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Explainer — the four factors and their weights, so the number is transparent */}
        <section className="mkt-ds-section">
          <h2 className="mkt-section-title">How the Whale Score works</h2>
          <div className="wm-explainer">
            <p className="wm-explainer-lead">
              A 0–100 composite. Institutional moves weight four factors; activist filings (13D/13G)
              are scored separately on form, stake size, and escalation. It&apos;s Ezana&apos;s own
              metric, not an SEC figure.
            </p>
            <div className="wm-factors">
              <Factor
                w={iw.conviction}
                name="Conviction"
                desc="Position as a share of the filer's own portfolio — the best 'is this a bet' signal, and why size alone can't top the list."
              />
              <Factor
                w={iw.newness}
                name="Newness"
                desc="New position > doubling > adding > trimming, diffed quarter-over-quarter. A full exit of a $100M+ name scores high too."
              />
              <Factor
                w={iw.concentration}
                name="Concentration"
                desc="A 25-name fund making a bet means more than a 3,000-name index fund. Fewer positions, higher weight."
              />
              <Factor
                w={iw.size}
                name="Absolute size"
                desc="Above the $100M gate, bigger is marginally stronger — capped low by design so it can't dominate."
              />
            </div>
          </div>
        </section>

        {/* Source */}
        <section className="mkt-ds-section">
          <h2 className="mkt-section-title">How we source it</h2>
          <div className="wm-source">
            <p>
              Built from SEC EDGAR — quarterly Form 13F-HR holdings and 13D/13G activist stakes,
              parsed and stored, then scored by Ezana&apos;s composite. The 45-day 13F filing deadline
              means holdings reflect quarter-end positions, not real-time ones — a lag inherent to the
              disclosure, not Ezana processing.
            </p>
            <p>
              The score is a <strong>derived Ezana metric</strong>, not a number reported by the SEC.
              It compares each filing to the same filer&apos;s prior quarter, so scores are only fully
              meaningful once two quarters of history are loaded; until then, positions without a prior
              quarter read as new.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function Factor({ w, name, desc }) {
  return (
    <div className="wm-factor">
      <div className="wm-factor-head">
        <span className="wm-factor-name">{name}</span>
        <span className="wm-factor-weight gcx-mono">{w}</span>
      </div>
      <div className="wm-factor-bar" aria-hidden="true">
        <span className="wm-factor-fill" style={{ width: `${w}%` }} />
      </div>
      <p className="wm-factor-desc">{desc}</p>
    </div>
  );
}
