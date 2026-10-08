'use client';

/**
 * Top signals: one event at a time, full width. Arrows, the counter, the
 * preview strip, Left and Right keys and a swipe all move the same carousel;
 * it wraps at the ends and never advances on its own. Filters by kind, and
 * My signals shows the events the reader's saved rules match. ?signal= opens
 * on an event and follows the reader as they flip.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RowActions } from '@/components/datasets/hub/HubClient';
import { EVENT_KINDS, rankHighSignalEvents } from '@/lib/datasets/capitol-hub/signals';
import { LinkedChips, Strength } from './bits';
import { useCwh, setParam, PREVIEW_ID } from './CwhProvider';
import EventChart from './EventChart';
import { DASH, factValue, isMonoFact, monthDay, range } from './cwh-format';

const KIND_ICON = {
  trade_before_award: 'bi-lightning-charge-fill',
  committee_overlap: 'bi-diagram-3',
  lobbied_then_won: 'bi-megaphone',
  insider_same_month: 'bi-people',
  late_filing: 'bi-clock-history',
  user_rule: 'bi-bookmark-star',
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'trade_before_award', label: EVENT_KINDS.trade_before_award },
  { id: 'committee_overlap', label: EVENT_KINDS.committee_overlap },
  { id: 'lobbied_then_won', label: EVENT_KINDS.lobbied_then_won },
  { id: 'insider_same_month', label: EVENT_KINDS.insider_same_month },
  { id: 'late_filing', label: EVENT_KINDS.late_filing },
];

const MEASURED = {
  trade_date: 'Return from the first close after the trade to the close 30 days later.',
  filing_date:
    'Institutions and whales are measured from the filing date, since 13F and 13D/G filings carry no trade date.',
};

function Spark({ prices, up }) {
  const pts = (prices || []).filter((p) => Number.isFinite(p.close));
  if (pts.length < 2) return <span className="cwh-spark-empty" aria-hidden="true" />;
  const lo = Math.min(...pts.map((p) => p.close));
  const hi = Math.max(...pts.map((p) => p.close));
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * 100;
      const y = 20 - ((p.close - lo) / (hi - lo || 1)) * 18;
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join('');
  return (
    <svg
      className={`cwh-spark ${up ? 'is-up' : 'is-down'}`}
      viewBox="0 0 100 22"
      aria-hidden="true"
    >
      <path d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function EventCard({ e, index, total }) {
  const { openMember } = useCwh();
  const member = e.member;
  return (
    <article
      className="cwh-card cwh-event"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${total}`}
    >
      <div className="cwh-event-text">
        <p className="cwh-event-mark">
          <span className="cwh-event-ic" aria-hidden="true">
            <i className={`bi ${KIND_ICON[e.kind] || 'bi-lightning-charge-fill'}`} />
          </span>
          <span className="cwh-event-kind">{(EVENT_KINDS[e.kind] || e.kind).toUpperCase()}</span>
          <span className="cwh-event-flag">
            · FLAGGED {e.flaggedAt ? monthDay(e.flaggedAt) : DASH}
          </span>
        </p>
        <h3 className="cwh-event-h">{e.headline}</h3>
        <div className="cwh-event-why">
          <p className="cwh-label">Why it is flagged</p>
          <ul className="cwh-reasons">
            {e.reasons.map((r, i) => (
              <li key={`${r.dataset}-${i}`} className="cwh-reason">
                <span className="cwh-reason-ic" aria-hidden="true">
                  <i className="bi bi-check2" />
                </span>
                <span>
                  <span className="cwh-reason-fact">{r.fact}</span>
                  {r.date ? <span className="cwh-reason-date"> {monthDay(r.date)}</span> : null}
                  {r.range && (r.range[0] != null || r.range[1] != null) ? (
                    <span className="cwh-reason-detail"> {range(r.range[0], r.range[1])}</span>
                  ) : null}
                  {r.detail ? <span className="cwh-reason-detail"> {r.detail}</span> : null}
                  <span className="cwh-reason-ds">{r.dataset.toUpperCase()}</span>
                </span>
              </li>
            ))}
          </ul>
          <LinkedChips datasets={e.linkedDatasets} />
        </div>
        <div className="cwh-event-foot">
          <Strength datasets={e.linkedDatasets} />
          {member?.bioguideId ? (
            <button
              type="button"
              className="cwh-link-btn"
              onClick={() => openMember(member.bioguideId)}
            >
              {member.name} <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          ) : null}
          <RowActions
            ticker={e.ticker || null}
            query={e.query || null}
            label={e.headline}
            dimension="capitol"
            shareUrl={`/datasets/capitol-watch?signal=${encodeURIComponent(e.id)}`}
          />
        </div>
      </div>
      <div className="cwh-event-chart">
        <div className="cwh-event-chart-head">
          <span className="cwh-event-tk">{e.ticker}</span>
          {e.company ? <span className="cwh-event-co">{e.company}</span> : null}
          <span className="cwh-label cwh-push">Daily close, 60 days</span>
        </div>
        <EventChart
          ticker={e.ticker}
          points={e.prices}
          tradeDate={e.tradeDate}
          awardDate={e.awardDate}
          retPct={e.return30d}
        />
        <dl className="cwh-facts">
          {e.facts.map((f) => (
            <div key={f.label} className="cwh-fact">
              <dt className="cwh-label">{f.label}</dt>
              <dd
                className={`${isMonoFact(f) ? 'cwh-mono' : 'cwh-fact-text'}${
                  f.sign === 'pos' ? ' is-pos' : f.sign === 'neg' ? ' is-neg' : ''
                }`}
              >
                {factValue(f)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="cwh-legend" aria-hidden="true">
          {e.awardDate ? (
            <span>
              <i className="cwh-key is-award" /> AWARD DATE
            </span>
          ) : null}
          {e.tradeDate ? (
            <span>
              <i className="cwh-key is-trade" /> TRADE
            </span>
          ) : null}
          {e.tradeDate ? (
            <span>
              <i className="cwh-key is-hold" /> 30 DAYS AFTER THE TRADE
            </span>
          ) : null}
        </p>
        <p className="cwh-note">
          {MEASURED[e.measuredFrom] || MEASURED.trade_date} Amounts are disclosed ranges. Sources:{' '}
          {e.sources.join(', ')}.
        </p>
      </div>
    </article>
  );
}

export default function SignalCarousel({ events = [], days = 7, error = false }) {
  const { rules, ruleEvents } = useCwh();
  const [filter, setFilter] = useState('all');
  const [ruleId, setRuleId] = useState(null);
  const [index, setIndex] = useState(0);
  const touch = useRef(null);
  const region = useRef(null);
  const ready = useRef(false);

  const mine = useMemo(() => {
    const list = ruleId
      ? ruleEvents[ruleId] || []
      : Object.entries(ruleEvents)
          .filter(([k]) => k !== PREVIEW_ID)
          .flatMap(([, v]) => v);
    return rankHighSignalEvents(list);
  }, [ruleEvents, ruleId]);

  const list = useMemo(() => {
    if (filter === 'mine') return mine;
    if (filter === 'all') return events;
    return events.filter((e) => e.kind === filter);
  }, [filter, events, mine]);

  const total = list.length;
  const at = total ? ((index % total) + total) % total : 0;
  const current = list[at] || null;

  /* ?signal= on first paint. */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('signal');
    if (id) {
      const i = events.findIndex((e) => e.id === id);
      if (i >= 0) setIndex(i);
    }
    ready.current = true;
  }, [events]);

  useEffect(() => {
    if (!ready.current || !current) return;
    setParam('signal', at === 0 && filter === 'all' ? null : current.id);
  }, [current, at, filter]);

  /* The parent's "+N more" opens My signals on a rule. */
  useEffect(() => {
    const onOpen = (ev) => {
      setFilter('mine');
      setRuleId(ev.detail?.ruleId || null);
      setIndex(0);
      region.current?.scrollIntoView({ block: 'start' });
    };
    window.addEventListener('cwh:open-rule', onOpen);
    return () => window.removeEventListener('cwh:open-rule', onOpen);
  }, []);

  const go = useCallback((d) => setIndex((i) => i + d), []);
  const pick = (f, rid = null) => {
    setFilter(f);
    setRuleId(rid);
    setIndex(0);
  };

  const onKey = (e) => {
    if (e.target.closest('input, textarea, svg, [role="menu"]')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  };

  const preview = total
    ? Array.from({ length: Math.min(5, total) }, (_, k) => {
        const start = Math.floor(at / 5) * 5;
        const i = (start + k) % total;
        return { e: list[i], i };
      }).filter((p, k, arr) => arr.findIndex((x) => x.i === p.i) === k)
    : [];

  const heading = days === 30 ? 'Top signals this month' : 'Top signals this week';
  const myCount = Object.entries(ruleEvents)
    .filter(([k]) => k !== PREVIEW_ID)
    .reduce((s, [, l]) => s + l.length, 0);
  const ruleName = (id) =>
    id === PREVIEW_ID
      ? 'the matches of the rule you are building'
      : rules?.find((r) => r.id === id)?.name;

  return (
    <section className="cwh-section cwh-top" aria-labelledby="cwh-top-h" ref={region}>
      <div className="cwh-top-head">
        <h2 className="cwh-h2" id="cwh-top-h">
          {heading}
        </h2>
        <div className="cwh-pills" role="group" aria-label="Filter signals">
          {FILTERS.filter((f) => f.id === 'all' || events.some((e) => e.kind === f.id)).map((f) => (
            <button
              key={f.id}
              type="button"
              className={`cwh-pill${filter === f.id ? ' is-active' : ''}`}
              aria-pressed={filter === f.id}
              onClick={() => pick(f.id)}
            >
              {f.label}
            </button>
          ))}
          {rules ? (
            <button
              type="button"
              className={`cwh-pill${filter === 'mine' ? ' is-active' : ''}`}
              aria-pressed={filter === 'mine'}
              onClick={() => pick('mine')}
            >
              My signals{rules.length ? ` · ${rules.length}` : ''}
            </button>
          ) : null}
        </div>
        <span className="cwh-push" />
        {total ? (
          <span className="cwh-counter" aria-hidden="true">
            <b>{at + 1}</b> OF {total}
          </span>
        ) : null}
        <button
          type="button"
          className="cwh-round"
          onClick={() => go(-1)}
          disabled={total < 2}
          aria-label="Previous signal"
        >
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="cwh-round"
          onClick={() => go(1)}
          disabled={total < 2}
          aria-label="Next signal"
        >
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>

      {filter === 'mine' && (rules?.length || ruleId) ? (
        <p className="cwh-sub">
          {ruleId
            ? `Showing ${ruleName(ruleId) || 'one signal'}.`
            : `Events your ${rules.length} saved signal${rules.length === 1 ? '' : 's'} match (${myCount}).`}{' '}
          {ruleId && rules?.length ? (
            <button type="button" className="cwh-link-btn" onClick={() => pick('mine')}>
              Show all my signals
            </button>
          ) : null}
        </p>
      ) : null}

      <div
        className="cwh-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label={heading}
        tabIndex={0}
        onKeyDown={onKey}
        onTouchStart={(e) => {
          touch.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        }}
      >
        {error ? (
          <div className="cwh-card cwh-event-empty">
            <p className="cwh-empty">
              This signal could not be loaded just now. It refreshes on its own; reload in a minute.
            </p>
          </div>
        ) : !current ? (
          <div className="cwh-card cwh-event-empty">
            <p className="cwh-empty">
              {filter === 'mine'
                ? rules?.length
                  ? 'None of your signals match an event in their window yet. New disclosures arrive daily.'
                  : 'Save a rule below and the events it matches appear here.'
                : 'No event links two Capitol datasets in the last 30 days yet. Signals appear as new disclosures, awards and filings arrive.'}
            </p>
          </div>
        ) : (
          <EventCard key={current.id} e={current} index={at} total={total} />
        )}
        <p className="cwh-sr" aria-live="polite">
          {current ? `Signal ${at + 1} of ${total}: ${current.headline}` : ''}
        </p>
      </div>

      {preview.length > 1 ? (
        <div className="cwh-strip" role="group" aria-label="Signals in view">
          {preview.map(({ e, i }) => {
            const p = e.prices || [];
            const up = p.length > 1 ? p[p.length - 1].close >= p[0].close : true;
            return (
              <button
                key={e.id}
                type="button"
                className={`cwh-strip-card${i === at ? ' is-active' : ''}`}
                aria-current={i === at ? 'true' : undefined}
                onClick={() => setIndex(i)}
              >
                <span className="cwh-strip-top">
                  <i
                    className={`bi ${KIND_ICON[e.kind] || 'bi-lightning-charge'}`}
                    aria-hidden="true"
                  />
                  <span className="cwh-strip-kind">
                    {(EVENT_KINDS[e.kind] || '').toUpperCase()}
                  </span>
                  <span className="cwh-strip-n">{i + 1}</span>
                </span>
                <span className="cwh-strip-h">{e.headline}</span>
                <Spark prices={p} up={up} />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
