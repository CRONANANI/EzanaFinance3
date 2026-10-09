'use client';

/**
 * Arrivals: the newest real records from the four live feeds. Each arrival is
 * a ping on the sonar; a source with nothing new stays silent. The same items
 * are published to the layout's ticker slot (DatasetChrome draws the strip),
 * so the page draws no ticker of its own.
 *
 * ODDS items, in the ticker and here, open the odds popup. Everything else
 * links to the dataset it came from.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import { loadArrivals } from './feeds';
import { relativeAge } from './derive';
import { emit } from './SonarSelection';
import OddsPopup from './OddsPopup';

const MAX_ROWS = 8;

function fmtResolve(d) {
  const t = Date.parse(d || '');
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function Arrivals() {
  const router = useRouter();
  const [state, setState] = useState({ status: 'loading', items: [] });
  const [odds, setOdds] = useState(null);

  useEffect(() => {
    let alive = true;
    loadArrivals().then(({ items, omitted, failed }) => {
      if (!alive) return;
      setState({ status: failed ? 'error' : items.length ? 'ready' : 'empty', items });
      /* Honest rule: report, never fake, any source without a live feed. */
      // eslint-disable-next-line no-console
      console.info(
        `[datasets arrivals] ${items.length} live items` +
          (omitted.length ? `; omitted (no live feed): ${omitted.join(', ')}` : ''),
      );
    });
    return () => {
      alive = false;
    };
  }, []);

  const closeOdds = useCallback(() => setOdds(null), []);
  const openOdds = useCallback((o, from) => {
    emit('dsx_odds_open', { from });
    setOdds(o);
  }, []);

  /* Ticker slot: stable references, or the chrome republishes forever. */
  const tickerItems = useMemo(
    () =>
      state.items.map((it) => ({
        id: it.id,
        lead: it.ticker.lead,
        main: it.ticker.main,
        value: it.ticker.value ?? null,
        odds: it.odds || null,
        href: it.href || null,
      })),
    [state.items],
  );
  const onTickerSelect = useCallback(
    (it) => {
      if (it.odds) openOdds(it.odds, 'ticker');
      else if (it.href) router.push(it.href);
    },
    [openOdds, router],
  );
  usePublishTicker({
    items: tickerItems,
    onSelect: onTickerSelect,
    ariaLabel: 'Latest records across datasets',
  });

  const rows = state.items.slice(0, MAX_ROWS);
  const topOdds = state.items.find((it) => it.odds)?.odds || null;

  return (
    <aside className="dso-arrivals" aria-labelledby="dso-arrivals-h">
      <div className="dso-arrivals-head">
        <h2 className="dso-arrivals-title" id="dso-arrivals-h">
          Arrivals
        </h2>
        <span className="dso-live dso-mono">
          <span className="dso-live-dot" aria-hidden="true" />
          LIVE
        </span>
        <span className="dso-arrivals-never dso-mono">NEVER FAKED</span>
      </div>
      <p className="dso-arrivals-sub">
        Each arrival is a ping on the sonar. Sources with nothing new stay silent.
      </p>

      {state.status === 'loading' ? (
        <ul className="dso-arr-list" aria-busy="true" aria-label="Loading arrivals">
          {[0, 1, 2, 3].map((i) => (
            <li className="dso-arr" key={i}>
              <span className="dso-skel dso-skel--tag" />
              <span>
                <span className="dso-skel" />
                <span className="dso-skel dso-skel--short" />
              </span>
              <span />
            </li>
          ))}
        </ul>
      ) : null}
      {state.status === 'error' ? (
        <p className="dso-arr-state">Arrivals could not load just now.</p>
      ) : null}
      {state.status === 'empty' ? (
        <p className="dso-arr-state">Nothing new in the last day.</p>
      ) : null}

      {state.status === 'ready' ? (
        <ul className="dso-arr-list">
          {rows.map((it) => {
            const age = relativeAge(it.at);
            const body = (
              <>
                <span className={`dso-arr-kind dso-mono dso-kind--${it.kind.toLowerCase()}`}>
                  {it.kind}
                </span>
                <span className="dso-arr-body">
                  <span className="dso-arr-head">{it.headline}</span>
                  <span className="dso-arr-src">{it.sourceLine}</span>
                </span>
                <span className="dso-arr-age dso-mono">{age || ''}</span>
              </>
            );
            return (
              <li key={it.id}>
                {it.odds ? (
                  <button
                    type="button"
                    className="dso-arr"
                    onClick={() => openOdds(it.odds, 'arrivals')}
                  >
                    {body}
                  </button>
                ) : (
                  <Link
                    className="dso-arr"
                    href={it.href}
                    onClick={() => emit('dsx_arrival_open', { kind: it.kind })}
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {topOdds ? (
        <button
          type="button"
          className="dso-oddscard"
          onClick={() => openOdds(topOdds, 'arrivals')}
          aria-label={`${topOdds.question}: ${topOdds.outcome} ${Math.round(topOdds.prob * 100)} cents. Open the odds card.`}
        >
          <span className="dso-oddscard-q">
            <i className="bi bi-broadcast" aria-hidden="true" /> {topOdds.question}
          </span>
          <span className="dso-oddscard-row">
            <span className="dso-oddscard-out">{topOdds.outcome}</span>
            <span className="dso-bar dso-bar--odds" aria-hidden="true">
              <i style={{ width: `${Math.round(topOdds.prob * 100)}%` }} />
            </span>
            <span className="dso-mono dso-oddscard-px">{Math.round(topOdds.prob * 100)}¢</span>
          </span>
          <span className="dso-oddscard-note">
            Polymarket
            {fmtResolve(topOdds.endDate) ? ` · resolves ${fmtResolve(topOdds.endDate)}` : ''} ·
            information only, not advice
          </span>
        </button>
      ) : null}

      {odds ? <OddsPopup slug={odds.slug} question={odds.question} onClose={closeOdds} /> : null}
    </aside>
  );
}
