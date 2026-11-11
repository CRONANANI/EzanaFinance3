'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useElo } from '@/hooks/useElo';

/* ELO season card for /home (Nov 2026). Sits in the hero's right column.

   Three questions, top to bottom: where am I (rating, tier, rank), how is
   this season going (season change, 7 day change, distance to the next
   tier), and what is the quickest thing I can do about it (today's quest
   tasks, with their real ELO rewards).

   A season is the calendar month, the same cycle the monthly ELO scoring
   run uses. Every number comes from the user's own ELO ledger or today's
   quest; nothing here is estimated. Styles: `bs-season-*` in
   src/app/(dashboard)/home/broadsheet.css. */

/* Tier floors. Mirrors ELO_TIERS in src/lib/elo.js, the server-only module
   that writes user_elo.tier, so the bar agrees with the tier shown. */
const TIER_ORDER = ['novice', 'apprentice', 'strategist', 'tactician', 'master', 'grandmaster'];
const TIER_FLOOR = {
  novice: 0,
  apprentice: 1000,
  strategist: 2500,
  tactician: 5000,
  master: 7000,
  grandmaster: 8500,
};
const TIER_NAME = {
  novice: 'Novice',
  apprentice: 'Apprentice',
  strategist: 'Strategist',
  tactician: 'Tactician',
  master: 'Master',
  grandmaster: 'Grandmaster',
};
const ELO_CAP = 10000;
/* /api/elo/user/:id returns the newest 30 ledger rows. */
const LEDGER_LIMIT = 30;

const nf = new Intl.NumberFormat('en-US');
const signed = (n) => `${n > 0 ? '+' : ''}${nf.format(n)}`;

function seasonWindow(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 1));
  return {
    startIso: start.toISOString(),
    name: start.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }),
    daysLeft: Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000)),
  };
}

function resetsIn(iso) {
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return `${h}h`;
  return `${Math.max(1, Math.round(ms / 60000))}m`;
}

function Sparkline({ values }) {
  if (!Array.isArray(values) || values.length < 2) return null;
  const w = 120;
  const h = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`)
    .join(' ');
  return (
    <svg
      className="bs-season-spark"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="ELO rating over the past 30 days"
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EloSeasonCard({ userId }) {
  const { rating, tier, transactions, loading } = useElo(userId);
  const [me, setMe] = useState(null);
  const [quest, setQuest] = useState(null);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    const getJson = (url) =>
      fetch(url, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    getJson('/api/leaderboard/me').then((d) => {
      if (!cancelled && d && !d.error) setMe(d);
    });
    getJson('/api/learning/quests/daily').then((d) => {
      if (!cancelled && d && !d.error) setQuest(d);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const season = useMemo(() => seasonWindow(), []);

  /* Season change from the ledger. If all 30 loaded rows fall inside the
     month, older season rows may exist, so fall back to the complete
     30 day figure and label it as such. */
  const seasonChange = useMemo(() => {
    const rows = Array.isArray(transactions) ? transactions : [];
    const inSeason = rows.filter((t) => t?.created_at >= season.startIso);
    const truncated = rows.length >= LEDGER_LIMIT && inSeason.length === rows.length;
    if (truncated) {
      return Number.isFinite(me?.delta30d) ? { value: me.delta30d, label: 'past 30 days' } : null;
    }
    return {
      value: inSeason.reduce((sum, t) => sum + (Number(t.delta) || 0), 0),
      label: 'this season',
    };
  }, [transactions, season.startIso, me]);

  const tierKey = TIER_ORDER.includes(tier) ? tier : 'novice';
  const nextKey = TIER_ORDER[TIER_ORDER.indexOf(tierKey) + 1] || null;
  const floor = TIER_FLOOR[tierKey];
  const ceiling = nextKey ? TIER_FLOOR[nextKey] : ELO_CAP;
  const progress = Math.max(0, Math.min(1, (rating - floor) / Math.max(1, ceiling - floor)));
  const toNext = Math.max(0, ceiling - rating);

  const tasks = Array.isArray(quest?.bonus) ? quest.bonus : [];
  const openReward = tasks.filter((t) => !t.done).reduce((s, t) => s + (t.reward_elo || 0), 0);
  const resets = quest?.resets_at ? resetsIn(quest.resets_at) : null;
  const delta7d = Number.isFinite(me?.delta7d) ? me.delta7d : null;
  const toneOf = (n) => (n > 0 ? ' bs-season-delta--up' : n < 0 ? ' bs-season-delta--down' : '');

  return (
    <section className="bs-season" aria-labelledby="bs-season-label">
      <div className="bs-season-head">
        <div id="bs-season-label" className="bs-section-label">
          ELO rating · {season.name} season
        </div>
        <div className="bs-season-meta">
          {me?.rank ? <span>Rank #{nf.format(me.rank)}</span> : null}
          <span>
            {season.daysLeft} {season.daysLeft === 1 ? 'day' : 'days'} left
          </span>
        </div>
      </div>

      <div className="bs-season-top">
        <div className="bs-season-rating">
          <div className="bs-season-num" aria-busy={loading}>
            {nf.format(rating)}
            <span className="bs-season-cap">/{nf.format(ELO_CAP)}</span>
          </div>
          <div className="bs-season-deltas">
            <span className="bs-season-tier">{TIER_NAME[tierKey]}</span>
            {seasonChange ? (
              <span className={`bs-season-delta${toneOf(seasonChange.value)}`}>
                {signed(seasonChange.value)} <em>{seasonChange.label}</em>
              </span>
            ) : null}
            {delta7d !== null ? (
              <span className={`bs-season-delta${toneOf(delta7d)}`}>
                {signed(delta7d)} <em>past 7 days</em>
              </span>
            ) : null}
          </div>
        </div>
        <Sparkline values={me?.sparkline} />
      </div>

      <div className="bs-season-progress">
        <div
          className="bs-season-track"
          role="progressbar"
          aria-valuemin={floor}
          aria-valuemax={ceiling}
          aria-valuenow={Math.min(rating, ceiling)}
          aria-label={nextKey ? `Progress to ${TIER_NAME[nextKey]}` : 'Progress to the ELO cap'}
        >
          <div className="bs-season-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="bs-season-marks">
          <span>
            {TIER_NAME[tierKey]} · {nf.format(floor)}
          </span>
          <span className="bs-season-marks-next">
            {nextKey
              ? `${nf.format(toNext)} to ${TIER_NAME[nextKey]}`
              : `${nf.format(toNext)} to the cap`}
          </span>
        </div>
      </div>

      <div className="bs-season-wins">
        <div className="bs-season-wins-head">
          <span className="bs-section-label">Quick wins today</span>
          <span className="bs-season-meta">
            {openReward > 0 ? <span>+{openReward} ELO open</span> : null}
            {resets ? <span>Resets in {resets}</span> : null}
          </span>
        </div>
        <ul className="bs-season-list">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link
                href="/learning-center"
                className={`bs-season-row${t.done ? ' bs-season-row--done' : ''}`}
              >
                <i
                  className={`bi ${t.done ? 'bi-check-circle-fill' : 'bi-circle'} bs-season-row-ico`}
                  aria-hidden="true"
                />
                <span className="bs-season-row-label">{t.label}</span>
                {!t.done && t.target > 1 ? (
                  <span className="bs-season-row-prog">
                    {Math.min(t.progress || 0, t.target)}/{t.target}
                  </span>
                ) : null}
                <span className="bs-season-row-elo">{t.done ? 'Earned' : `+${t.reward_elo}`}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/learning-center" className="bs-season-row">
              <i className="bi bi-mortarboard bs-season-row-ico" aria-hidden="true" />
              <span className="bs-season-row-label">Pass a course quiz</span>
              <span className="bs-season-row-elo">+10 to +55</span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}

export default EloSeasonCard;
