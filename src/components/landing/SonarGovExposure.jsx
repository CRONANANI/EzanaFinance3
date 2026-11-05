'use client';

/**
 * Government exposure cards (Nov 4) for a company ping that asks how
 * dependent the company is on government spending. Three interactive cards
 * in the right-hand stack on the page, above the news:
 *
 *   Revenue by customer   government vs commercial segment revenue per
 *                         quarter or fiscal year, in dollars or as the
 *                         government share (dossier.revenueMix)
 *   Federal obligations   obligations on awards dated in each fiscal year,
 *                         filterable by agency, current year marked
 *                         partial, with agency concentration
 *                         (dossier.matches.contracts.byFyAgency)
 *   Largest awards        the largest awards with what was obligated, the
 *                         ceiling and what remains only potential, expandable
 *                         to purpose, PIID, dates and the USAspending record
 *                         (dossier.matches.contracts.topAwards)
 *
 * A card renders only when its data is there and comparable: no card is
 * drawn from an incomplete series. Definitions sit under each chart. Shares
 * and growth are derived from reported values and labelled as such.
 * Customer type (government vs commercial) is never mixed with geography.
 */
import { useMemo, useState } from 'react';
import './sonar-gov-exposure.css';

const usd = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 'n/a';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(a >= 1e10 ? 1 : 2)}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(a >= 1e8 ? 0 : 1)}M`;
  if (a >= 1e3) return `${s}$${Math.round(a / 1e3)}K`;
  return `${s}$${Math.round(a)}`;
};
const pct = (r, d = 1) => (r == null ? 'n/a' : `${(r * 100).toFixed(d)}%`);
const signedPct = (r) => (r == null ? 'n/a' : `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1)}%`);
const qLabel = (p) =>
  p.period && p.fiscalYear ? `${p.period} FY${String(p.fiscalYear).slice(2)}` : p.date.slice(0, 7);

function Chips({ options, value, onChange, label }) {
  return (
    <div className="snr-ge-chips" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          className={`snr-ge-chip${id === value ? ' is-on' : ''}`}
          aria-pressed={id === value}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/* ── Revenue by customer type ───────────────────────────────────────── */

function RevenueMixCard({ mix }) {
  const hasAnnual = (mix.annual || []).length >= 3;
  const [freq, setFreq] = useState('q');
  const [view, setView] = useState('usd');
  const [hover, setHover] = useState(null);
  const points = freq === 'a' && hasAnnual ? mix.annual : mix.quarters.slice(-12);
  const W = 300;
  const H = 120;
  const pad = 4;
  const step = (W - pad * 2) / points.length;
  const bw = Math.max(4, step * 0.66);
  const maxTotal = Math.max(1, ...points.map((p) => p.total));
  const L = mix.latest;
  const Y = mix.yearAgo;
  const hot = hover != null ? points[hover] : null;
  const govName = mix.govLabel;
  const otherName = mix.otherLabel;
  const sharePath = points
    .map((p, i) => {
      const x = pad + i * step + step / 2;
      const y = H - 8 - p.govShare * (H - 16);
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="snr-news snr-ge-card">
      <div className="snr-card-head">
        <span className="snr-panel-title">Revenue by customer</span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">{qLabel(L)}</span>
      </div>
      <div className="snr-ge-stats">
        <div className="snr-stat">
          <span className="snr-stat-label">{govName} share</span>
          <span className="snr-stat-value">{pct(L.govShare)}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">A year earlier</span>
          <span className="snr-stat-value">{pct(Y?.govShare)}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">{govName} YoY</span>
          <span className="snr-stat-value">{signedPct(L.govYoy)}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">{otherName} YoY</span>
          <span className="snr-stat-value">{signedPct(L.otherYoy)}</span>
        </div>
      </div>
      <div className="snr-ge-controls">
        <Chips
          label="Frequency"
          value={freq}
          onChange={(v) => {
            setFreq(v);
            setHover(null);
          }}
          options={
            hasAnnual
              ? [
                  ['q', 'Quarterly'],
                  ['a', 'Fiscal year'],
                ]
              : [['q', 'Quarterly']]
          }
        />
        <Chips
          label="View"
          value={view}
          onChange={setView}
          options={[
            ['usd', 'Dollars'],
            ['share', 'Share'],
          ]}
        />
      </div>
      <svg
        className="snr-ge-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${govName} and ${otherName} revenue by ${freq === 'a' ? 'fiscal year' : 'quarter'}`}
        onMouseLeave={() => setHover(null)}
      >
        {view === 'share' ? (
          <>
            <line
              className="snr-ge-ref"
              x1="0"
              x2={W}
              y1={H - 8 - 0.5 * (H - 16)}
              y2={H - 8 - 0.5 * (H - 16)}
            />
            <path className="snr-ge-line" d={sharePath} />
          </>
        ) : null}
        {points.map((p, i) => {
          const x = pad + i * step + (step - bw) / 2;
          const hG = (p.gov / maxTotal) * (H - 10);
          const hO = (p.other / maxTotal) * (H - 10);
          return (
            <g key={p.date}>
              <rect
                className="snr-ge-hit"
                x={pad + i * step}
                y="0"
                width={step}
                height={H}
                onMouseEnter={() => setHover(i)}
              />
              {view === 'usd' ? (
                <>
                  <rect
                    className={`snr-ge-bar is-gov${hover === i ? ' is-hot' : ''}`}
                    x={x}
                    y={H - hG}
                    width={bw}
                    height={hG}
                  />
                  <rect
                    className={`snr-ge-bar is-other${hover === i ? ' is-hot' : ''}`}
                    x={x}
                    y={H - hG - hO}
                    width={bw}
                    height={hO}
                  />
                </>
              ) : (
                <circle
                  className={`snr-ge-dot${hover === i ? ' is-hot' : ''}`}
                  cx={pad + i * step + step / 2}
                  cy={H - 8 - p.govShare * (H - 16)}
                  r="2.4"
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="snr-ge-legend">
        <span className="snr-ge-key is-gov">{govName}</span>
        <span className="snr-ge-key is-other">{otherName}</span>
        {view === 'share' ? <span className="snr-ge-key is-ref">50% line</span> : null}
      </div>
      <p className="snr-ge-readout" aria-live="polite">
        {hot
          ? `${qLabel(hot)}: ${govName} ${usd(hot.gov)} (${pct(hot.govShare)}), ${otherName} ${usd(hot.other)}${hot.govYoy != null ? `, ${govName} ${signedPct(hot.govYoy)} YoY` : ''}`
          : 'Hover a period for its figures'}
      </p>
      <p className="snr-pol-note">
        Company-reported segment revenue (customer type, not geography). Share ={' '}
        {govName.toLowerCase()} / segment total; YoY compares the same quarter a year earlier.
      </p>
    </div>
  );
}

/* ── Federal obligations by fiscal year ─────────────────────────────── */

function FederalObligationsCard({ c }) {
  const agencies = (c.agencyRanking || []).slice(0, 4).map((a) => a.name);
  const [agency, setAgency] = useState('ALL');
  const [hover, setHover] = useState(null);
  const series = useMemo(() => {
    const byFy = new Map();
    for (const r of c.byFyAgency || []) {
      if (agency !== 'ALL' && r.agency !== agency) continue;
      const cur = byFy.get(r.fy) || { fy: r.fy, value: 0, awards: 0 };
      cur.value += r.value;
      cur.awards += r.awards;
      byFy.set(r.fy, cur);
    }
    const fys = [...byFy.keys()].sort((a, b) => a - b);
    if (!fys.length) return [];
    const from = Math.max(fys[0], fys[fys.length - 1] - 9);
    const out = [];
    for (let fy = from; fy <= fys[fys.length - 1]; fy += 1) {
      out.push(byFy.get(fy) || { fy, value: 0, awards: 0 });
    }
    return out;
  }, [c, agency]);
  if (!series.length) return null;

  const W = 300;
  const H = 110;
  const step = W / series.length;
  const bw = Math.max(6, step * 0.62);
  const max = Math.max(1, ...series.map((d) => Math.max(0, d.value)));
  const hot = hover != null ? series[hover] : null;
  const complete = series.filter((d) => d.fy < c.fyNow);
  const lastFull = complete[complete.length - 1];
  const prevFull = complete[complete.length - 2];
  const yoy = lastFull && prevFull && prevFull.value ? lastFull.value / prevFull.value - 1 : null;
  const total = series.reduce((s, d) => s + d.value, 0);
  const conc = (c.agencyRanking || []).slice(0, 5);

  return (
    <div className="snr-news snr-ge-card">
      <div className="snr-card-head">
        <span className="snr-panel-title">Federal obligations</span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">
          FY{String(series[0].fy).slice(2)} to FY{String(series[series.length - 1].fy).slice(2)}
        </span>
      </div>
      <div className="snr-ge-stats">
        <div className="snr-stat">
          <span className="snr-stat-label">Obligated</span>
          <span className="snr-stat-value">{usd(total)}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">FY{lastFull ? String(lastFull.fy).slice(2) : ''}</span>
          <span className="snr-stat-value">{lastFull ? usd(lastFull.value) : 'n/a'}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">YoY</span>
          <span className="snr-stat-value">{signedPct(yoy)}</span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">Awards</span>
          <span className="snr-stat-value">
            {series.reduce((s, d) => s + d.awards, 0).toLocaleString('en-US')}
          </span>
        </div>
      </div>
      <Chips
        label="Agency"
        value={agency}
        onChange={(v) => {
          setAgency(v);
          setHover(null);
        }}
        options={[['ALL', 'All'], ...agencies.map((a) => [a, a])]}
      />
      <svg
        className="snr-ge-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Federal obligations by fiscal year${agency === 'ALL' ? '' : `, ${agency}`}`}
        onMouseLeave={() => setHover(null)}
      >
        {series.map((d, i) => {
          const hgt = (Math.max(0, d.value) / max) * (H - 8);
          const partial = d.fy >= c.fyNow;
          return (
            <g key={d.fy}>
              <rect
                className="snr-ge-hit"
                x={i * step}
                y="0"
                width={step}
                height={H}
                onMouseEnter={() => setHover(i)}
              />
              <rect
                className={`snr-ge-bar is-fy${partial ? ' is-partial' : ''}${hover === i ? ' is-hot' : ''}`}
                x={i * step + (step - bw) / 2}
                y={H - hgt}
                width={bw}
                height={hgt}
              />
            </g>
          );
        })}
      </svg>
      <div className="snr-ge-axis" aria-hidden="true">
        <span>FY{String(series[0].fy).slice(2)}</span>
        <span>FY{String(series[series.length - 1].fy).slice(2)}</span>
      </div>
      <p className="snr-ge-readout" aria-live="polite">
        {hot
          ? `FY${hot.fy}: ${usd(hot.value)} obligated on ${hot.awards} awards${hot.fy >= c.fyNow ? ' (fiscal year in progress)' : ''}`
          : 'Hover a fiscal year for its figures'}
      </p>
      {agency === 'ALL' && conc.length ? (
        <div className="snr-ge-conc" aria-label="Concentration by agency">
          <span className="snr-ge-sub">Concentration by agency, all years</span>
          {conc.map((a) => (
            <div key={a.name} className="snr-ge-conc-row">
              <span className="snr-ge-conc-name">{a.name}</span>
              <span className="snr-ge-meter" aria-hidden="true">
                <span className="snr-ge-fill" style={{ width: `${Math.max(2, a.share * 100)}%` }} />
              </span>
              <span className="snr-ge-conc-v">{pct(a.share, 0)}</span>
            </div>
          ))}
        </div>
      ) : null}
      <p className="snr-pol-note">
        Obligations on awards dated in each federal fiscal year (October to September), as reported
        to USAspending
        {c.entities?.length ? `, across ${c.entities.join(' and ')}` : ''}. Obligations are money
        committed, not revenue and not contract ceilings.
      </p>
    </div>
  );
}

/* ── Largest awards ─────────────────────────────────────────────────── */

function LargestAwardsCard({ c }) {
  const rows = (c.topAwards || []).slice(0, 8);
  const [open, setOpen] = useState(null);
  const withFacts = rows.filter((r) => r.hasFacts).length;
  if (!rows.length) return null;
  return (
    <div className="snr-news snr-ge-card">
      <div className="snr-card-head">
        <span className="snr-panel-title">Largest federal awards</span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">By obligation</span>
      </div>
      <div className="snr-sec-table snr-ge-table" role="table" aria-label="Largest federal awards">
        <div className="snr-sec-tr snr-sec-th" role="row">
          <span role="columnheader">Agency</span>
          <span role="columnheader">Obligated</span>
          <span role="columnheader">Ceiling</span>
          <span role="columnheader">Potential</span>
          <span role="columnheader">Signed</span>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="snr-ge-award">
            <button
              type="button"
              className="snr-sec-tr"
              role="row"
              aria-expanded={open === r.id}
              onClick={() => setOpen(open === r.id ? null : r.id)}
            >
              <span role="cell" className="snr-sec-tk" title={r.subAgency || r.agency}>
                {r.agency}
              </span>
              <span role="cell">{usd(r.obligated)}</span>
              <span role="cell">{r.ceiling != null ? usd(r.ceiling) : 'n/a'}</span>
              <span role="cell">
                {r.remainingPotential != null ? usd(r.remainingPotential) : 'n/a'}
              </span>
              <span role="cell">
                {r.signed ? r.signed.slice(0, 7) : r.fy ? `FY${r.fy}` : 'n/a'}
              </span>
            </button>
            {open === r.id ? (
              <div className="snr-ge-detail">
                <span>
                  <b>Recipient</b> {r.recipient}
                </span>
                {r.purpose ? (
                  <span>
                    <b>Purpose</b> {r.purpose}
                  </span>
                ) : null}
                {r.piid ? (
                  <span>
                    <b>Contract ID</b> {r.piid}
                  </span>
                ) : null}
                {r.awardType ? (
                  <span>
                    <b>Type</b> {r.awardType}
                  </span>
                ) : null}
                {r.lastModified ? (
                  <span>
                    <b>Latest action</b> {r.lastModified}
                    {r.modifications != null
                      ? ` (${r.modifications >= 100 ? '100+' : r.modifications} actions)`
                      : ''}
                  </span>
                ) : null}
                {r.exercised != null ? (
                  <span>
                    <b>Base and exercised options</b> {usd(r.exercised)}
                  </span>
                ) : null}
                {r.popPotentialEnd || r.popEnd ? (
                  <span>
                    <b>Performance ends</b> {r.popEnd || 'n/a'}
                    {r.popPotentialEnd ? `, potentially ${r.popPotentialEnd}` : ''}
                  </span>
                ) : null}
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  USAspending record
                  <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                </a>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="snr-pol-note">
        Ceiling is base and all options, the most the award could reach; Potential is ceiling less
        obligated. Neither is guaranteed revenue.
        {withFacts < rows.length
          ? ' Ceilings and contract details fill in as award records sync.'
          : ''}
      </p>
    </div>
  );
}

export function SonarGovExposure({ dossier }) {
  const c = dossier?.matches?.contracts;
  const cards = [
    dossier?.revenueMix ? <RevenueMixCard key="mix" mix={dossier.revenueMix} /> : null,
    c?.byFyAgency?.length ? <FederalObligationsCard key="fy" c={c} /> : null,
    c?.topAwards?.length ? <LargestAwardsCard key="awards" c={c} /> : null,
  ].filter(Boolean);
  return cards.length ? <div className="snr-ge">{cards}</div> : null;
}

export default SonarGovExposure;
