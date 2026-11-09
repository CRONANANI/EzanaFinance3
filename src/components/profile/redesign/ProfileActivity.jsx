'use client';

/**
 * Profile Activity section (Nov 2026).
 *
 * The home activity card (variant="profile") followed by the deeper
 * analytics each of its four stats links to. Home links land here as
 * /profile/<slug>#activity-active-days | #activity-busiest-day |
 * #activity-longest-streak | #activity-current-streak; this component
 * scrolls to (and focuses) the matching section once the data is in,
 * because the sections render client-side after the hash has been read.
 *
 * Everything is derived from the same year the card shows (pure helpers in
 * src/lib/activity-density.js) plus the per-source breakdown the API adds
 * with include=breakdown. Shown on your own profile, and on someone else's
 * only when they have not turned off privacy_show_activity (the API
 * enforces that; this component just renders the private state).
 */
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  dayMs,
  monthlyActivity,
  percentileLabel,
  topDays,
  topStreaks,
  weekdayActivity,
} from '@/lib/activity-density';
import './profile-activity.css';

const ActivityDensityCard = dynamic(
  () => import('@/components/home/ActivityDensityCard').then((m) => m.ActivityDensityCard),
  { ssr: false, loading: () => <div className="pact-skel" aria-hidden="true" /> },
);

const LOCALE = 'en-US';
const SOURCE_LABELS = {
  sonar_queries: 'Sonar pings',
  community_posts: 'Community posts',
  post_likes: 'Likes',
  post_saves: 'Saves',
  mock_trades: 'Paper trades',
  user_trades: 'Logged trades',
  user_watchlist_items: 'Watchlist adds',
  elo_transactions: 'Lessons completed',
};
const WEEKDAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

const nf = new Intl.NumberFormat(LOCALE);
const nf1 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const dfDay = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const dfShort = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const dfMonth = new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' });
const dfMonthLong = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const dfWeekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', timeZone: 'UTC' });

const plural = (n, one, many) => `${nf.format(n)} ${n === 1 ? one : many}`;
const range = (a, b) =>
  a && b ? `${dfShort.format(dayMs(a))} to ${dfShort.format(dayMs(b))}` : '';
// 2026-11-01 (a Sunday) + dow gives that weekday's short name.
const weekdayName = (dow) => dfWeekday.format(Date.UTC(2026, 10, 1 + dow));

function Rank({ pct }) {
  const label = percentileLabel(pct);
  return label ? (
    <span className="pact-rank" title={`Higher than about ${Math.round(pct)}% of Ezana members`}>
      <i className="bi bi-bar-chart-line" aria-hidden="true" />
      {label} on Ezana
    </span>
  ) : (
    <span className="pact-rank is-empty">Not ranked yet</span>
  );
}

function Section({ id, title, value, pct, children }) {
  return (
    <section id={id} className="pact-section" aria-labelledby={`${id}-h`}>
      <header className="pact-section__head">
        <h3 id={`${id}-h`} className="pact-section__title" tabIndex={-1}>
          {title}
        </h3>
        <div className="pact-section__value">{value}</div>
        {pct !== undefined ? <Rank pct={pct} /> : null}
      </header>
      {children}
    </section>
  );
}

/** Vertical bars with a visually hidden table for screen readers. */
function Bars({ caption, items }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure className="pact-bars">
      <div className="pact-bars__plot" aria-hidden="true">
        {items.map((i) => (
          <div key={i.key} className="pact-bars__col" title={i.title}>
            <div className="pact-bars__track">
              <div
                className="pact-bars__bar"
                style={{ height: `${Math.max(i.value > 0 ? 4 : 0, (i.value / max) * 100)}%` }}
              />
            </div>
            <div className="pact-bars__label">{i.label}</div>
          </div>
        ))}
      </div>
      <table className="pact-sr">
        <caption>{caption}</caption>
        <tbody>
          {items.map((i) => (
            <tr key={i.key}>
              <th scope="row">{i.title.split(':')[0]}</th>
              <td>{i.title.split(':').slice(1).join(':').trim()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal ranked rows (top days, streaks, sources). */
function Rows({ label, items }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="pact-empty">Nothing here yet.</p>;
  return (
    <ol className="pact-rows" aria-label={label}>
      {items.map((i) => (
        <li key={i.key} className="pact-rows__row">
          <span className="pact-rows__name">{i.name}</span>
          <span className="pact-rows__track" aria-hidden="true">
            <span className="pact-rows__bar" style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="pact-rows__value">{i.display}</span>
        </li>
      ))}
    </ol>
  );
}

export function ProfileActivity({ userId, isOwn }) {
  const [data, setData] = useState({ status: 'loading' });
  const onData = useCallback((d) => setData(d), []);

  const derived = useMemo(() => {
    const cells = data.model?.cells;
    if (!cells?.length) return null;
    const stats = data.model.stats;
    const last = cells[cells.length - 1];
    const prev = cells[cells.length - 2];
    return {
      stats,
      totalDays: cells.length,
      actionDays: cells.filter((c) => c.count > 0).length,
      loginOnlyDays: cells.filter((c) => c.count === 0 && c.login).length,
      months: monthlyActivity(cells).slice(-12),
      weekdays: weekdayActivity(cells),
      top: topDays(cells, 5),
      streaks: topStreaks(cells, 3),
      activeToday: last?.level > 0,
      atRisk: !(last?.level > 0) && prev?.level > 0,
    };
  }, [data.model]);

  // Land on the section a home stat linked to, once it exists.
  useEffect(() => {
    if (data.status !== 'ready' || !derived) return;
    const id = window.location.hash.slice(1);
    if (!id.startsWith('activity-')) return;
    const el = document.getElementById(id);
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    el.querySelector('h3')?.focus({ preventScroll: true });
  }, [data.status, derived]);

  const pct = data.percentiles || {};
  const private_ = data.status === 'error' && data.errorCode === 'activity_private';

  return (
    <div id="activity" className="pact">
      <div className="pact-card">
        <ActivityDensityCard variant="profile" userId={isOwn ? null : userId} onData={onData} />
      </div>

      {private_ ? null : derived ? (
        <div className="pact-grid">
          <Section
            id="activity-active-days"
            title="Active days"
            value={`${plural(derived.stats.activeDays, 'day', 'days')} of ${nf.format(derived.totalDays)} (${nf1.format(
              (derived.stats.activeDays / derived.totalDays) * 100,
            )}%)`}
            pct={pct.activeDays ?? null}
          >
            <p className="pact-note">
              {plural(derived.actionDays, 'day', 'days')} with actions,{' '}
              {plural(derived.loginOnlyDays, 'day', 'days')} logged in only.
            </p>
            <Bars
              caption="Active days by month"
              items={derived.months.map((m) => {
                const ms = dayMs(`${m.month}-01`);
                return {
                  key: m.month,
                  label: dfMonth.format(ms),
                  value: m.activeDays,
                  title: `${dfMonthLong.format(ms)}: ${plural(m.activeDays, 'active day', 'active days')}`,
                };
              })}
            />
          </Section>

          <Section
            id="activity-busiest-day"
            title="Busiest day"
            value={
              derived.stats.busiest.date
                ? `${plural(derived.stats.busiest.count, 'action', 'actions')} on ${dfDay.format(dayMs(derived.stats.busiest.date))}`
                : 'No actions yet'
            }
            pct={pct.busiestDay ?? null}
          >
            <h4 className="pact-sub">Top days</h4>
            <Rows
              label="Days with the most actions"
              items={derived.top.map((d) => ({
                key: d.date,
                name: dfDay.format(dayMs(d.date)),
                value: d.count,
                display: plural(d.count, 'action', 'actions'),
              }))}
            />
            <h4 className="pact-sub">Average actions by weekday</h4>
            <Bars
              caption="Average actions by weekday"
              items={WEEKDAYS_MON_FIRST.map((dow) => {
                const w = derived.weekdays[dow];
                return {
                  key: String(dow),
                  label: weekdayName(dow),
                  value: w.avgActions,
                  title: `${weekdayName(dow)}: ${nf1.format(w.avgActions)} actions on average`,
                };
              })}
            />
          </Section>

          <Section
            id="activity-longest-streak"
            title="Longest streak"
            value={
              derived.stats.longest.days
                ? `${plural(derived.stats.longest.days, 'day', 'days')}, ${range(derived.stats.longest.start, derived.stats.longest.end)}`
                : 'No streak yet'
            }
            pct={pct.longestStreak ?? null}
          >
            <h4 className="pact-sub">Top streaks</h4>
            <Rows
              label="Longest runs of active days"
              items={derived.streaks.map((r) => ({
                key: r.start,
                name: range(r.start, r.end),
                value: r.days,
                display: plural(r.days, 'day', 'days'),
              }))}
            />
          </Section>

          <Section
            id="activity-current-streak"
            title="Current streak"
            value={plural(derived.stats.current.days, 'day', 'days')}
            pct={pct.currentStreak ?? null}
          >
            <p className="pact-note">
              {derived.activeToday
                ? 'Active today.'
                : derived.atRisk
                  ? isOwn
                    ? 'Not active yet today. Log in or take an action to keep the streak going.'
                    : 'Not active yet today.'
                  : isOwn
                    ? 'Start a new streak by logging in or taking an action today.'
                    : 'No active streak right now.'}
            </p>
            {derived.stats.longest.days > 0 ? (
              <p className="pact-note">
                {derived.stats.current.days >= derived.stats.longest.days
                  ? `This is ${isOwn ? 'your' : 'their'} longest streak.`
                  : `${plural(
                      derived.stats.longest.days - derived.stats.current.days + 1,
                      'more day',
                      'more days',
                    )} to beat ${isOwn ? 'your' : 'their'} longest streak.`}
              </p>
            ) : null}
          </Section>

          {Array.isArray(data.breakdown) ? (
            <Section
              id="activity-breakdown"
              title={isOwn ? 'What you do on Ezana' : 'What they do on Ezana'}
              value={plural(derived.stats.total, 'action', 'actions')}
            >
              <Rows
                label="Actions by type"
                items={data.breakdown.map((b) => ({
                  key: b.source,
                  name: SOURCE_LABELS[b.source] || b.source,
                  value: b.actions,
                  display: nf.format(b.actions),
                }))}
              />
            </Section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default ProfileActivity;
