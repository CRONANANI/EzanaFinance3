'use client';

/**
 * Event Horizon (replaces the Edge Board, Oct 20). One timeline, 3, 6 or 12
 * months ahead: every open market that resolves in the window is a dot at its
 * close date, its height today's probability and its size its volume. Under
 * it run three lanes of scheduled events from the rest of Ezana: US macro
 * releases, the largest earnings reports and congressional committee
 * meetings. Selecting a dot opens a modal that explains the market and lists
 * the scheduled events dated before it resolves.
 *
 * Every mark is a real row: markets from the page's universe, events from
 * /api/prediction-markets/horizon-events. Links between a market and an event
 * come from its category and shared words, and the modal says which.
 */
import { useCallback, useMemo, useState } from 'react';
import { Modal } from '@/components/ds';
import { CATEGORY_LABEL, convictionGroup } from '@/lib/prediction-markets/page-model';
import {
  EVENT_KINDS,
  HORIZONS,
  daysUntil,
  horizonEnd,
  horizonEvents,
  horizonMarkets,
  monthTicks,
  relatedEvents,
  relatedMarkets,
} from '@/lib/prediction-markets/horizon-model';
import {
  Card,
  CardHead,
  ChangePill,
  EDU_LINE,
  Seg,
  Skeleton,
  StateBox,
  VenueChip,
  VenueDot,
  cx,
} from './parts';
import { useJson } from './use-json';
import { useSize } from './use-size';
import { VENUE_LABEL, date, int, monthDay, pct, usd, venueVolume } from './format';

const LANE_KINDS = ['macro', 'earnings', 'congress'];
const LEFT = 76;
const RIGHT = 18;
const TOP = 18;
const PLOT_H = 240;
const LANE_H = 30;
const AXIS_H = 26;
const HEIGHT = TOP + PLOT_H + 12 + LANE_KINDS.length * LANE_H + AXIS_H;
const R_MIN = 4;
const R_MAX = 11;
const F_MON = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

function laneY(i) {
  return TOP + PLOT_H + 12 + i * LANE_H + LANE_H / 2;
}

function EventMark({ kind, x, y }) {
  if (kind === 'macro') {
    return <rect x={x - 4} y={y - 4} width={8} height={8} transform={`rotate(45 ${x} ${y})`} />;
  }
  if (kind === 'earnings') return <rect x={x - 3.5} y={y - 3.5} width={7} height={7} rx={1} />;
  return <circle cx={x} cy={y} r={4} />;
}

function cents(p) {
  return `${Math.round(p * 100)}¢`;
}

function MarketModal({ market, markets, events, now, onClose, onPick, onLoad }) {
  const related = useMemo(() => relatedEvents(market, events, now), [market, events, now]);
  const others = useMemo(() => relatedMarkets(market, markets), [market, markets]);
  if (!market) return null;
  const days = daysUntil(market.closes, now);
  const change = Number.isFinite(market.change7d) ? market.change7d : market.change24h;
  return (
    <Modal
      open
      onClose={onClose}
      title="Market explainer"
      size="640px"
      className="pmk-hz-modal"
      footer={
        <div className="pmk-page pmk-hz-scope pmk-hz-actions">
          <button
            type="button"
            className="pmk-btn"
            onClick={() => {
              onLoad(market.id);
              onClose();
            }}
          >
            <i className="bi bi-graph-up" aria-hidden="true" />
            Load in the price chart
          </button>
          {market.url ? (
            <a className="pmk-link" href={market.url} target="_blank" rel="noopener noreferrer">
              Open on {VENUE_LABEL[market.venue]}
              <span className="pmk-sr"> (opens in a new tab)</span>
              <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      }
    >
      <div className="pmk-page pmk-hz-scope">
        <p className="pmk-hz-meta">
          <VenueChip venue={market.venue} small />
          {market.category ? (
            <span className="pmk-hz-tag">{CATEGORY_LABEL[market.category] || market.category}</span>
          ) : null}
          <span className="pmk-num pmk-mute">
            Closes {date(market.closes)}
            {days != null ? ` · in ${int(days)} ${days === 1 ? 'day' : 'days'}` : ''}
          </span>
        </p>
        <h3 className="pmk-hz-q">{market.question}</h3>

        <div className="pmk-hz-stats">
          <div>
            <p className="pmk-eyebrow">Probability</p>
            <p className="pmk-hz-big pmk-num">{pct(market.p)}</p>
            {Number.isFinite(change) ? <ChangePill change={change} size="sm" /> : null}
          </div>
          <div>
            <p className="pmk-eyebrow">Volume</p>
            <p className="pmk-hz-val pmk-num">{venueVolume(market.vol, market.venue)}</p>
            <p className="pmk-legal pmk-num">24h {venueVolume(market.vol24h, market.venue)}</p>
          </div>
          {Number.isFinite(market.liq) && market.liq > 0 ? (
            <div>
              <p className="pmk-eyebrow">Liquidity</p>
              <p className="pmk-hz-val pmk-num">{usd(market.liq)}</p>
            </div>
          ) : null}
        </div>

        <p className="pmk-hz-explain">
          A Yes contract here trades at <span className="pmk-num">{cents(market.p)}</span> and pays
          $1 if the question resolves Yes by <span className="pmk-num">{date(market.closes)}</span>.
          That price is the crowd&apos;s probability: traders on {VENUE_LABEL[market.venue]} put the
          chance at <span className="pmk-num">{pct(market.p)}</span>.
        </p>

        <section className="pmk-hz-section" aria-label="Scheduled events before it resolves">
          <p className="pmk-eyebrow">On the calendar before it resolves</p>
          {related.length ? (
            <ul className="pmk-hz-events">
              {related.map((e) => (
                <li key={e.id} className={cx('pmk-hz-event', `is-${e.kind}`)}>
                  <span className="pmk-hz-kind">{EVENT_KINDS[e.kind]?.label || e.kind}</span>
                  <span className="pmk-num pmk-hz-date">{monthDay(e.date)}</span>
                  <span className="pmk-hz-title">{e.title}</span>
                  {e.detail ? <span className="pmk-legal pmk-num">{e.detail}</span> : null}
                  <span className="pmk-legal pmk-hz-why">
                    {e.why} ·{' '}
                    {e.gapDays <= 0
                      ? 'around the close'
                      : `${int(e.gapDays)} days before the close`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pmk-hz-empty">
              Nothing on the macro, earnings or congressional calendars bears on this market before
              it closes.
            </p>
          )}
        </section>

        {others.length ? (
          <section className="pmk-hz-section" aria-label="Related markets">
            <p className="pmk-eyebrow">Same theme, closing nearby</p>
            <div className="pmk-hz-others">
              {others.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="pmk-hz-other"
                  onClick={() => onPick(m.id)}
                >
                  <VenueDot venue={m.venue} />
                  <span className="pmk-ellipsis">{m.question}</span>
                  <span className="pmk-num pmk-strong">{pct(m.p)}</span>
                  <span className="pmk-num pmk-faint">{monthDay(m.closes)}</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <p className="pmk-legal pmk-hz-note">
          Events are matched to the market by its category and by words its question shares with the
          event. They are scheduled dates, not forecasts. {EDU_LINE}
        </p>
      </div>
    </Modal>
  );
}

export function HorizonCard({ className, state, rows, filters, onLoad, onRetry }) {
  const [range, setRange] = useState('6m');
  const [hover, setHover] = useState(null);
  const [openId, setOpenId] = useState(null);
  const events = useJson('/api/prediction-markets/horizon-events');
  const [boxRef, box] = useSize();
  const now = useMemo(() => new Date(), []);

  const t0 = now.getTime();
  const t1 = useMemo(() => horizonEnd(now, range), [now, range]);
  const markets = useMemo(() => horizonMarkets(rows, now, range), [rows, now, range]);
  const evs = useMemo(
    () => horizonEvents(events.data?.events, now, range),
    [events.data, now, range],
  );
  const allEvents = events.data?.events || [];
  const sources = events.data?.sources || {};
  const months = useMemo(() => monthTicks(t0, t1), [t0, t1]);
  const maxVol = Math.max(1, ...markets.map((m) => m.vol || 0));

  const W = box.w;
  const innerW = Math.max(1, W - LEFT - RIGHT);
  const x = useCallback((t) => LEFT + ((t - t0) / Math.max(1, t1 - t0)) * innerW, [t0, t1, innerW]);
  const y = (p) => TOP + (1 - p) * PLOT_H;
  const r = (v) => R_MIN + Math.sqrt((v || 0) / maxVol) * (R_MAX - R_MIN);

  const open = openId
    ? markets.find((m) => m.id === openId) || rows.find((m) => m.id === openId)
    : null;
  const hovered =
    hover?.type === 'market'
      ? markets.find((m) => m.id === hover.id)
      : hover?.type === 'event'
        ? evs.find((e) => e.id === hover.id)
        : null;
  const hoverT = hovered ? new Date(hovered.closes || hovered.date).getTime() : null;
  const hoverX = hoverT != null ? x(hoverT) : null;
  const hoverY = hovered
    ? hover.type === 'market'
      ? y(hovered.p)
      : laneY(LANE_KINDS.indexOf(hovered.kind))
    : null;

  const unavailable = LANE_KINDS.filter((k) => sources[k] === 'unavailable');
  const where =
    filters?.category && filters.category !== 'all' ? CATEGORY_LABEL[filters.category] : null;
  const h = HORIZONS.find((o) => o.value === range);

  let body;
  if (state === 'loading') {
    body = (
      <div aria-busy="true">
        <span className="pmk-sr">Loading the event horizon</span>
        <Skeleton height={HEIGHT} radius={8} />
      </div>
    );
  } else if (state === 'error') {
    body = <StateBox kind="error" onRetry={onRetry} minHeight={HEIGHT} />;
  } else if (!markets.length && !evs.length) {
    body = (
      <StateBox title="Nothing on the horizon" minHeight={HEIGHT}>
        {`No ${where ? `${where} ` : ''}market resolves and no scheduled event falls in the next ${h.months} months. Try a longer horizon.`}
      </StateBox>
    );
  } else {
    body = (
      <div className="pmk-hz-plot" ref={boxRef} style={{ height: HEIGHT }}>
        {W > 0 ? (
          <svg
            className="pmk-hz-svg"
            width={W}
            height={HEIGHT}
            role="group"
            aria-label={`${markets.length} markets resolving and ${evs.length} scheduled events in the next ${h.months} months. Select a market to open its explainer.`}
          >
            {/* probability grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <g key={p} aria-hidden="true">
                <line className="pmk-hz-grid" x1={LEFT} x2={W - RIGHT} y1={y(p)} y2={y(p)} />
                <text className="pmk-hz-tick" x={LEFT - 8} y={y(p) + 4} textAnchor="end">
                  {Math.round(p * 100)}%
                </text>
              </g>
            ))}
            {/* month grid and axis */}
            {months.map((t) => (
              <g key={t} aria-hidden="true">
                <line
                  className="pmk-hz-grid pmk-hz-grid--v"
                  x1={x(t)}
                  x2={x(t)}
                  y1={TOP}
                  y2={HEIGHT - AXIS_H}
                />
                <text className="pmk-hz-tick" x={x(t)} y={HEIGHT - 8} textAnchor="middle">
                  {F_MON.format(new Date(t))}
                </text>
              </g>
            ))}
            {/* today */}
            <g aria-hidden="true">
              <line className="pmk-hz-today" x1={LEFT} x2={LEFT} y1={TOP} y2={HEIGHT - AXIS_H} />
              <text className="pmk-hz-today-label" x={LEFT + 6} y={TOP - 6}>
                Today
              </text>
            </g>
            {/* lanes */}
            {LANE_KINDS.map((k, i) => (
              <g key={k}>
                <line
                  className="pmk-hz-lane"
                  x1={LEFT}
                  x2={W - RIGHT}
                  y1={laneY(i)}
                  y2={laneY(i)}
                  aria-hidden="true"
                />
                <text
                  className="pmk-hz-lane-label"
                  x={LEFT - 8}
                  y={laneY(i) + 4}
                  textAnchor="end"
                  aria-hidden="true"
                >
                  {EVENT_KINDS[k].lane}
                </text>
                {evs
                  .filter((e) => e.kind === k)
                  .map((e) => (
                    <g
                      key={e.id}
                      className={cx('pmk-hz-ev', `is-${k}`, hover?.id === e.id && 'is-on')}
                      tabIndex={0}
                      role="img"
                      aria-label={`${EVENT_KINDS[k].label}: ${e.title}, ${date(e.date)}`}
                      onMouseEnter={() => setHover({ type: 'event', id: e.id })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ type: 'event', id: e.id })}
                      onBlur={() => setHover(null)}
                    >
                      <EventMark kind={k} x={x(new Date(e.date).getTime())} y={laneY(i)} />
                    </g>
                  ))}
              </g>
            ))}
            {/* guide from the hovered mark */}
            {hoverX != null ? (
              <line
                className="pmk-hz-guide"
                x1={hoverX}
                x2={hoverX}
                y1={TOP}
                y2={HEIGHT - AXIS_H}
                aria-hidden="true"
              />
            ) : null}
            {/* markets */}
            {markets.map((m) => {
              const cx0 = x(new Date(m.closes).getTime());
              const cy0 = y(m.p);
              return (
                <g
                  key={m.id}
                  className={cx('pmk-hz-mkt', hover?.id === m.id && 'is-on')}
                  role="button"
                  tabIndex={0}
                  aria-label={`${m.question}, ${pct(m.p)}, closes ${date(m.closes)}. Open the explainer.`}
                  onClick={() => setOpenId(m.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpenId(m.id);
                    }
                  }}
                  onMouseEnter={() => setHover({ type: 'market', id: m.id })}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover({ type: 'market', id: m.id })}
                  onBlur={() => setHover(null)}
                >
                  <circle className="pmk-hz-hit" cx={cx0} cy={cy0} r={Math.max(12, r(m.vol))} />
                  <circle
                    className={cx('pmk-cdot', `is-${convictionGroup(m)}`)}
                    cx={cx0}
                    cy={cy0}
                    r={r(m.vol)}
                  />
                </g>
              );
            })}
          </svg>
        ) : null}

        {hovered && hoverX != null ? (
          <div
            className="pmk-tooltip pmk-hz-tip"
            style={{
              left: Math.min(Math.max(hoverX + 12, LEFT), Math.max(LEFT, W - 250)),
              top: Math.max(4, hoverY - 64),
            }}
          >
            {hover.type === 'market' ? (
              <>
                <p className="pmk-tooltip-q">{hovered.question}</p>
                <p className="pmk-tooltip-cols pmk-num">
                  <span>{pct(hovered.p)}</span>
                  <span className="pmk-faint">Closes {monthDay(hovered.closes)}</span>
                  <span className="pmk-faint">{venueVolume(hovered.vol, hovered.venue)}</span>
                </p>
              </>
            ) : (
              <>
                <p className="pmk-tooltip-time pmk-num">
                  {EVENT_KINDS[hovered.kind]?.label} · {date(hovered.date)}
                </p>
                <p className="pmk-tooltip-q">{hovered.title}</p>
                {hovered.detail ? (
                  <p className="pmk-tooltip-faint pmk-num">{hovered.detail}</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Card className={cx('pmk-card--horizon', className)} label="Event horizon">
      <CardHead
        title="Event horizon"
        sub={
          <>
            Next {h.months} months · <span className="pmk-num">{int(markets.length)}</span> markets
            · <span className="pmk-num">{int(evs.length)}</span> scheduled events
          </>
        }
        right={<Seg label="Horizon" value={range} options={HORIZONS} onChange={setRange} mono />}
      >
        <p className="pmk-explainer">
          Where the crowd&apos;s open questions resolve, against the releases, reports and hearings
          that land before them. Select a market for its explainer.
        </p>
      </CardHead>
      <div className="pmk-card-body">{body}</div>
      <footer className="pmk-foot">
        <span className="pmk-conv-legend pmk-legal">
          {[
            ['politics', 'Politics and elections'],
            ['sports', 'Sports'],
            ['crypto', 'Crypto'],
            ['other', 'Other'],
          ].map(([k, label]) => (
            <span key={k}>
              <span className={cx('pmk-cdot-key', `is-${k}`)} aria-hidden="true" />
              {label}
            </span>
          ))}
          <span>Height: probability · Size: volume</span>
        </span>
        <span className="pmk-legal">
          {events.loading && !events.data
            ? 'Loading the event calendars'
            : unavailable.length
              ? `${unavailable.map((k) => EVENT_KINDS[k].lane).join(' and ')} calendar unavailable right now`
              : 'US release calendar · company earnings calendar · Congress.gov committee schedule'}
        </span>
      </footer>
      {open ? (
        <MarketModal
          market={open}
          markets={markets}
          events={allEvents}
          now={now}
          onClose={() => setOpenId(null)}
          onPick={setOpenId}
          onLoad={onLoad}
        />
      ) : null}
    </Card>
  );
}
