'use client';

/**
 * Company card: opened from an EzanaQL result row that carries a ticker.
 *
 * Three things, in the order a reader wants them:
 *   1. The contracts: total, count, agencies and recipient entities that
 *      resolved to this ticker, in the window the query asked for (or all
 *      on file when it asked for none), and the largest awards.
 *   2. The price chart: daily closes with one portrait per member purchase,
 *      sitting on the close nearest the purchase date. Hover or focus a
 *      portrait for who, when, and the disclosed amount.
 *   3. The holders: every member whose disclosures say they still hold the
 *      stock, with the estimated position and the last disclosed action.
 *
 * Holdings and amounts are inferred from range disclosures, and the card
 * says so. Prices come from /api/market-data/stock-candles; when that has
 * nothing (no key, unknown symbol, rate limit) the chart gives way to a plain
 * list of purchase dates rather than an empty box.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { avatarSources } from '@/components/datasets/politician-tracker/MemberAvatar';
import { formatDate, formatMoney } from '@/lib/ezanaql/grid-format';
import { usdShort } from '@/lib/politicians/tracker-model';
import { CHART, layoutChart, rangeFor } from '@/lib/contracts/company-chart';
import './company-card.css';

const party = (p) =>
  p === 'D' ? 'Democrat' : p === 'R' ? 'Republican' : p === 'I' ? 'Independent' : '';
const chamber = (c) => (c === 'senate' ? 'Sen.' : c === 'house' ? 'Rep.' : '');

/* A portrait inside an SVG: a circle-clipped image with a party-coloured
   ring; initials when no source loads. */
function Portrait({ holder, cx, cy, r, id }) {
  const sources = useMemo(
    () =>
      holder
        ? avatarSources({
            name: holder.name,
            bioguideId: holder.bioguide_id,
            photoUrl: holder.photo_url,
          })
        : [],
    [holder],
  );
  const [idx, setIdx] = useState(0);
  const src = sources[idx] || null;
  const initials = String(holder?.name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <g className={`ccd-portrait ccd-portrait--${holder?.party || 'x'}`}>
      <clipPath id={id}>
        <circle cx={cx} cy={cy} r={r - 1.5} />
      </clipPath>
      <circle cx={cx} cy={cy} r={r} className="ccd-portrait-ring" />
      {src ? (
        <image
          href={src}
          x={cx - r}
          y={cy - r}
          width={r * 2}
          height={r * 2}
          clipPath={`url(#${id})`}
          preserveAspectRatio="xMidYMin slice"
          onError={() => setIdx((i) => i + 1)}
        />
      ) : (
        <text x={cx} y={cy + 3.5} textAnchor="middle" className="ccd-portrait-initials">
          {initials}
        </text>
      )}
    </g>
  );
}

function PriceChart({ ticker, candles, purchases, holders }) {
  const holdersById = useMemo(
    () => Object.fromEntries((holders || []).map((h) => [h.bioguide_id, h])),
    [holders],
  );
  /* Laid out at the container's real width, so a portrait is 22px on a
     phone as well as a desktop instead of the whole drawing scaling down. */
  const boxRef = useRef(null);
  const [width, setWidth] = useState(CHART.width);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      if (w > 0) setWidth(Math.max(300, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const layout = useMemo(
    () => layoutChart(candles, purchases, holdersById, { width }),
    [candles, purchases, holdersById, width],
  );
  const [active, setActive] = useState(null);
  const { W, H, path, yTicks, xTicks, markers, first, last, maxLevel } = layout;
  const r = CHART.marker / 2;
  const tip = active != null ? markers[active] : null;
  /* Extra headroom when portraits stack more than two high. */
  const top = layout.ok ? Math.max(0, (maxLevel - 1) * (CHART.marker + CHART.stackGap)) : 0;
  if (!layout.ok) return <div ref={boxRef} />;
  return (
    <div className="ccd-chart" ref={boxRef} onMouseLeave={() => setActive(null)}>
      <svg
        viewBox={`0 ${-top} ${W} ${H + top}`}
        width={W}
        height={H + top}
        role="img"
        aria-label={`${ticker} daily close with member purchases marked`}
      >
        {yTicks.map((t) => (
          <g key={t.v}>
            <line
              x1={CHART.pad.left}
              x2={W - CHART.pad.right}
              y1={t.y}
              y2={t.y}
              className="ccd-grid"
            />
            <text x={CHART.pad.left - 6} y={t.y + 3.5} textAnchor="end" className="ccd-tick">
              {t.v >= 1000 ? `${(t.v / 1000).toFixed(1)}k` : t.v}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t.t} x={t.x} y={H - 8} textAnchor="middle" className="ccd-tick">
            {t.label}
          </text>
        ))}
        <path d={path} className="ccd-line" />
        <circle cx={last.x} cy={last.y} r="3" className="ccd-last" />
        {markers.map((m, i) => (
          <g
            key={`${m.bioguide_id}-${m.date}`}
            className={`ccd-marker${active === i ? ' is-active' : ''}`}
            tabIndex={0}
            role="button"
            aria-label={`${m.holder?.name || m.bioguide_id} bought ${formatDate(m.date)}${
              m.buys > 1 ? `, ${m.buys} purchases` : ''
            }, about ${usdShort(m.amount)} at $${m.price.toFixed(2)}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <line x1={m.cx} x2={m.cx} y1={m.my + r} y2={m.cy} className="ccd-stem" />
            <circle cx={m.cx} cy={m.cy} r="3.5" className="ccd-buy" />
            <Portrait holder={m.holder} cx={m.cx} cy={m.my} r={r} id={`ccd-clip-${i}`} />
            {m.buys > 1 ? (
              <g>
                <circle cx={m.cx + r - 2} cy={m.my - r + 2} r="6.5" className="ccd-count-bg" />
                <text x={m.cx + r - 2} y={m.my - r + 5} textAnchor="middle" className="ccd-count">
                  {m.buys}
                </text>
              </g>
            ) : null}
          </g>
        ))}
      </svg>
      {tip ? (
        <div
          className="ccd-tip"
          style={{
            left: `${(tip.cx / W) * 100}%`,
            '--ccd-tip-shift': tip.cx < W * 0.2 ? '0%' : tip.cx > W * 0.8 ? '-100%' : '-50%',
          }}
        >
          <span className="ccd-tip-name">{tip.holder?.name || tip.bioguide_id}</span>
          <span className="ccd-mono">
            {formatDate(tip.date)} · ${tip.price.toFixed(2)}
          </span>
          <span className="ccd-mono">
            {tip.buys > 1 ? `${tip.buys} purchases, ` : ''}~{usdShort(tip.amount)} disclosed
          </span>
        </div>
      ) : null}
      <p className="ccd-chart-note">
        Daily close since {new Date(first.t).getUTCFullYear()}, last ${last.v.toFixed(2)}. A
        portrait marks a disclosed purchase by a member who still holds the stock; hover or focus
        one for the date and amount.
      </p>
    </div>
  );
}

export default function CompanyCard({ ticker, name, since, onClose }) {
  const [state, setState] = useState('loading'); // loading | ready | failed
  const [card, setCard] = useState(null);
  const [candles, setCandles] = useState(null); // null = not yet, [] = none
  const closeRef = useRef(null);

  useEffect(() => {
    const ctl = new AbortController();
    setState('loading');
    setCard(null);
    setCandles(null);
    const q = new URLSearchParams({ ticker });
    if (since) q.set('since', since);
    fetch(`/api/contracts/company?${q}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.ok) throw new Error('failed');
        setCard(d.card);
        setState('ready');
        const range = rangeFor(d.card.purchases);
        return fetch(
          `/api/market-data/stock-candles?symbol=${encodeURIComponent(ticker)}&range=${range}`,
          {
            signal: ctl.signal,
          },
        )
          .then((r) => r.json())
          .then((c) => setCandles(Array.isArray(c?.candles) ? c.candles : []))
          .catch(() => setCandles([]));
      })
      .catch(() => {
        if (!ctl.signal.aborted) setState('failed');
      });
    return () => ctl.abort();
  }, [ticker, since]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const holders = card?.holders || [];
  const purchases = card?.purchases || [];
  const title = name || card?.names?.[0]?.name || ticker;

  return (
    <div className="ccd-backdrop" onClick={onClose} role="presentation">
      <section
        className="ccd"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ccd-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ccd-head">
          <div>
            <p className="ccd-eyebrow">
              <span className="ccd-mono">{ticker}</span>
              {since ? ` · contracts since ${formatDate(since)}` : ' · all contracts on file'}
            </p>
            <h2 id="ccd-title" className="ccd-title">
              {title}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="ccd-x"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        {state === 'loading' ? (
          <div className="ccd-body" aria-busy="true">
            <div className="ccd-skel" />
            <div className="ccd-skel ccd-skel--tall" />
          </div>
        ) : state === 'failed' ? (
          <p className="ccd-empty">Company details could not be loaded. Try again in a moment.</p>
        ) : (
          <div className="ccd-body">
            <div className="ccd-stats">
              <div className="ccd-stat">
                <span className="ccd-stat-label">Contracts</span>
                <span className="ccd-stat-value ccd-mono">{usdShort(card.total)}</span>
                <span className="ccd-stat-sub ccd-mono">
                  {Number(card.awardCount || 0).toLocaleString('en-US')} award
                  {card.awardCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className="ccd-stat">
                <span className="ccd-stat-label">Members holding</span>
                <span className="ccd-stat-value ccd-mono">{holders.length}</span>
                <span className="ccd-stat-sub ccd-mono">
                  est. {usdShort(holders.reduce((a, h) => a + (Number(h.est_value) || 0), 0))}{' '}
                  between them
                </span>
              </div>
              <div className="ccd-stat">
                <span className="ccd-stat-label">Top agency</span>
                <span className="ccd-stat-value ccd-stat-value--text">
                  {card.agencies?.[0]?.agency || '·'}
                </span>
                <span className="ccd-stat-sub ccd-mono">
                  {card.agencies?.[0]
                    ? `${usdShort(card.agencies[0].amount)} · ${card.agencies[0].n} awards`
                    : ''}
                </span>
              </div>
            </div>

            <section className="ccd-section">
              <h3 className="ccd-h">Members who still hold {ticker}</h3>
              {candles == null ? (
                <div className="ccd-skel ccd-skel--tall" aria-busy="true" />
              ) : candles.length >= 2 ? (
                <PriceChart
                  ticker={ticker}
                  candles={candles}
                  purchases={purchases}
                  holders={holders}
                />
              ) : (
                <p className="ccd-note">
                  Price history is not available for {ticker} right now; purchase dates are listed
                  below.
                </p>
              )}
              {holders.length ? (
                <ul className="ccd-holders">
                  {holders.map((h) => {
                    const buys = purchases.filter((p) => p.bioguide_id === h.bioguide_id);
                    return (
                      <li key={h.bioguide_id} className="ccd-holder">
                        <HolderAvatar holder={h} />
                        <div className="ccd-holder-main">
                          <span className="ccd-holder-name">
                            {chamber(h.chamber)} {h.name}
                          </span>
                          <span className="ccd-holder-meta">
                            {party(h.party)}
                            {h.state ? ` · ${h.state}` : ''}
                            {buys.length
                              ? ` · ${buys.length} buy${buys.length === 1 ? '' : 's'}, first ${formatDate(buys[0].date)}`
                              : ''}
                          </span>
                        </div>
                        <div className="ccd-holder-right">
                          <span className="ccd-mono ccd-holder-est">~{usdShort(h.est_value)}</span>
                          <span className="ccd-holder-meta">
                            last {h.last_action === 'sale_partial' ? 'partial sale' : 'buy'}{' '}
                            {formatDate(h.last_trade)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="ccd-empty">
                  No member&apos;s disclosures show an open position in {ticker}.
                </p>
              )}
              <p className="ccd-note">
                Inferred, not reported: a member has a buy on file and their latest action is a
                purchase or partial sale. Sizes are midpoints of disclosed ranges, floored at
                $1,001.
              </p>
            </section>

            <section className="ccd-section">
              <h3 className="ccd-h">Largest awards{since ? ' in this window' : ''}</h3>
              {card.names?.length > 1 ? (
                <p className="ccd-note">
                  Resolved to {ticker} from {card.names.length} recipient entities:{' '}
                  {card.names.map((n) => n.name).join(', ')}.
                </p>
              ) : null}
              {card.awards?.length ? (
                <table className="ccd-table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Agency</th>
                      <th className="ccd-num">Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.awards.map((a) => (
                      <tr key={a.id}>
                        <td className="ccd-ellipsis" title={a.recipient}>
                          {a.recipient}
                        </td>
                        <td className="ccd-ellipsis" title={a.agency}>
                          {a.agency}
                        </td>
                        <td className="ccd-num ccd-mono">{formatMoney(Number(a.amount))}</td>
                        <td className="ccd-mono">{formatDate(a.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="ccd-empty">No awards resolved to {ticker} in this window.</p>
              )}
            </section>
          </div>
        )}
      </section>
    </div>
  );
}

function HolderAvatar({ holder }) {
  const sources = useMemo(
    () =>
      avatarSources({
        name: holder.name,
        bioguideId: holder.bioguide_id,
        photoUrl: holder.photo_url,
      }),
    [holder],
  );
  const [idx, setIdx] = useState(0);
  const src = sources[idx] || null;
  return (
    <span className={`ccd-avatar ccd-avatar--${holder.party || 'x'}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" onError={() => setIdx((i) => i + 1)} />
      ) : (
        <span>{String(holder.name || '?')[0]}</span>
      )}
    </span>
  );
}
