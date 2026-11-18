'use client';

/**
 * The home page's "Your activity" insights (Nov 18 2026): beside the activity
 * heat map, the four tiles read the member's portfolio return, their circle on
 * Community, their copy trading and their streak, not platform activity alone.
 *
 * Every figure comes from an existing, session-scoped route. Nothing is
 * estimated: a figure that cannot be read is null and the tile says so.
 *   - Portfolio: /api/portfolio/value-series?range=1Y, counted only when the
 *     series is the member's own record (balance snapshots or daily returns),
 *     never the synthetic fill. Otherwise the paper portfolio, from
 *     /api/portfolio/mock-value-series?range=1Y&benchmark=1, with the S&P 500
 *     over the same window when it is available.
 *   - Community: /api/community/me (friends, following).
 *   - Copy trading: /api/community/copy-request/active (copying, copied by,
 *     and the average return of the copies the member runs).
 */
import { useEffect, useState } from 'react';

const OWN_SOURCES = new Set(['db', 'snaptrade_snapshots']);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

async function getJson(url) {
  try {
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Percent change from the first to the last point of [{ at, value }]. */
function changeOf(points, valueKey = 'value') {
  if (!Array.isArray(points) || points.length < 2) return null;
  const first = Number(points[0]?.[valueKey]);
  const last = Number(points[points.length - 1]?.[valueKey]);
  if (!isNum(first) || !isNum(last) || first <= 0) return null;
  return (last / first - 1) * 100;
}

async function readPortfolio() {
  const own = await getJson('/api/portfolio/value-series?range=1Y');
  if (own && OWN_SOURCES.has(own.source)) {
    const pct = changeOf(own.points);
    if (isNum(pct)) {
      return { kind: 'own', pct, since: own.points[0].at, benchPct: null };
    }
  }
  const paper = await getJson('/api/portfolio/mock-value-series?range=1Y&benchmark=1');
  const pct = changeOf(paper?.points);
  if (isNum(pct)) {
    return {
      kind: 'paper',
      pct,
      since: paper.points[0].at,
      benchPct: changeOf(paper.benchmark, 'v'),
    };
  }
  return null;
}

async function readCommunity() {
  const me = await getJson('/api/community/me');
  if (!me) return null;
  return {
    friends: Number(me.friends) || 0,
    following: Number(me.following) || 0,
    unread: Boolean(me.has_unread_messages),
  };
}

async function readCopies() {
  const d = await getJson('/api/community/copy-request/active');
  if (!d) return null;
  const copying = Array.isArray(d.copying) ? d.copying : [];
  const copiedBy = Array.isArray(d.copiedBy) ? d.copiedBy : [];
  const perfs = copying.map((c) => Number(c.performance_pct)).filter(isNum);
  return {
    copying: copying.length,
    copiedBy: copiedBy.length,
    avgPct: perfs.length ? perfs.reduce((a, b) => a + b, 0) / perfs.length : null,
  };
}

/**
 * @param {boolean} enabled  fetch only on the home variant, for a signed-in user
 * @returns {{ status: 'loading'|'ready', portfolio: object|null, community: object|null, copies: object|null }}
 */
export function useHomeInsights(enabled) {
  const [state, setState] = useState({
    status: enabled ? 'loading' : 'ready',
    portfolio: null,
    community: null,
    copies: null,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    Promise.all([readPortfolio(), readCommunity(), readCopies()]).then(
      ([portfolio, community, copies]) => {
        if (!cancelled) setState({ status: 'ready', portfolio, community, copies });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
