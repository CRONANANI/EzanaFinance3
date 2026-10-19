'use client';

/**
 * Card 5, Top Traders: the leaderboards as Polymarket and Kalshi publish them.
 * Rankings are shown, not endorsed; past performance does not predict future
 * results. Kalshi values carry no currency symbol: the unit of its
 * leaderboard is not documented.
 */
import { useState } from 'react';
import { efficiency, efficiencyBar, identicon } from '@/lib/prediction-markets/page-model';
import { Card, CardHead, Gate, Seg, SkelRows, StateBox, Tabs, cx } from './parts';
import { useJson } from './use-json';
import { pct, plain1, pctNumber, shortWallet, signedUsd, usd } from './format';

const PM_WINDOWS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All' },
];
const BY = [
  { value: 'pnl', label: 'Profit' },
  { value: 'vol', label: 'Volume' },
];
const LB_LABEL = {
  POLITICS: 'Politics',
  SPORTS: 'Sports',
  CRYPTO: 'Crypto',
  ECONOMICS: 'Economics',
  TECH: 'Tech',
  CULTURE: 'Culture',
};
const PAGE_TO_LB = {
  politics: 'POLITICS',
  elections: 'POLITICS',
  geopolitics: 'POLITICS',
  sports: 'SPORTS',
  crypto: 'CRYPTO',
  economy: 'ECONOMICS',
  tech: 'TECH',
  culture: 'CULTURE',
};

async function authHeaders() {
  try {
    const { supabase } = await import('@/lib/supabase-browser');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

function Identicon({ seed }) {
  const { cells, color } = identicon(seed);
  return (
    <span className={cx('pmk-avatar pmk-identicon', `is-${color}`)} aria-hidden="true">
      {cells.map((on, i) => (
        <span key={i} className={on ? 'on' : undefined} />
      ))}
    </span>
  );
}

function Avatar({ image, seed }) {
  const [broken, setBroken] = useState(false);
  if (image && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="pmk-avatar"
        src={image}
        alt=""
        width={32}
        height={32}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return <Identicon seed={seed} />;
}

function Medal({ rank }) {
  if (rank > 3) return <span className="pmk-medal pmk-num">{rank}</span>;
  return (
    <span className={cx('pmk-medal pmk-num', rank === 1 ? 'is-first' : 'is-ring')}>{rank}</span>
  );
}

function Positions({ wallet, signedIn, onLoad }) {
  const { data, error, loading, retry } = useJson(
    signedIn ? `/api/prediction-markets/positions?wallet=${wallet}` : null,
    { headers: authHeaders },
  );
  const list = data?.positions || [];
  return (
    <div className="pmk-expand pmk-expand--trader pmk-gate">
      <p className="pmk-eyebrow">Top 3 open positions by size</p>
      {!signedIn ? (
        <>
          <div className="pmk-pos-ghost" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="pmk-pos-ghost-row" />
            ))}
          </div>
          <Gate title="Sign up free to see open positions" />
        </>
      ) : loading && !data ? (
        <SkelRows n={3} height={28} gap={6} label="Loading positions" />
      ) : error ? (
        <StateBox kind="error" onRetry={retry} />
      ) : !list.length ? (
        <p className="pmk-state-msg">No open positions above one share.</p>
      ) : (
        <ul className="pmk-pos-list">
          {list.map((p, i) => (
            <li key={i} className="pmk-pos">
              {p.marketId ? (
                <button
                  type="button"
                  className="pmk-pos-q pmk-ellipsis"
                  onClick={() => onLoad(p.marketId)}
                >
                  {p.title}
                </button>
              ) : (
                <span className="pmk-pos-q pmk-ellipsis">{p.title}</span>
              )}
              <span className="pmk-side pmk-num">{String(p.side || '').toUpperCase()}</span>
              <span className="pmk-pos-size pmk-num">
                {p.size != null ? Math.round(p.size).toLocaleString('en-US') : 'n/a'}
              </span>
              <span className="pmk-pos-avg pmk-num">avg {pctNumber(p.avgPrice)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CopyWallet({ wallet, onCopied }) {
  return (
    <button
      type="button"
      className="pmk-copy"
      aria-label={`Copy wallet address ${wallet}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(wallet);
          onCopied();
        } catch {
          /* clipboard blocked: nothing to announce */
        }
      }}
    >
      <i className="bi bi-copy" aria-hidden="true" />
    </button>
  );
}

export function TopTradersCard({ className, category, signedIn, onLoad }) {
  const [venue, setVenue] = useState('polymarket');
  const [win, setWin] = useState('week');
  const [by, setBy] = useState('pnl');
  const [open, setOpen] = useState(null);
  const [announce, setAnnounce] = useState('');

  const lb = PAGE_TO_LB[category] || null;
  const url =
    venue === 'kalshi'
      ? `/api/prediction-markets/leaderboard?venue=kalshi&by=${by}`
      : `/api/prediction-markets/leaderboard?venue=polymarket&window=${win}&by=${by}${
          category && category !== 'all' ? `&category=${category}` : ''
        }`;
  const { data, error, loading, retry } = useJson(url);
  const rows = data?.rows || [];
  const winLabel = PM_WINDOWS.find((w) => w.value === win)?.label;

  return (
    <Card className={cx('pmk-card--traders', className)} label="Top traders">
      <CardHead title="Top traders" rule={false} />
      <Tabs
        label="Venue"
        idBase="pmk-traders"
        value={venue}
        onChange={(v) => {
          setVenue(v);
          setOpen(null);
        }}
        tabs={[
          { value: 'polymarket', label: 'Polymarket', dot: 'polymarket' },
          { value: 'kalshi', label: 'Kalshi', dot: 'kalshi' },
        ]}
      />
      <div className="pmk-trader-controls">
        {venue === 'polymarket' ? (
          <>
            <Seg label="Leaderboard window" value={win} options={PM_WINDOWS} onChange={setWin} />
            <Seg label="Rank by" value={by} options={BY} onChange={setBy} />
            {lb ? (
              <span className="pmk-chip is-on pmk-chip--static">
                {LB_LABEL[lb]} <span className="pmk-chip-note">from page filter</span>
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span
              className="pmk-chip pmk-chip--static is-disabled"
              title="Kalshi publishes a 30-day leaderboard"
            >
              <span className="pmk-num">30d</span>
              <span className="pmk-chip-note">Kalshi publishes a 30-day leaderboard</span>
            </span>
            <Seg label="Rank by" value={by} options={BY} onChange={setBy} />
          </>
        )}
      </div>

      <div id="pmk-traders-panel" role="tabpanel" className="pmk-card-body">
        {loading && !data ? (
          <SkelRows n={10} height={45} label="Loading the leaderboard" />
        ) : error ? (
          <StateBox kind="error" onRetry={retry} minHeight={530} />
        ) : !rows.length ? (
          <StateBox title="No ranked traders for this view" minHeight={530}>
            {venue === 'kalshi'
              ? 'Kalshi has not published a leaderboard for the last 30 days. Try again later.'
              : `Polymarket has not published a ${winLabel} leaderboard${lb ? ` for ${LB_LABEL[lb]}` : ''} yet. Switch to Week or All categories.`}
          </StateBox>
        ) : (
          <>
            <div
              className={cx('pmk-trader-head', venue === 'kalshi' && 'is-kalshi')}
              aria-hidden="true"
            >
              <span>#</span>
              <span className="pmk-th-trader">Trader</span>
              {venue === 'kalshi' ? (
                <span className="pmk-th-num">{by === 'vol' ? 'Volume' : 'Projected PnL'}</span>
              ) : (
                <>
                  <span className="pmk-th-num">PnL</span>
                  <span className="pmk-th-num pmk-hide-sm">Volume</span>
                  <span className="pmk-th-eff pmk-hide-sm">PnL / volume</span>
                  <span className="pmk-th-exp" />
                </>
              )}
            </div>
            <ol className="pmk-traders">
              {rows.map((r) => {
                const key = r.wallet || `${r.rank}-${r.name}`;
                const isOpen = open === key;
                const eff = efficiency(r.pnl, r.volume);
                return (
                  <li key={key} className="pmk-trader-item">
                    <div className="pmk-trader">
                      <Medal rank={r.rank} />
                      <Avatar image={r.image} seed={r.wallet || r.name || String(r.rank)} />
                      <span className="pmk-trader-who">
                        <span className="pmk-trader-name">
                          {r.name ? (
                            <span className="pmk-ellipsis">{r.name}</span>
                          ) : r.wallet ? (
                            <span className="pmk-num">{shortWallet(r.wallet)}</span>
                          ) : (
                            <span className="pmk-faint">Anonymous trader</span>
                          )}
                          {r.verified ? (
                            <i
                              className="bi bi-patch-check-fill pmk-verified"
                              aria-label="Verified"
                            />
                          ) : null}
                          {r.xHandle ? <span className="pmk-xchip">X @{r.xHandle}</span> : null}
                        </span>
                        {r.name && r.wallet ? (
                          <span className="pmk-trader-wallet pmk-num">
                            {shortWallet(r.wallet)}
                            <CopyWallet
                              wallet={r.wallet}
                              onCopied={() => setAnnounce('Address copied')}
                            />
                          </span>
                        ) : null}
                      </span>
                      {venue === 'kalshi' ? (
                        <span className="pmk-trader-num pmk-num pmk-strong">{plain1(r.value)}</span>
                      ) : (
                        <>
                          <span
                            className={cx(
                              'pmk-trader-num pmk-num',
                              r.pnl < 0 ? 'is-down' : 'is-up',
                            )}
                          >
                            {signedUsd(r.pnl)}
                          </span>
                          <span className="pmk-trader-num pmk-num pmk-mute pmk-hide-sm">
                            {usd(r.volume)}
                          </span>
                          <span
                            className="pmk-eff pmk-hide-sm"
                            role="img"
                            aria-label={
                              eff != null
                                ? `PnL is ${pct(eff)} of volume`
                                : 'PnL to volume not available'
                            }
                          >
                            <span className="pmk-eff-track">
                              <span style={{ width: `${efficiencyBar(eff) * 100}%` }} />
                            </span>
                            <span className="pmk-num">{eff != null ? pct(eff) : 'n/a'}</span>
                          </span>
                          <span className="pmk-th-exp">
                            {r.wallet ? (
                              <button
                                type="button"
                                className={cx('pmk-icon-btn pmk-expander', isOpen && 'is-open')}
                                aria-expanded={isOpen}
                                aria-label={`${isOpen ? 'Hide' : 'Show'} open positions for ${r.name || shortWallet(r.wallet)}`}
                                onClick={() => setOpen(isOpen ? null : key)}
                              >
                                <i className="bi bi-chevron-down" aria-hidden="true" />
                              </button>
                            ) : null}
                          </span>
                        </>
                      )}
                    </div>
                    {isOpen && venue === 'polymarket' ? (
                      <Positions wallet={r.wallet} signedIn={signedIn} onLoad={onLoad} />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
      <p className="pmk-sr" aria-live="polite">
        {announce}
      </p>
      <footer className="pmk-foot pmk-foot--stack">
        {venue === 'kalshi' ? (
          <p className="pmk-legal">
            Kalshi traders appear only if they opt in to the public leaderboard.
          </p>
        ) : null}
        <p className="pmk-legal">
          Rankings as published by each venue. Past performance does not predict future results.
          Source: {venue === 'kalshi' ? 'Kalshi' : 'Polymarket'}.
        </p>
      </footer>
    </Card>
  );
}
