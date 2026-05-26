/**
 * Shared helpers for ELO leaderboard API enrichment.
 */

export function initialsFromName(name) {
  return (name || 'Member')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function humanizeLastActive(lastActivityAt) {
  if (!lastActivityAt) return 'Long ago';
  const ms = Date.now() - new Date(lastActivityAt).getTime();
  if (ms < 5 * 60 * 1000) return 'Now';
  if (ms < 60 * 60 * 1000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 24 * 60 * 60 * 1000) return `${Math.floor(ms / 3600000)}h ago`;
  if (ms < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(ms / 86400000)}d ago`;
  return new Date(lastActivityAt).toLocaleDateString();
}

/**
 * @param {Array<{ user_id: string, delta: number, created_at: string, rating_after: number }>} txs
 * @param {number} currentRating
 */
export function computeDeltasAndSparkline(txs, currentRating) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const tx7d = (txs || []).filter((t) => t.created_at >= sevenDaysAgo);
  const tx30d = txs || [];

  const delta7d = tx7d.reduce((sum, t) => sum + (t.delta || 0), 0);
  const delta30d = tx30d.reduce((sum, t) => sum + (t.delta || 0), 0);

  const sparkline = [];
  if (tx30d.length > 0) {
    const startRating = tx30d[0].rating_after - (tx30d[0].delta || 0);
    const step = Math.max(1, tx30d.length / 6);
    for (let i = 0; i < 6; i++) {
      const idx = Math.min(tx30d.length - 1, Math.floor(i * step));
      sparkline.push(tx30d[idx]?.rating_after ?? startRating);
    }
    sparkline.push(currentRating);
  } else {
    for (let i = 0; i < 7; i++) sparkline.push(currentRating);
  }

  return { delta7d, delta30d, sparkline };
}

/**
 * @param {Record<string, Array>} historyByUser
 */
export function groupEloHistory(historyRows) {
  const historyByUser = {};
  for (const tx of historyRows || []) {
    if (!historyByUser[tx.user_id]) historyByUser[tx.user_id] = [];
    historyByUser[tx.user_id].push(tx);
  }
  return historyByUser;
}

export function profileTitle(profile) {
  const settings = profile?.user_settings;
  if (!settings || typeof settings !== 'object') return '';
  return settings.title || settings.specialty || '';
}

export function formatRefreshesIn(iso) {
  if (!iso) return '—';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'soon';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const QUEST_CATEGORY = {
  finish_lessons: 'LEARN',
  pass_friend: 'ENGAGE',
  try_track: 'LEARN',
};

export function mapBonusQuestsToRedesign(bonus) {
  return (bonus || []).map((q, i) => ({
    id: q.id || `q${i + 1}`,
    category: QUEST_CATEGORY[q.type] || 'PICK',
    title: q.label || q.title || 'Daily quest',
    xp: q.reward_elo ?? q.xp ?? 0,
    progress: {
      current: q.progress ?? 0,
      target: q.target ?? 1,
    },
    done: Boolean(q.done),
  }));
}
