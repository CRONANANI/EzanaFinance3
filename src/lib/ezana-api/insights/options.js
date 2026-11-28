/**
 * Options exposure, pure (tested by scripts/check-ezana-api-options.mjs).
 *
 * Builds a strike x expiration grid from option contracts (open interest,
 * contract size) and their greeks (delta, gamma) for one underlying:
 *
 *   net_delta        sum(OI x delta x size)              delta-equivalent shares
 *   net_delta_usd    net_delta x spot                    USD
 *   call_delta       calls only, shares
 *   put_delta        puts only, shares (negative)
 *   gamma_usd_1pct   sum(OI x gamma x size x spot^2 x 1%), calls +, puts -
 *                    (the common "GEX" sign convention: USD of delta change
 *                    for a 1% move in the underlying)
 *   open_interest    sum(OI), calls and puts
 *
 * Open-interest weighting describes the delta held by option holders in
 * aggregate. It does not know who is long or short, so it is not dealer
 * positioning; the gamma sign follows a convention, not observed positions.
 *
 * A contract with open interest but no greek (Alpaca leaves greeks empty when
 * its model cannot fit) is left out of greek modes and counted in the cell's
 * `missing_greeks`. A cell with no contracts is null, never zero.
 */

const EXPOSURE_MODES = {
  net_delta: { unit: 'shares', label: 'Net delta exposure' },
  net_delta_usd: { unit: 'usd', label: 'Net delta exposure (USD)' },
  call_delta: { unit: 'shares', label: 'Call delta exposure' },
  put_delta: { unit: 'shares', label: 'Put delta exposure' },
  gamma_usd_1pct: { unit: 'usd_per_1pct', label: 'Gamma exposure (USD per 1% move)' },
  open_interest: { unit: 'contracts', label: 'Open interest' },
};

const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Parse an OCC option symbol: ROOT YYMMDD C|P STRIKE(8, x1000). */
export function parseOcc(symbol) {
  const m = /^([A-Z0-9.]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/.exec(String(symbol || ''));
  if (!m) return null;
  return {
    root: m[1],
    expiration: `20${m[2]}-${m[3]}-${m[4]}`,
    type: m[5] === 'C' ? 'call' : 'put',
    strike: Number(m[6]) / 1000,
  };
}

/**
 * Join contracts (open interest, size) with snapshots (greeks) by OCC symbol.
 * contracts: [{ symbol, type, strike_price, expiration_date, size, open_interest, open_interest_date }]
 * snapshots: { [symbol]: { greeks: { delta, gamma }, impliedVolatility, latestQuote: { t } } }
 */
export function joinChain(contracts, snapshots) {
  const out = [];
  for (const c of contracts || []) {
    const occ = parseOcc(c.symbol);
    const strike = num(c.strike_price) ?? occ?.strike ?? null;
    const expiration = c.expiration_date || occ?.expiration || null;
    const type = c.type || occ?.type || null;
    if (strike == null || !expiration || !type) continue;
    const snap = snapshots?.[c.symbol] || null;
    out.push({
      symbol: c.symbol,
      type,
      strike,
      expiration,
      size: num(c.size) ?? 100,
      open_interest: num(c.open_interest),
      open_interest_date: c.open_interest_date || null,
      delta: num(snap?.greeks?.delta),
      gamma: num(snap?.greeks?.gamma),
      iv: num(snap?.impliedVolatility),
      quote_at: snap?.latestQuote?.t || snap?.latestTrade?.t || null,
    });
  }
  return out;
}

function contribution(c, mode, spot) {
  const oi = c.open_interest;
  if (oi == null) return { value: null, missing: false };
  if (mode === 'open_interest') return { value: oi, missing: false };
  if (mode === 'call_delta' && c.type !== 'call') return { value: 0, missing: false, skip: true };
  if (mode === 'put_delta' && c.type !== 'put') return { value: 0, missing: false, skip: true };
  if (mode === 'gamma_usd_1pct') {
    if (c.gamma == null || spot == null) return { value: null, missing: true };
    const sign = c.type === 'call' ? 1 : -1;
    return { value: sign * oi * c.gamma * c.size * spot * spot * 0.01, missing: false };
  }
  if (c.delta == null) return { value: null, missing: true };
  const shares = oi * c.delta * c.size;
  if (mode === 'net_delta_usd') {
    return spot == null ? { value: null, missing: true } : { value: shares * spot, missing: false };
  }
  return { value: shares, missing: false };
}

/**
 * The exposure grid.
 * opts: { spot, asOf (YYYY-MM-DD), mode, strikes (count around spot), expirations (count) }
 * Returns { strikes (high to low), expirations (soonest first), cells[strike][expiry],
 *           by_strike, by_expiration, total, coverage, unit, label }.
 */
export function exposureGrid(
  chain,
  { spot, asOf, mode = 'net_delta', strikes = 8, expirations = 7 },
) {
  const m = EXPOSURE_MODES[mode] ? mode : 'net_delta';
  const live = (chain || []).filter((c) => c.expiration >= asOf);
  const exps = [...new Set(live.map((c) => c.expiration))].sort().slice(0, expirations);
  const inExp = live.filter((c) => exps.includes(c.expiration));

  /* The `strikes` listed strikes nearest the spot, shown high to low. */
  const allStrikes = [...new Set(inExp.map((c) => c.strike))];
  const ref =
    spot ??
    (allStrikes.length ? allStrikes.sort((a, b) => a - b)[Math.floor(allStrikes.length / 2)] : 0);
  const picked = allStrikes
    .sort((a, b) => Math.abs(a - ref) - Math.abs(b - ref) || a - b)
    .slice(0, strikes)
    .sort((a, b) => b - a);

  const key = (s, e) => `${s}|${e}`;
  const acc = new Map();
  let contracts = 0;
  let missing = 0;
  let noOi = 0;
  for (const c of inExp) {
    if (!picked.includes(c.strike)) continue;
    contracts += 1;
    if (c.open_interest == null) noOi += 1;
    const k = key(c.strike, c.expiration);
    if (!acc.has(k)) acc.set(k, { value: null, contracts: 0, missing_greeks: 0, open_interest: 0 });
    const cell = acc.get(k);
    cell.contracts += 1;
    cell.open_interest += c.open_interest ?? 0;
    const { value, missing: miss, skip } = contribution(c, m, spot);
    if (miss) {
      cell.missing_greeks += 1;
      missing += 1;
    }
    if (skip || value == null) continue;
    cell.value = (cell.value ?? 0) + value;
  }

  const round = (v) => (v == null ? null : Math.round(v));
  const cells = picked.map((s) =>
    exps.map((e) => {
      const c = acc.get(key(s, e));
      return c ? { ...c, value: round(c.value) } : null;
    }),
  );
  const sum = (vals) => {
    const xs = vals.filter((v) => v != null);
    return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0)) : null;
  };
  const byStrike = picked.map((s, i) => ({ strike: s, value: sum(cells[i].map((c) => c?.value)) }));
  const byExp = exps.map((e, j) => ({
    expiration: e,
    value: sum(cells.map((row) => row[j]?.value)),
  }));
  return {
    mode: m,
    unit: EXPOSURE_MODES[m].unit,
    label: EXPOSURE_MODES[m].label,
    spot,
    strikes: picked,
    expirations: exps,
    cells,
    by_strike: byStrike,
    by_expiration: byExp,
    total: sum(byStrike.map((r) => r.value)),
    coverage: {
      contracts,
      contracts_missing_greeks: missing,
      contracts_missing_open_interest: noOi,
      open_interest_date:
        inExp
          .map((c) => c.open_interest_date)
          .filter(Boolean)
          .sort()
          .slice(-1)[0] || null,
      latest_quote_at:
        inExp
          .map((c) => c.quote_at)
          .filter(Boolean)
          .sort()
          .slice(-1)[0] || null,
    },
  };
}
