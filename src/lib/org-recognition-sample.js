/**
 * Sample content for Recognition (/org-team-hub/recognition).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/recognition/sample, so the page can be reviewed and presented
 * from a council with little activity. Real councils never receive it, and
 * the page labels it "Sample content" while it shows. Nothing here is read
 * from or written to the database: while it shows, an award given, a
 * recompute, an auto-award or a weights change is applied on the page only
 * (`applySampleAction`) and is gone on reload.
 *
 * The council is the same sample council every rebuilt Team Hub page shows:
 * the people and the four sector teams come from the Trading Desk bundle, and
 * the scored pitches are the shared list in org-sample-pitches.js (the ones
 * Fund Analytics and the Pitch Pipeline show). Ratings are computed from
 * those pitches with the real rating rules (thesisDelta, scored 30 days after
 * the decision, accepted pitches only, so the rejected PFE and DE do not
 * count). The two auto-awards are what pickAutoAwards gives for the quarter
 * they name. Dates are relative to today.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildTradingDeskSample } from './org-trading-desk-sample.js';
import { SAMPLE_PITCHES, SAMPLE_PITCH_AUTHORS } from './org-sample-pitches.js';
import { computeCalibration, thesisDelta, tierForRating, tierLabel } from './org-rating-engine.js';
import {
  BADGE_TYPES,
  BASE_RATING,
  DEFAULT_WEIGHTS,
  badgeOf,
  currentQuarter,
  isFacultyAdvisor,
  parseQuarter,
  periodStart,
  pickAutoAwards,
  rankRatings,
  ratingHistory,
  scoredOn,
  weightRoleOf,
} from './org-recognition-model.js';

const DAY = 86400000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const memberOf = (n) => id('member', n);
const userOf = (n) => id('user', n);
const N = {
  tesfaye: 1,
  bekele: 2,
  haile: 3,
  okoye: 4,
  lindqvist: 5,
  park: 6,
  rossi: 7,
  weber: 8,
  alvarez: 9,
};

/* Declared conviction (1 to 5) on each decided pitch. Invented. */
const CONVICTION = {
  JPM: 4,
  SCHW: 3,
  BAC: 4,
  LLY: 5,
  UNH: 4,
  MRK: 3,
  NVDA: 5,
  MSFT: 3,
  AAPL: 2,
  CAT: 3,
  PFE: 4,
  DE: 2,
};
/* Market (benchmark) return over each pitch's window, as Fund Analytics reads
   it: return minus excess. */
const SECTOR = {
  JPM: 'Financials',
  SCHW: 'Financials',
  BAC: 'Financials',
  LLY: 'Healthcare',
  UNH: 'Healthcare',
  MRK: 'Healthcare',
  NVDA: 'Technology',
  MSFT: 'Technology',
  AAPL: 'Technology',
  CAT: 'Industrials',
  GE: 'Industrials',
  V: 'Financials',
  PFE: 'Healthcare',
  DE: 'Industrials',
};

/* Inputs to the other categories, per member: [research notes, assignment
   submissions, learning rating or null]. Invented. */
const ACTIVITY = {
  tesfaye: [7, 5, 3410],
  bekele: [6, 4, 2980],
  haile: [9, 6, 3720],
  okoye: [4, 5, null],
  lindqvist: [5, 3, 3100],
  park: [3, 2, null],
  rossi: [8, 6, 3550],
  weber: [4, 3, 2650],
  alvarez: [2, 2, 2400],
  me: [3, 4, null],
};

/*
 * Hand-given badges and awards: [badge, recipient, giver, days ago, gold,
 * period, reason, pitch ticker or null]. "me" is the viewer.
 */
const AWARDS = [
  [
    'clutch',
    'tesfaye',
    'okoye',
    2,
    false,
    'Fall 2026',
    'Covered the BAC earnings call and had the model updated the same night.',
    'BAC',
  ],
  [
    'best_call',
    'rossi',
    'haile',
    3,
    true,
    'Fall 2026',
    'Named the data center catalyst in the NVDA pitch a quarter before it showed up in results.',
    'NVDA',
  ],
  [
    'rising_star',
    'alvarez',
    'lindqvist',
    5,
    false,
    'Fall 2026',
    'First pitch through screening; rebuilt the COST model after desk review.',
    null,
  ],
  [
    'deep_dive',
    'weber',
    'park',
    9,
    false,
    'Fall 2026',
    'ETN power demand model with three scenarios and a sourced capacity table.',
    null,
  ],
  [
    'analyst_of_month',
    'bekele',
    'lindqvist',
    12,
    false,
    'October 2026',
    'LLY and MRK coverage carried the healthcare sleeve through earnings.',
    'LLY',
  ],
  [
    'clutch',
    'okoye',
    'me',
    20,
    false,
    'Fall 2026',
    'Ran the council meeting and the committee vote while two executives were away.',
    null,
  ],
  [
    'analyst_of_month',
    'tesfaye',
    'me',
    45,
    true,
    'September 2026',
    'Three financials pitches scored, all three ahead of the market.',
    'JPM',
  ],
  [
    'rising_star',
    'rossi',
    'haile',
    60,
    false,
    'Fall 2026',
    'Took over MSFT and AAPL coverage in her first month on the technology team.',
    null,
  ],
  [
    'deep_dive',
    'haile',
    'park',
    125,
    false,
    'Summer 2026',
    'Semiconductor supply chain primer used in analyst training.',
    null,
  ],
];

/** Score helpers: the same scales the engine uses. */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fromCount = (n, target) => (n > 0 ? clamp((n / target) * 100, 0, 100) : null);
const round2 = (v) => Math.round(v * 100) / 100;

/**
 * @param {{ userId: string, memberId: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildRecognitionSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const desk = buildTradingDeskSample({ userId, memberId, role, displayName, title, subRole, now });
  const me = desk.viewer.memberId;
  const members = desk.roster.members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    display_name: m.display_name,
    role: m.role,
    sub_role: m.sub_role || null,
    team_id: m.team_id || null,
    is_active: true,
    is_demo: true,
  }));
  const teams = desk.roster.teams;
  const iso = (daysAgo) => new Date(now - daysAgo * DAY).toISOString();
  const keyOf = (k) =>
    k === 'me' ? { id: me, user_id: userId } : { id: memberOf(N[k]), user_id: userOf(N[k]) };

  /* Pitches and outcomes (the shared list), with the fields the rules read. */
  const pitches = [];
  const outcomes = [];
  SAMPLE_PITCHES.forEach(([ticker, company, author, decision, days, ret, alpha], i) => {
    if (!decision) return;
    const pid = id('pitch', i + 1);
    pitches.push({
      id: pid,
      ticker,
      company_name: company,
      sector: SECTOR[ticker] || null,
      analyst_member_id: memberOf(SAMPLE_PITCH_AUTHORS[author]),
      decision,
      decision_at: iso(days),
      conviction_level: CONVICTION[ticker] ?? null,
      is_demo: true,
    });
    if (alpha != null) {
      outcomes.push({
        pitch_id: pid,
        return_pct: ret,
        alpha_pct: alpha,
        benchmark_return_pct: Math.round((ret - alpha) * 100) / 100,
        computed_at: iso(0),
      });
    }
  });
  const outcomeOf = new Map(outcomes.map((o) => [o.pitch_id, o]));

  /* Rating changes, written the way the fixed engine writes them. */
  const transactions = [];
  for (const p of pitches) {
    const o = outcomeOf.get(p.id);
    if (!o || p.decision !== 'accepted') continue;
    const scored = scoredOn(p.decision_at);
    if (new Date(scored).getTime() > now) continue;
    transactions.push({
      member_id: p.analyst_member_id,
      delta: thesisDelta(o.alpha_pct, { convictionLevel: p.conviction_level }),
      reason: 'thesis_resolved',
      pitch_id: p.id,
      created_at: scored,
      metadata: {
        scored_on: scored,
        ticker: p.ticker,
        alpha_pct: o.alpha_pct,
        conviction_level: p.conviction_level,
      },
      is_demo: true,
    });
  }

  const lastRecompute = iso(1);
  const ratings = members
    .filter((m) => !isFacultyAdvisor(m))
    .map((m) => {
      const mine = transactions.filter((t) => t.member_id === m.id);
      const rating = BASE_RATING + mine.reduce((s, t) => s + t.delta, 0);
      return {
        member_id: m.id,
        rating,
        tier: tierForRating(rating, mine.length),
        rated_thesis_count: mine.length,
        updated_at: lastRecompute,
      };
    });

  /* Badges and awards: the hand-given ones and the two auto-awards. */
  const recognitions = AWARDS.map(([badge, to, by, days, gold, period, reason, ticker], i) => {
    const pitch = ticker ? pitches.find((p) => p.ticker === ticker) : null;
    return {
      id: id('recognition', i + 1),
      recipient_id: keyOf(to).user_id,
      awarded_by: keyOf(by).user_id,
      badge_type: badge,
      title: badgeOf(badge).label,
      reason,
      period,
      is_award: gold,
      auto_generated: false,
      pitch_id: pitch?.id || null,
      created_at: iso(days),
      is_demo: true,
    };
  });
  /* Auto-awards for the previous quarter, run on the second day of this one. */
  const quarterStart = periodStart('qtd', now).getTime();
  const autoPeriod = currentQuarter(quarterStart - DAY);
  const autoAt = new Date(Math.min(quarterStart + DAY, now - 3600000)).toISOString();
  const auto = pickAutoAwards({ pitches, outcomes, range: parseQuarter(autoPeriod), now });
  const byMember = new Map(members.map((m) => [m.id, m]));
  if (auto.best) {
    recognitions.push({
      id: id('recognition', 50),
      recipient_id: byMember.get(auto.best.pitch.analyst_member_id)?.user_id,
      awarded_by: userId,
      badge_type: 'best_call',
      title: `Best Call: ${auto.best.pitch.ticker}`,
      reason: `Highest excess return over the market in ${autoPeriod}: +${auto.best.alpha.toFixed(1)}% on ${auto.best.pitch.company_name}.`,
      period: autoPeriod,
      is_award: false,
      auto_generated: true,
      pitch_id: auto.best.pitch.id,
      created_at: autoAt,
      is_demo: true,
    });
  }
  if (auto.accurate) {
    const a = auto.accurate;
    recognitions.push({
      id: id('recognition', 51),
      recipient_id: byMember.get(a.memberId)?.user_id,
      awarded_by: userId,
      badge_type: 'most_accurate',
      title: 'Most Accurate Analyst',
      reason: `${a.hits} of ${a.total} pitches scored in ${autoPeriod} beat the market (${Math.round(a.rate * 100)}% hit rate).`,
      period: autoPeriod,
      is_award: false,
      auto_generated: true,
      pitch_id: null,
      created_at: autoAt,
      is_demo: true,
    });
  }

  const weights = JSON.parse(JSON.stringify(DEFAULT_WEIGHTS));
  const viewer = {
    userId,
    memberId: me,
    canAward: role === 'executive' || role === 'portfolio_manager',
    isAdvisor: role === 'executive' && subRole === 'Faculty Advisor',
  };

  return {
    is_demo: true,
    now,
    viewer,
    members,
    teams,
    pitches,
    outcomes,
    transactions,
    ratings,
    lastRecompute,
    weights,
    recognitions: sortRecent(recognitions),
  };
}

const sortRecent = (list) =>
  [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

/** GET /api/org/recognition, answered from the bundle. */
export function sampleBase(bundle) {
  const byUser = new Map(bundle.members.map((m) => [m.user_id, m]));
  const tickerOf = new Map(bundle.pitches.map((p) => [p.id, p.ticker]));
  return {
    is_demo: true,
    members: bundle.members,
    teams: bundle.teams,
    viewer: bundle.viewer,
    recognitions: bundle.recognitions.map((r) => ({
      ...r,
      recipient_name: byUser.get(r.recipient_id)?.display_name || 'Member',
      recipient_member_id: byUser.get(r.recipient_id)?.id || null,
      recipient_role: byUser.get(r.recipient_id)?.role || null,
      awarded_by_name: r.auto_generated ? null : byUser.get(r.awarded_by)?.display_name || null,
      pitch_ticker: r.pitch_id ? tickerOf.get(r.pitch_id) || null : null,
    })),
  };
}

/** GET /api/org/recognition/ratings, answered from the bundle. */
export function sampleRatings(bundle, listMode, period, now = Date.now()) {
  return rankRatings({
    members: bundle.members,
    ratings: bundle.ratings,
    transactions: bundle.transactions,
    lastRecompute: bundle.lastRecompute,
    listMode,
    period,
    now,
  });
}

/** GET /api/org/recognition/scorecard/[id], answered from the bundle. */
export function sampleScorecard(bundle, memberId, now = Date.now()) {
  const m = bundle.members.find((x) => x.id === memberId);
  if (!m) return null;
  const weightRole = weightRoleOf(m.role, m.sub_role);
  const advisor = isFacultyAdvisor(m);
  const r = bundle.ratings.find((x) => x.member_id === memberId);
  const count = r ? r.rated_thesis_count : 0;
  const rating = r ? r.rating : BASE_RATING;
  const tier = r && count > 0 ? r.tier : 'unranked';
  const tx = bundle.transactions.filter((t) => t.member_id === memberId);
  const key =
    memberId === bundle.viewer.memberId
      ? 'me'
      : Object.keys(N).find((k) => memberOf(N[k]) === memberId);
  const [notes, subs, learning] = ACTIVITY[key] || [0, 0, null];

  const pitchOf = new Map(bundle.pitches.map((p) => [p.id, p]));
  const outcomeOf = new Map(bundle.outcomes.map((o) => [o.pitch_id, o]));
  const resolved = tx.map((t) => {
    const p = pitchOf.get(t.pitch_id);
    const o = outcomeOf.get(t.pitch_id);
    return { ...p, ...o, delta: t.delta, scored_on: t.metadata.scored_on };
  });

  const scores = {};
  if (resolved.length) {
    const mean = resolved.reduce((s, x) => s + x.alpha_pct, 0) / resolved.length;
    const s = clamp(50 + mean * 2.5, 0, 100);
    scores.alpha_vs_sector = s;
    scores.portfolio_alpha = s;
    scores.strategy_pnl = s;
  }
  const rout = fromCount(notes, 8);
  if (rout != null) {
    scores.research_output = rout;
    scores.research_oversight = rout;
  }
  const task = fromCount(subs, 6);
  if (task != null) scores.task_efficiency = task;
  const eng = fromCount(notes, 10);
  if (eng != null) scores.engagement = eng;
  if (learning != null) scores.learning = clamp(learning / 50, 0, 100);
  const cal = computeCalibration(resolved);
  if (cal) scores.calibration = cal.score;
  if (advisor) for (const k of Object.keys(scores)) delete scores[k];

  const weights = bundle.weights[weightRole] || {};
  const categories = Object.entries(weights)
    .map(([category, weight]) => ({
      category,
      weight: Number(weight),
      score: scores[category] == null ? null : round2(scores[category]),
    }))
    .sort((a, b) => b.weight - a.weight);

  const rated = bundle.ratings.filter((x) => x.rated_thesis_count > 0).map((x) => x.rating);
  const orgPct =
    count > 0 && rated.length > 1
      ? Math.round((rated.filter((v) => v < rating).length / (rated.length - 1)) * 100)
      : null;
  const team = bundle.teams.find((t) => t.id === m.team_id) || null;
  const base = sampleBase(bundle);

  return {
    is_demo: true,
    member: {
      member_id: m.id,
      user_id: m.user_id,
      name: m.display_name,
      role: m.role,
      sub_role: m.sub_role,
      weight_role: weightRole,
      team_name: team?.name || null,
      is_advisor: advisor,
    },
    rating: {
      value: rating,
      tier,
      tier_label: tierLabel(tier),
      rated_thesis_count: count,
      is_provisional: count < 10,
      has_rating: Boolean(r),
    },
    history: ratingHistory(tx),
    history_dated: true,
    percentiles: { org: orgPct, all_funds: null },
    categories,
    receipts: resolved
      .map((x) => ({
        pitch_id: x.id,
        ticker: x.ticker,
        company_name: x.company_name,
        sector: x.sector,
        benchmark_return_pct: x.benchmark_return_pct,
        return_pct: x.return_pct,
        hold_days: Math.round((now - new Date(x.decision_at).getTime()) / DAY),
        excess_return_pct: x.alpha_pct,
        scored_on: x.scored_on,
        conviction_level: x.conviction_level,
        delta_rating: x.delta,
      }))
      .sort((a, b) => b.delta_rating - a.delta_rating),
    calibration_series: cal ? cal.series : null,
    recognitions: base.recognitions.filter((x) => x.recipient_id === m.user_id),
  };
}

/** GET /api/org/recognition/weights, answered from the bundle. */
export function sampleWeights(bundle) {
  return {
    roles: Object.entries(bundle.weights).map(([role, cats]) => ({
      role,
      categories: Object.entries(cats)
        .map(([category, weight]) => ({
          category,
          weight,
          default_weight: DEFAULT_WEIGHTS[role]?.[category] ?? weight,
          overridden: weight !== DEFAULT_WEIGHTS[role]?.[category],
        }))
        .sort((a, b) => b.weight - a.weight),
    })),
    canEdit: bundle.viewer.canAward,
  };
}

/**
 * Apply an action to the bundle on the page only, with the same rules the
 * routes apply. Returns { ok, bundle, message?, error? }.
 */
export function applySampleAction(bundle, action, now = Date.now()) {
  if (!bundle.viewer.canAward) {
    return { ok: false, error: 'Only executives and portfolio managers can do this.' };
  }
  switch (action.type) {
    case 'award': {
      const f = action.form || {};
      const to = bundle.members.find((m) => m.user_id === f.recipient_id && m.is_active);
      if (!to) return { ok: false, error: 'Recipient is not an active member' };
      if (!BADGE_TYPES.some((b) => b.key === f.badge_type)) {
        return { ok: false, error: 'Unknown badge type' };
      }
      const titleText = String(f.title || '').trim();
      if (!titleText) return { ok: false, error: 'A title is required.' };
      const rec = {
        id: `sample-recognition-new-${bundle.recognitions.length + 1}`,
        recipient_id: to.user_id,
        awarded_by: bundle.viewer.userId,
        badge_type: f.badge_type,
        title: titleText.slice(0, 120),
        reason: f.reason ? String(f.reason).slice(0, 600) : null,
        period: f.period ? String(f.period).slice(0, 40) : null,
        is_award: Boolean(f.is_award),
        auto_generated: false,
        pitch_id: null,
        created_at: new Date(now).toISOString(),
        is_demo: true,
      };
      return {
        ok: true,
        bundle: { ...bundle, recognitions: [rec, ...bundle.recognitions] },
        message: `${badgeOf(rec.badge_type).label} given to ${to.display_name}.`,
      };
    }
    case 'recompute':
      return {
        ok: true,
        bundle: { ...bundle, lastRecompute: new Date(now).toISOString() },
        message: `Recomputed ${bundle.ratings.length} members; ${bundle.ratings.filter((r) => r.rated_thesis_count > 0).length} with scored pitches. Ratings are unchanged: no pitch was scored since the last recompute.`,
      };
    case 'auto': {
      const period = currentQuarter(now);
      const res = pickAutoAwards({
        pitches: bundle.pitches,
        outcomes: bundle.outcomes,
        range: parseQuarter(period),
        now,
      });
      const have = new Set(
        bundle.recognitions
          .filter((r) => r.auto_generated && r.period === period)
          .map((r) => r.badge_type),
      );
      const add = [];
      const userOfMember = new Map(bundle.members.map((m) => [m.id, m.user_id]));
      if (res.best && !have.has('best_call')) {
        add.push({
          badge_type: 'best_call',
          recipient_id: userOfMember.get(res.best.pitch.analyst_member_id),
          title: `Best Call: ${res.best.pitch.ticker}`,
          reason: `Highest excess return over the market in ${period}: +${res.best.alpha.toFixed(1)}% on ${res.best.pitch.company_name}.`,
          pitch_id: res.best.pitch.id,
        });
      }
      if (res.accurate && !have.has('most_accurate')) {
        add.push({
          badge_type: 'most_accurate',
          recipient_id: userOfMember.get(res.accurate.memberId),
          title: 'Most Accurate Analyst',
          reason: `${res.accurate.hits} of ${res.accurate.total} pitches scored in ${period} beat the market.`,
          pitch_id: null,
        });
      }
      if (!add.length) {
        return {
          ok: true,
          bundle,
          message:
            res.scored === 0
              ? `No pitches were scored in ${period}.`
              : `Nothing new to award for ${period}: already awarded, or no pitch qualifies.`,
        };
      }
      const rows = add.map((a, i) => ({
        id: `sample-recognition-auto-${bundle.recognitions.length + i + 1}`,
        awarded_by: bundle.viewer.userId,
        period,
        is_award: false,
        auto_generated: true,
        created_at: new Date(now).toISOString(),
        is_demo: true,
        ...a,
      }));
      return {
        ok: true,
        bundle: { ...bundle, recognitions: sortRecent([...rows, ...bundle.recognitions]) },
        message: `Awarded ${rows.length} ${rows.length === 1 ? 'badge' : 'badges'} for ${period}.`,
      };
    }
    case 'weights': {
      const cur = bundle.weights[action.role];
      if (!cur) return { ok: false, error: 'Invalid role' };
      const next = { ...cur };
      for (const w of action.weights || []) {
        const v = Number(w.weight);
        if (!(w.category in cur) || !Number.isFinite(v) || v < 0 || v > 100) {
          return { ok: false, error: `Invalid weight for ${w.category}` };
        }
        next[w.category] = v;
      }
      return {
        ok: true,
        bundle: { ...bundle, weights: { ...bundle.weights, [action.role]: next } },
        message: 'Display weights saved.',
      };
    }
    default:
      return { ok: false, error: 'Unknown action' };
  }
}
