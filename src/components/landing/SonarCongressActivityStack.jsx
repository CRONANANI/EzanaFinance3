'use client';

/**
 * The cards for a congressional activity ping (Nov 7): "How has disclosed
 * congressional trading activity changed over the last three years?" Built
 * from sonar_congress_activity (src/lib/sonar/landing-congress-activity.js).
 * Every number here comes from the dossier; nothing is computed from a model.
 *
 *   Trading over time      interactive monthly chart: chamber (both, House,
 *                          Senate), measure (trades by chamber, purchases vs
 *                          sales) and period (1Y, 2Y, 3Y); window boundaries,
 *                          the not-yet-due tail and coverage-limited months
 *                          are drawn, never hidden
 *   Window comparison      12-month windows per chamber: trades, change,
 *                          purchases, sales, members, per member, late share,
 *                          plus the late-filing estimate for the latest window
 *   Purchases vs sales     purchase share per window and chamber against the
 *                          50% line, the z test, net buyers vs net sellers
 *   House vs Senate        the shared window, per member
 *   Reporting limits       what the data cannot show, with the counts
 *
 * Same .snr-news shells and .snr-sec-* classes as the other stacks. Tokens
 * only, no outlines, no em dashes. Rows open the account gate.
 */
import { useId, useMemo, useState } from 'react';
import { activityFormat } from '@/lib/sonar/landing-congress-activity';
import './sonar-congress-activity.css';

const { n0, pct0, share1, usdM, updown, fmtDate } = activityFormat;

const RANGES = [
  { id: 12, label: '1Y' },
  { id: 24, label: '2Y' },
  { id: 36, label: '3Y' },
];
const CHAMBERS = [
  { id: 'both', label: 'Both' },
  { id: 'house', label: 'House' },
  { id: 'senate', label: 'Senate' },
];
const MEASURES = [
  { id: 'chamber', label: 'Trades' },
  { id: 'sides', label: 'Purchases vs sales' },
];

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="snr-cga-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`snr-cga-seg-btn${value === o.id ? ' is-on' : ''}`}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* Which window a month falls in (by its 15th), for the gap shading. */
function windowIndexOf(month, windows) {
  const mid = `${month}-15`;
  return windows.findIndex((w) => mid > w.from && mid <= w.to);
}

function TimelineCard({ d }) {
  const titleId = useId();
  const [range, setRange] = useState(36);
  const [chamber, setChamber] = useState('both');
  const [measure, setMeasure] = useState('chamber');
  const [hover, setHover] = useState(null);
  const a = d.analysis;
  const cutMonth = d.cutoff.slice(0, 7);

  const months = useMemo(() => {
    const last = d.monthly.length ? d.monthly[d.monthly.length - 1].month : cutMonth;
    const all = d.monthly.filter((m) => m.month <= last);
    return all.slice(Math.max(0, all.length - range - 2));
  }, [d.monthly, range, cutMonth]);

  const parts = (m) => {
    const take = (c) => (chamber === 'both' || chamber === c ? m[c] : null);
    const h = take('house');
    const s = take('senate');
    if (measure === 'chamber') {
      return [
        { key: 'house', v: h?.trades || 0, cls: 'is-house' },
        { key: 'senate', v: s?.trades || 0, cls: 'is-senate' },
      ];
    }
    return [
      { key: 'purchases', v: (h?.purchases || 0) + (s?.purchases || 0), cls: 'is-buy' },
      { key: 'sales', v: (h?.sales || 0) + (s?.sales || 0), cls: 'is-sell' },
    ];
  };

  const W = 640;
  const H = 220;
  const pad = { l: 40, r: 8, t: 14, b: 26 };
  const max = Math.max(1, ...months.map((m) => parts(m).reduce((t, p) => t + p.v, 0)));
  const bw = (W - pad.l - pad.r) / Math.max(1, months.length);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const senateGap = (m) => {
    const i = windowIndexOf(m, d.windows);
    return i >= 0 && Boolean(a.senate.gaps[i]);
  };
  const shown = hover != null ? months[hover] : null;

  return (
    <div className="snr-news snr-sec-card snr-cga-card" aria-labelledby={titleId}>
      <div className="snr-card-head">
        <span className="snr-panel-title" id={titleId}>
          Disclosed trades by month
        </span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">by transaction date</span>
      </div>
      <div className="snr-cga-controls">
        <Segmented label="Measure" options={MEASURES} value={measure} onChange={setMeasure} />
        <Segmented label="Chamber" options={CHAMBERS} value={chamber} onChange={setChamber} />
        <Segmented label="Period" options={RANGES} value={range} onChange={setRange} />
      </div>
      <p className="snr-cga-readout" aria-live="polite">
        {shown
          ? (() => {
              const p = parts(shown);
              return `${shown.month}: ${p.map((x) => `${x.key} ${n0(x.v)}`).join(', ')}${shown.month > cutMonth ? ' (not yet due, partial)' : ''}${chamber !== 'house' && senateGap(shown.month) ? ' (Senate coverage-limited)' : ''}`;
            })()
          : 'Hover or focus a month for its counts.'}
      </p>
      <svg
        className="snr-cga-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Monthly disclosed trades, ${measure === 'chamber' ? 'House and Senate' : 'purchases and sales'}, last ${range} months`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="snr-cga-grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className="snr-cga-axis" x={pad.l - 6} y={y(t) + 3} textAnchor="end">
              {n0(t)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          let base = 0;
          const x = pad.l + i * bw;
          const late = m.month > cutMonth;
          const gap = chamber !== 'house' && senateGap(m.month);
          return (
            <g
              key={m.month}
              className={`snr-cga-col${late ? ' is-late' : ''}${hover === i ? ' is-hover' : ''}`}
              tabIndex={0}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <rect className="snr-cga-hit" x={x} y={pad.t} width={bw} height={H - pad.t - pad.b} />
              {parts(m).map((p) => {
                const y0 = y(base + p.v);
                const h = y(base) - y0;
                base += p.v;
                return p.v ? (
                  <rect
                    key={p.key}
                    className={`snr-cga-bar ${p.cls}${gap && p.key === 'senate' ? ' is-gap' : ''}`}
                    x={x + 1}
                    y={y0}
                    width={Math.max(1, bw - 2)}
                    height={Math.max(0.5, h)}
                  />
                ) : null;
              })}
              {i % Math.max(1, Math.ceil(months.length / 8)) === 0 ? (
                <text className="snr-cga-axis" x={x + bw / 2} y={H - 8} textAnchor="middle">
                  {m.month}
                </text>
              ) : null}
            </g>
          );
        })}
        {d.windows.map((w) => {
          const i = months.findIndex((m) => `${m.month}-15` > w.to);
          if (i <= 0) return null;
          const x = pad.l + i * bw;
          return (
            <g key={w.k}>
              <line className="snr-cga-edge" x1={x} x2={x} y1={pad.t - 6} y2={H - pad.b} />
            </g>
          );
        })}
      </svg>
      <div className="snr-sec-legend">
        {measure === 'chamber' ? (
          <>
            <span className="snr-sec-key snr-cga-key is-house">House</span>
            <span className="snr-sec-key snr-cga-key is-senate">Senate</span>
          </>
        ) : (
          <>
            <span className="snr-sec-key is-buy">Purchases</span>
            <span className="snr-sec-key is-sell">Sales</span>
          </>
        )}
        <span className="snr-sec-key snr-cga-key is-late">Not yet due</span>
        {chamber !== 'house' && a.senate.gaps.some(Boolean) ? (
          <span className="snr-sec-key snr-cga-key is-gap">Senate coverage-limited</span>
        ) : null}
      </div>
      <p className="snr-pol-note">
        Dotted lines mark the 12-month windows, which end {fmtDate(d.cutoff)}, 45 days before{' '}
        {fmtDate(d.asof)}. Trades after that are shown but not compared: they are not yet due.
      </p>
    </div>
  );
}

function WindowTable({ d, onGate }) {
  const titleId = useId();
  const a = d.analysis;
  const rows = [];
  for (const [key, label] of [
    ['house', 'House'],
    ['senate', 'Senate'],
  ]) {
    const c = a[key];
    d.windows.forEach((w, i) => {
      const r = c.rows[i];
      const prev = i > 0 && !c.gaps[i - 1] ? c.rows[i - 1] : null;
      rows.push({
        id: `${key}-${w.k}`,
        chamber: label,
        window: w,
        r,
        gap: c.gaps[i],
        change: r && prev && !c.gaps[i] ? (r.trades / prev.trades - 1) * 100 : null,
        late: c.lateShares[i],
        perMember: c.perMember[i],
        estimate: i === d.windows.length - 1 ? c.completeness : null,
      });
    });
  }
  return (
    <div className="snr-news snr-sec-card snr-cga-card" aria-labelledby={titleId}>
      <div className="snr-card-head">
        <span className="snr-panel-title" id={titleId}>
          12-month windows by chamber
        </span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">to {fmtDate(d.cutoff)}</span>
      </div>
      <div className="snr-sec-table snr-cga-table" role="table" aria-labelledby={titleId}>
        <div className="snr-sec-tr snr-sec-th" role="row">
          <span role="columnheader">Window</span>
          <span role="columnheader">Trades</span>
          <span role="columnheader">Change</span>
          <span role="columnheader">Buy / sell</span>
          <span role="columnheader">Members</span>
          <span role="columnheader">Per member</span>
          <span role="columnheader">Filed late</span>
        </div>
        {rows.map((x) => (
          <button
            key={x.id}
            type="button"
            className={`snr-sec-tr${x.gap ? ' is-gap' : ''}`}
            role="row"
            onClick={onGate}
            title={x.gap || undefined}
          >
            <span role="cell" className="snr-cga-win">
              <b>{x.chamber}</b> {x.window.short}
            </span>
            <span role="cell">
              {x.r ? n0(x.r.trades) : 'n/a'}
              {x.estimate && x.estimate.estimate > x.estimate.observed ? (
                <small className="snr-cga-est"> ~{n0(x.estimate.estimate)} est.</small>
              ) : null}
            </span>
            <span
              role="cell"
              className={x.change == null ? '' : x.change >= 0 ? 'is-up' : 'is-down'}
            >
              {x.gap ? 'not comparable' : x.change == null ? 'first comparable' : updown(x.change)}
            </span>
            <span role="cell">{x.r ? `${n0(x.r.purchases)} / ${n0(x.r.sales)}` : 'n/a'}</span>
            <span role="cell">{x.r ? x.r.members : 'n/a'}</span>
            <span role="cell">
              {x.perMember == null ? 'n/a' : x.perMember.toFixed(1)}
              {x.r?.tpmMedian != null ? <small> med {x.r.tpmMedian}</small> : null}
            </span>
            <span role="cell">{x.late == null ? 'n/a' : share1(x.late)}</span>
          </button>
        ))}
      </div>
      <p className="snr-pol-note">
        Greyed rows are not compared:{' '}
        {[
          ...new Set(
            rows.filter((x) => x.gap).map((x) => `${x.chamber}, ${x.window.label}: ${x.gap}`),
          ),
        ].join('; ') || 'none'}
        . The latest window&apos;s estimate applies the prior window&apos;s filing-lag profile month
        by month; filed late means more than 45 days after the trade, which is low in the latest
        window because late filings have not arrived yet.
      </p>
    </div>
  );
}

function SidesCard({ d }) {
  const titleId = useId();
  const [chamber, setChamber] = useState('house');
  const c = d.analysis[chamber];
  const t = c.sideTest;
  return (
    <div className="snr-news snr-sec-card snr-cga-card" aria-labelledby={titleId}>
      <div className="snr-card-head">
        <span className="snr-panel-title" id={titleId}>
          Purchases versus sales
        </span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <Segmented
          label="Chamber"
          options={CHAMBERS.filter((o) => o.id !== 'both')}
          value={chamber}
          onChange={setChamber}
        />
      </div>
      <div className="snr-cga-sides" role="list">
        {d.windows.map((w, i) => {
          const r = c.rows[i];
          const share = c.buyShares[i];
          return (
            <div
              key={w.k}
              role="listitem"
              className={`snr-cga-side${c.gaps[i] ? ' is-gap' : ''}`}
              aria-label={`${w.label}: ${share1(share)} purchases`}
            >
              <span className="snr-cga-side-label">{w.short}</span>
              <span className="snr-cga-side-track" aria-hidden="true">
                <span className="snr-cga-side-buy" style={{ width: `${(share || 0) * 100}%` }} />
                <span className="snr-cga-side-mid" />
              </span>
              <span className="snr-cga-side-val">
                {share1(share)}
                {r ? <small> of {n0(r.purchases + r.sales)}</small> : null}
              </span>
            </div>
          );
        })}
      </div>
      <div className="snr-sec-stats">
        <div className="snr-stat">
          <span className="snr-stat-label">Change, last two windows</span>
          <span className={`snr-stat-value ${t?.changePp < 0 ? 'is-down' : 'is-up'}`}>
            {t?.changePp == null
              ? 'n/a'
              : `${t.changePp > 0 ? '+' : ''}${t.changePp.toFixed(1)} pp`}
          </span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">z test</span>
          <span className="snr-stat-value">
            {t?.value == null ? 'n/a' : `z ${t.value.toFixed(1)}`}
          </span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">Net sellers / buyers</span>
          <span className="snr-stat-value">
            {c.latest ? `${c.latest.netSellers} / ${c.latest.netBuyers}` : 'n/a'}
          </span>
        </div>
        <div className="snr-stat">
          <span className="snr-stat-label">Est. bought / sold</span>
          <span className="snr-stat-value">
            {c.latest
              ? `${usdM(c.latest.amount.purchaseMid)} / ${usdM(c.latest.amount.saleMid)}`
              : 'n/a'}
          </span>
        </div>
      </div>
      <p className="snr-pol-note">
        Share of purchases among purchases and sales, by trade count. The z test treats trades as
        independent; trades cluster by member, so the member split is shown beside it. Dollar
        figures are sums of the midpoints of filed ranges, estimates only.
      </p>
    </div>
  );
}

function ChambersCard({ d }) {
  const titleId = useId();
  const a = d.analysis;
  const sh = a.shared;
  if (!sh) return null;
  const rows = [
    ['House', a.house.latest, sh.housePerMember, a.house.topOne, a.house.topOneShare],
    ['Senate', a.senate.latest, sh.senatePerMember, a.senate.topOne, a.senate.topOneShare],
  ];
  return (
    <div className="snr-news snr-sec-card snr-cga-card" aria-labelledby={titleId}>
      <div className="snr-card-head">
        <span className="snr-panel-title" id={titleId}>
          House versus Senate
        </span>
        <span className="snr-rule-soft" aria-hidden="true" />
        <span className="snr-range-chip">{sh.window.label}</span>
      </div>
      <div
        className="snr-sec-table snr-cga-table snr-cga-table--ch"
        role="table"
        aria-labelledby={titleId}
      >
        <div className="snr-sec-tr snr-sec-th" role="row">
          <span role="columnheader">Chamber</span>
          <span role="columnheader">Trades</span>
          <span role="columnheader">Members</span>
          <span role="columnheader">Per member</span>
          <span role="columnheader">Top 5 share</span>
          <span role="columnheader">Most active</span>
        </div>
        {rows.map(([label, r, per, top, topShare]) => (
          <div key={label} className="snr-sec-tr" role="row">
            <span role="cell">
              <b>{label}</b>
            </span>
            <span role="cell">{n0(r.trades)}</span>
            <span role="cell">{r.members}</span>
            <span role="cell">
              {per.toFixed(1)} <small>med {r.tpmMedian}</small>
            </span>
            <span role="cell">{share1(r.top5Share)}</span>
            <span role="cell" className="snr-cga-name">
              {top ? `${top.name} (${pct0(topShare * 100)})` : 'n/a'}
            </span>
          </div>
        ))}
      </div>
      {sh.senateExTop != null && a.senate.topOneShare > 0.3 ? (
        <p className="snr-pol-note">
          Without its most active filer the Senate averaged {sh.senateExTop.toFixed(1)} trades per
          member. Chambers are compared per member because the House has 435 seats and the Senate
          100.
        </p>
      ) : null}
    </div>
  );
}

function LimitsCard({ d }) {
  const titleId = useId();
  const a = d.analysis;
  const hl = a.house.latest;
  const owners = hl ? hl.owners : null;
  const items = [
    `${n0((a.house.tail?.trades || 0) + (a.senate.tail?.trades || 0))} trades made after ${fmtDate(d.cutoff)} are not yet due and are not compared.`,
    a.house.completeness
      ? `Late filers are still arriving for the latest window: in the prior window ${share1(a.house.prior.late / Math.max(1, a.house.prior.withLag))} of House trades were filed after 45 days (90th percentile ${Math.round(a.house.prior.lagP90)} days).`
      : null,
    `${n0(d.duplicatesRemoved.house + d.duplicatesRemoved.senate)} third-party rows that repeated an official filing were removed (${n0(d.duplicatesRemoved.senate)} Senate, ${n0(d.duplicatesRemoved.house)} House).`,
    ...a.senate.gaps
      .map((g, i) => (g ? `Senate, ${d.windows[i].label}: ${g}.` : null))
      .filter(Boolean),
    owners
      ? `Owner in the latest House window: ${n0(owners.spouse)} spouse, ${n0(owners.joint)} joint, ${n0(owners.dependent)} dependent, ${n0(owners.unstated)} blank (House forms leave it blank for the member's own account).`
      : null,
    'Amounts are filed ranges; any dollar total is an estimate. Notification dates for spouse or managed accounts can legitimately extend the 45-day clock, so a late flag is not a violation.',
  ].filter(Boolean);
  return (
    <div className="snr-news snr-sec-card snr-cga-card" aria-labelledby={titleId}>
      <div className="snr-card-head">
        <span className="snr-panel-title" id={titleId}>
          Reporting limits applied
        </span>
        <span className="snr-rule-soft" aria-hidden="true" />
      </div>
      <ul className="snr-cga-limits">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function SonarCongressActivityStack({
  dossier,
  onGate,
  topSlot = null,
  newsSlot = null,
  full = false,
}) {
  const d = dossier;
  if (!d || d.kind !== 'congress_activity') return null;
  const cards = [
    <TimelineCard key="timeline" d={d} />,
    <WindowTable key="windows" d={d} onGate={onGate} />,
    <SidesCard key="sides" d={d} />,
    <ChambersCard key="chambers" d={d} />,
    <LimitsCard key="limits" d={d} />,
  ];
  return (
    <div className="snr-stack snr-stack--cga">
      {topSlot}
      {full ? cards : cards.slice(0, 1)}
      {newsSlot}
    </div>
  );
}

export default SonarCongressActivityStack;
