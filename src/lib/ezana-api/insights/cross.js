/**
 * Cross-dimensional insights, pure (tested by scripts/check-ezana-api-cross.mjs).
 *
 * The composite's confirmation never produces a buy or sell call: it counts
 * how many dimensions lean one way by STATED rules and lists the rule each
 * one met, with the figure behind it.
 */

const n = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export const CONFIRMATION_RULES = [
  {
    dimension: 'congress',
    rule: 'Congressional flow score over 180 days is positive (bullish) or negative (bearish).',
  },
  {
    dimension: 'insider',
    rule: 'Net open-market insider buying over 90 days is positive (bullish) or negative (bearish).',
  },
  {
    dimension: 'institutional',
    rule: 'More 13F holders added than trimmed or exited last quarter (bullish), or the reverse (bearish), among at least 5 holders with a prior quarter on file.',
  },
  {
    dimension: 'contracts',
    rule: 'Federal award dollars rose (bullish) or fell (bearish) in the latest complete fiscal year.',
  },
  {
    dimension: 'patents',
    rule: 'Patent grants in the last 12 months rose (bullish) or fell (bearish) against the prior 12.',
  },
];

/** 13F holder changes summarized: counts per class and the net share change. */
export function holderChangeSummary(holders) {
  const out = { holders: 0, new: 0, added: 0, trimmed: 0, exited: 0, flat: 0, net_share_change: 0 };
  for (const h of holders || []) {
    out.holders += 1;
    const c = h.change;
    if (c === 'new') out.new += 1;
    else if (c === 'added' || c === 'doubled') out.added += 1;
    else if (c === 'trimmed') out.trimmed += 1;
    else if (c === 'exited') out.exited += 1;
    else if (c === 'flat') out.flat += 1;
    const now = n(h.shares);
    const prior = n(h.shares_prior);
    if (now != null && prior != null) out.net_share_change += now - prior;
    else if (c === 'new' && now != null) out.net_share_change += now;
  }
  out.net_share_change = Math.round(out.net_share_change);
  /* Holders whose change is known (a prior quarter on file). */
  out.comparable = out.new + out.added + out.trimmed + out.exited + out.flat;
  return out;
}

export const MIN_COMPARABLE_HOLDERS = 5;

const lean = (v) => (v > 0 ? 'bullish' : v < 0 ? 'bearish' : null);

/**
 * Apply the stated rules to the composite's sections. Each section may be
 * null. Returns { bullish, bearish, signals: [{ dimension, lean, rule, value }] };
 * a dimension with no data, or a figure of exactly zero, adds no signal.
 */
export function confirmation(sections) {
  const s = sections || {};
  const signals = [];
  const push = (dimension, value, detail) => {
    const l = lean(value);
    if (!l) return;
    const rule = CONFIRMATION_RULES.find((r) => r.dimension === dimension).rule;
    signals.push({ dimension, lean: l, rule, value, detail });
  };
  const flow = n(s.congress?.flow?.flow_score);
  if (flow != null) push('congress', flow, 'flow_score');
  const net90 = n(s.insider?.days_90?.net_value);
  if (net90 != null) push('insider', net90, 'net open-market value, USD');
  const h = s.institutional?.holder_changes;
  /* Too few holders with a prior quarter on file says nothing. */
  if (h && (h.comparable ?? 0) >= MIN_COMPARABLE_HOLDERS) {
    push('institutional', h.new + h.added - (h.trimmed + h.exited), 'added minus trimmed holders');
  }
  const yoy = n(s.contracts?.year_over_year?.change_usd);
  if (yoy != null) push('contracts', yoy, 'award change, USD');
  const pat = n(s.patents?.momentum?.change_pct);
  if (pat != null) push('patents', pat, 'grant change, %');
  return {
    bullish: signals.filter((x) => x.lean === 'bullish').length,
    bearish: signals.filter((x) => x.lean === 'bearish').length,
    signals,
  };
}

/**
 * Net open-market insider value per ticker from Form 4 rows
 * ({ ticker, code: 'P'|'S', value }). Returns Map ticker -> { buy_value,
 * sell_value, net_value, buys, sells }.
 */
export function insiderNetByTicker(rows) {
  const out = new Map();
  for (const r of rows || []) {
    const t = r.ticker ? String(r.ticker).toUpperCase() : null;
    if (!t || (r.code !== 'P' && r.code !== 'S')) continue;
    const f = out.get(t) || { buy_value: 0, sell_value: 0, net_value: 0, buys: 0, sells: 0 };
    const v = n(r.value) || 0;
    if (r.code === 'P') {
      f.buy_value += v;
      f.buys += 1;
    } else {
      f.sell_value += v;
      f.sells += 1;
    }
    f.net_value = f.buy_value - f.sell_value;
    out.set(t, f);
  }
  for (const f of out.values()) {
    f.buy_value = Math.round(f.buy_value);
    f.sell_value = Math.round(f.sell_value);
    f.net_value = Math.round(f.net_value);
  }
  return out;
}

/**
 * Tickers whose awards rose AND that had net open-market insider buying:
 * momentum rows ({ ticker, change_pct, change_usd, ... }) joined to the
 * insider map, sorted by award change % (largest first).
 */
export function contractToInsider(momentumRows, insiderNet) {
  return (momentumRows || [])
    .filter((m) => n(m.change_usd) > 0)
    .map((m) => ({ m, i: insiderNet.get(String(m.ticker).toUpperCase()) }))
    .filter(({ i }) => i && i.net_value > 0)
    .sort((a, b) => (n(b.m.change_pct) ?? -Infinity) - (n(a.m.change_pct) ?? -Infinity))
    .map(({ m, i }) => ({ ticker: String(m.ticker).toUpperCase(), awards: m, insider: i }));
}
