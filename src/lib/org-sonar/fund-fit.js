/**
 * Sonar for organizations: "Should our fund invest?" (fund fit research,
 * Nov 2026).
 *
 * An org member asks whether the fund should invest in a company. Sonar
 * runs deep research on the company and answers for the fund: a stance
 * (invest, watch, pass), the catalysts and headwinds, and whether the
 * company falls inside the fund's thesis and mandate.
 *
 * The mandate checks here are deterministic and come first: the fund's IPS
 * rules (prohibited tickers, position and sector limits, the number of
 * positions) and the mandate the executives wrote (focus and excluded
 * sectors, a minimum market capitalization). The IPS engine stays the
 * authority: a blocking failure makes the stance 'pass' whatever the
 * written assessment says, and Sonar never sizes a position or sets a
 * price target. The committee decides.
 *
 * Pure and client-safe. Unit-tested in scripts/check-org-sonar.mjs.
 */

/** "Should our fund invest in NVIDIA?", "Does AMD fit our mandate?" */
export const FUND_FIT_RE =
  /\b(?:should|would|could|can|do|does)\s+(?:our|the|my|this)\s+(?:fund|portfolio|council|smif|team|club)\b[^?]{0,80}\b(?:invest|buy|own|add|hold|initiate|take a position|allocate)\b|\b(?:fit|fits|match|matches|belong)\s+(?:in\s+)?(?:our|the)\s+(?:fund|portfolio|mandate|thesis|ips|investment policy)\b|\bfund\s+fit\b/i;

export function isFundFitQuestion(text) {
  return FUND_FIT_RE.test(String(text || ''));
}

export const STANCES = ['invest', 'watch', 'pass'];
export const FITS = ['fits', 'partial', 'outside'];
export const CHECK_STATUS = ['pass', 'warn', 'fail', 'unknown', 'info'];

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Does a company's sector or industry match one of `list`? */
export function sectorMatch(company, list = []) {
  const hay = [norm(company?.sector), norm(company?.industry)].filter(Boolean);
  if (!hay.length) return null;
  return (
    list
      .map(norm)
      .filter(Boolean)
      .find((s) => hay.some((h) => h.includes(s) || s.includes(h))) || false
  );
}

export function usdShort(n) {
  if (!Number.isFinite(n)) return null;
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${Math.round(n)}`;
}

const pctOf = (rule) => Number(rule?.value?.pct ?? rule?.value?.max_pct ?? rule?.value?.max);

/**
 * The fund's deterministic checks for one company.
 * @param {object} fund  loadFundContext() output
 * @param {{ ticker: string, name?: string, sector?: string, industry?: string, marketCap?: number }} company
 * @returns {Array<{ id, label, status, detail, blocking }>}
 */
export function mandateChecks(fund, company) {
  const out = [];
  const ticker = String(company?.ticker || '').toUpperCase();
  const rules = Array.isArray(fund?.ips) ? fund.ips : [];
  const holdings = Array.isArray(fund?.holdings) ? fund.holdings : [];
  const held = holdings.find((h) => String(h.ticker || '').toUpperCase() === ticker) || null;

  for (const r of rules.filter((x) => x.type === 'prohibited_ticker')) {
    if (String(r.value?.ticker || '').toUpperCase() !== ticker) continue;
    const block = (r.value?.severity || 'block') === 'block';
    out.push({
      id: `ips_prohibited_${ticker}`,
      label: 'IPS: prohibited security',
      status: block ? 'fail' : 'warn',
      detail: `${ticker} is on the fund's prohibited list${r.label ? ` (${r.label})` : ''}.`,
      blocking: block,
    });
  }

  const excluded = fund?.excludedSectors || [];
  if (excluded.length) {
    const hit = sectorMatch(company, excluded);
    if (hit === null) {
      out.push({
        id: 'mandate_excluded',
        label: 'Mandate: excluded sectors',
        status: 'unknown',
        detail: 'The company sector could not be read, so the excluded sectors were not checked.',
        blocking: false,
      });
    } else {
      out.push({
        id: 'mandate_excluded',
        label: 'Mandate: excluded sectors',
        status: hit ? 'fail' : 'pass',
        detail: hit
          ? `${company.sector || company.industry} is excluded by the mandate (${hit}).`
          : `Not in an excluded sector (${excluded.join(', ')}).`,
        blocking: Boolean(hit),
      });
    }
  }

  const focus = fund?.focusSectors || [];
  if (focus.length) {
    const hit = sectorMatch(company, focus);
    out.push({
      id: 'mandate_focus',
      label: 'Mandate: focus sectors',
      status: hit === null ? 'unknown' : hit ? 'pass' : 'warn',
      detail:
        hit === null
          ? 'The company sector could not be read.'
          : hit
            ? `${company.sector || company.industry} is a focus sector.`
            : `${company.sector || company.industry} is outside the focus sectors (${focus.join(', ')}).`,
      blocking: false,
    });
  }

  const minCap = Number(fund?.minMarketCapMusd);
  if (Number.isFinite(minCap) && minCap > 0) {
    const cap = Number(company?.marketCap);
    out.push({
      id: 'mandate_min_cap',
      label: 'Mandate: minimum market capitalization',
      status: !Number.isFinite(cap) ? 'unknown' : cap >= minCap * 1e6 ? 'pass' : 'fail',
      detail: !Number.isFinite(cap)
        ? `Market capitalization was not available; the minimum is ${usdShort(minCap * 1e6)}.`
        : `Market capitalization ${usdShort(cap)} against a minimum of ${usdShort(minCap * 1e6)}.`,
      blocking: Number.isFinite(cap) && cap < minCap * 1e6,
    });
  }

  for (const r of rules.filter((x) => x.type === 'max_positions')) {
    const max = Number(r.value?.max);
    if (!Number.isFinite(max)) continue;
    const n = holdings.length;
    const full = !held && n >= max;
    out.push({
      id: 'ips_max_positions',
      label: 'IPS: number of positions',
      status: full ? (r.value?.severity === 'block' ? 'fail' : 'warn') : 'pass',
      detail: held
        ? `Already held; the fund has ${n} of at most ${max} positions.`
        : `The fund has ${n} of at most ${max} positions${full ? ', so a new one needs an exit first' : ''}.`,
      blocking: full && r.value?.severity === 'block',
    });
  }

  for (const r of rules.filter((x) => x.type === 'max_position_pct')) {
    const max = pctOf(r);
    if (!Number.isFinite(max)) continue;
    const w = held?.weightPct;
    out.push({
      id: 'ips_max_position_pct',
      label: 'IPS: position size limit',
      status: Number.isFinite(w) && w >= max ? 'warn' : 'info',
      detail: Number.isFinite(w)
        ? `Held at ${w.toFixed(1)}% of the fund; a position is capped at ${max}%.`
        : `A position is capped at ${max}% of the fund.`,
      blocking: false,
    });
  }

  for (const r of rules.filter((x) => x.type === 'max_sector_pct')) {
    const max = pctOf(r);
    const sector = String(r.value?.sector || company?.sector || '');
    if (!Number.isFinite(max)) continue;
    const same = holdings.filter((h) => norm(h.sector) && norm(h.sector) === norm(company?.sector));
    const w = same.reduce((s, h) => s + (Number(h.weightPct) || 0), 0);
    const applies = !r.value?.sector || norm(r.value.sector) === norm(company?.sector);
    if (!applies) continue;
    out.push({
      id: `ips_max_sector_${norm(sector).replace(/ /g, '_') || 'any'}`,
      label: 'IPS: sector limit',
      status: w >= max ? (r.value?.severity === 'block' ? 'fail' : 'warn') : 'pass',
      detail: `${company?.sector || 'This sector'} is ${w.toFixed(1)}% of the fund against a limit of ${max}%.`,
      blocking: w >= max && r.value?.severity === 'block',
    });
  }

  if (held) {
    out.push({
      id: 'held',
      label: 'Current holding',
      status: 'info',
      detail: Number.isFinite(held.weightPct)
        ? `The fund already holds ${ticker} (${held.weightPct.toFixed(1)}% of the fund).`
        : `The fund already holds ${ticker}.`,
      blocking: false,
    });
  }
  return out;
}

/** The mandate fit the checks alone support. */
export function fitFromChecks(checks = []) {
  if (checks.some((c) => c.blocking || c.status === 'fail')) return 'outside';
  if (checks.some((c) => c.status === 'warn' || c.status === 'unknown')) return 'partial';
  return 'fits';
}

/** The evidence record the written assessment cites for the mandate. */
export function mandateRecord(fund, company, checks) {
  const lines = checks.map((c) => `${c.label}: ${c.status}. ${c.detail}`);
  const bits = [
    fund?.thesis
      ? `Investment thesis: ${String(fund.thesis).slice(0, 700)}`
      : 'No written investment thesis.',
    fund?.style ? `Style: ${fund.style}.` : null,
    fund?.horizon ? `Horizon: ${fund.horizon}.` : null,
    fund?.universe ? `Universe: ${String(fund.universe).slice(0, 200)}.` : null,
    fund?.benchmark ? `Benchmark: ${fund.benchmark}.` : null,
    ...lines,
  ].filter(Boolean);
  return {
    kind: 'record',
    title: `${fund?.fundName || 'The fund'}: mandate and IPS check for ${company?.ticker}`,
    text: bits.join(' '),
    entities: [company?.ticker].filter(Boolean),
    category: 'ezana_datasets',
    reliability: 1,
    data: { checks, fit: fitFromChecks(checks) },
  };
}

/** The fund summary the research spec carries (no holdings detail). */
export function fundSpec(fund) {
  if (!fund) return null;
  return {
    name: fund.fundName || fund.name || 'The fund',
    thesis: fund.thesis ? String(fund.thesis).slice(0, 1200) : null,
    universe: fund.universe || null,
    horizon: fund.horizon || null,
    style: fund.style || null,
    benchmark: fund.benchmark || null,
    focusSectors: fund.focusSectors || [],
    excludedSectors: fund.excludedSectors || [],
    minMarketCapMusd: fund.minMarketCapMusd ?? null,
    positions: Array.isArray(fund.holdings) ? fund.holdings.length : null,
  };
}

/** Clean mandate fields from an executive's PATCH body (fund config). */
export function cleanMandate(body = {}) {
  const out = {};
  const text = (v, max) => {
    const s = String(v ?? '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
      .trim()
      .slice(0, max);
    return s || null;
  };
  const list = (v) =>
    [
      ...new Set(
        (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => text(x, 60)).filter(Boolean),
      ),
    ].slice(0, 20);
  if ('investment_thesis' in body) out.investment_thesis = text(body.investment_thesis, 4000);
  if ('mandate_universe' in body) out.mandate_universe = text(body.mandate_universe, 300);
  if ('mandate_horizon' in body) out.mandate_horizon = text(body.mandate_horizon, 80);
  if ('investment_style' in body) out.investment_style = text(body.investment_style, 80);
  if ('focus_sectors' in body) out.focus_sectors = list(body.focus_sectors);
  if ('excluded_sectors' in body) out.excluded_sectors = list(body.excluded_sectors);
  if ('min_market_cap_musd' in body) {
    const n = Number(body.min_market_cap_musd);
    out.min_market_cap_musd =
      body.min_market_cap_musd === '' ||
      body.min_market_cap_musd === null ||
      !Number.isFinite(n) ||
      n < 0
        ? null
        : Math.min(n, 10_000_000);
  }
  return out;
}
