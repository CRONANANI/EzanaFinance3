/**
 * Date-aware security identity (Sonar 6.5, Nov 28 2026).
 *
 * The 6.4 registrant map (registrant-map.js) answers "which ticker applied to a FILER (CIK)
 * at a date", through verified successions. This module answers the other direction for
 * the few symbols where the ticker alone is ambiguous: "which legal entity did a TICKER
 * mean at a date", and "which other tickers has the SAME legal entity (same CIK) used".
 *
 * Two different situations, never confused:
 *   - a rename of one legal entity (same CIK, new symbol): SQ to XYZ, FB to META, PSKY to
 *     SKYD. Datasets keyed by either symbol describe the same company and may be read
 *     together, but only rows whose filing CIK matches the entity's CIK are joined.
 *   - a reused symbol (different CIKs over time): PARA was Paramount Global (CIK 813828)
 *     until the Paramount and Skydance combination closed on 2025-08-07; the symbol now
 *     belongs to Parabolic Technologies (CIK 1826011). A request for PARA resolves to the
 *     entity that held it at the research date. Paramount Global is NOT merged into
 *     Paramount Skydance (CIK 2041610): that succession is unverified in 6.4 (see
 *     docs/SONAR_6_4_INTEGRATION_COMPATIBILITY.md section 4), so no alias crosses it.
 *
 * Pure. No dataset reads. Unit-tested in scripts/check-sonar-6-5.mjs.
 */

const iso = (d) =>
  d instanceof Date ? d.toISOString().slice(0, 10) : String(d || '').slice(0, 10);

/**
 * Ticker history for symbols that need it. `from` / `to` are inclusive ISO dates; null is
 * open. `dateVerified: false` marks a boundary known only as a bound (the reassignment can
 * only follow the prior holder's last day).
 */
export const TICKER_HISTORY = Object.freeze([
  /* Renames of one legal entity (same CIK). */
  { ticker: 'SQ', cik: '1512673', name: 'Block, Inc.', to: '2025-01-20', renamedTo: 'XYZ' },
  { ticker: 'XYZ', cik: '1512673', name: 'Block, Inc.', from: '2025-01-21' },
  {
    ticker: 'FB',
    cik: '1326801',
    name: 'Meta Platforms, Inc.',
    to: '2022-06-08',
    renamedTo: 'META',
  },
  { ticker: 'META', cik: '1326801', name: 'Meta Platforms, Inc.', from: '2022-06-09' },
  {
    ticker: 'ANTM',
    cik: '1156039',
    name: 'Elevance Health, Inc.',
    to: '2022-06-27',
    renamedTo: 'ELV',
  },
  { ticker: 'ELV', cik: '1156039', name: 'Elevance Health, Inc.', from: '2022-06-28' },
  {
    ticker: 'RE',
    cik: '1095073',
    name: 'Everest Group, Ltd.',
    to: '2023-07-09',
    renamedTo: 'EG',
    dateVerified: false,
  },
  {
    ticker: 'EG',
    cik: '1095073',
    name: 'Everest Group, Ltd.',
    from: '2023-07-10',
    dateVerified: false,
  },
  /* Paramount Skydance (CIK 2041610): PSKY from the 2025-08-07 close; SEC's ticker list
     now files it as SKYD. The rename date is not on record here, so both symbols resolve
     to the one CIK at every date after the close. */
  {
    ticker: 'PSKY',
    cik: '2041610',
    name: 'Paramount Skydance Corporation',
    from: '2025-08-07',
    issuer: /paramount skydance|skydance/i,
    sameAs: 'SKYD',
    dateVerified: false,
  },
  {
    ticker: 'SKYD',
    cik: '2041610',
    name: 'Skydance',
    from: '2025-08-07',
    issuer: /skydance/i,
    sameAs: 'PSKY',
    dateVerified: false,
    /* the symbol SEC's company ticker list files today: the display ticker */
    current: true,
  },
  /* A reused symbol: two legal entities. */
  {
    ticker: 'PARA',
    cik: '813828',
    name: 'Paramount Global',
    to: '2025-08-06',
    issuer: /paramount global|paramount/i,
    reused: true,
    source: 'Paramount and Skydance combination closed 2025-08-07 (0001193125-25-175046)',
  },
  {
    ticker: 'PARA',
    cik: '1826011',
    name: 'Parabolic Technologies',
    from: '2025-08-07',
    issuer: /parabolic/i,
    reused: true,
    dateVerified: false,
  },
]);

const inRange = (h, d) => (!h.from || d >= h.from) && (!h.to || d <= h.to);

/**
 * The legal entity a ticker meant at a date.
 * -> { ticker, cik, name, issuer, lookupTickers: [symbols of the same CIK], basis, dateVerified }
 *    or null when the symbol has no recorded history (the caller uses the symbol as given).
 */
export function resolveTicker(raw, { asOf = new Date() } = {}) {
  const t = String(raw || '')
    .toUpperCase()
    .trim();
  const d = iso(asOf);
  const rows = TICKER_HISTORY.filter((h) => h.ticker === t);
  if (!rows.length) return null;
  const hit = rows.find((h) => inRange(h, d));
  if (!hit) {
    /* Before the symbol existed (or a renamed symbol asked after the rename). A renamed
       symbol continues as its successor symbol of the same CIK. */
    const renamed = rows.find((h) => h.renamedTo && h.to && d > h.to);
    const next = renamed ? resolveTicker(renamed.renamedTo, { asOf }) : null;
    if (next)
      return {
        ...next,
        requested: t,
        basis: `${t} was renamed ${renamed.renamedTo} (same CIK ${renamed.cik})`,
      };
    return {
      requested: t,
      ticker: t,
      cik: null,
      name: null,
      issuer: null,
      lookupTickers: [t],
      basis: `${t} had no recorded holder on ${d}`,
      dateVerified: false,
    };
  }
  const sameCik = [
    ...new Set(TICKER_HISTORY.filter((h) => h.cik === hit.cik).map((h) => h.ticker)),
  ];
  /* A reused symbol is looked up as itself only: other entities' symbols never join. */
  const lookupTickers = hit.reused ? [t] : sameCik;
  return {
    requested: t,
    ticker: t,
    cik: hit.cik,
    name: hit.name,
    issuer: hit.issuer || null,
    lookupTickers,
    basis: hit.reused
      ? `${t} on ${d} is ${hit.name} (CIK ${hit.cik}); the symbol has been held by more than one company`
      : sameCik.length > 1
        ? `${sameCik.join(' and ')} are symbols of one company (CIK ${hit.cik})`
        : `${t} is ${hit.name}`,
    dateVerified: hit.dateVerified !== false,
  };
}

/** Every symbol to query for a ticker at a date (itself first). */
export function lookupTickers(raw, opts) {
  const r = resolveTicker(raw, opts);
  const t = String(raw || '')
    .toUpperCase()
    .trim();
  return r ? [t, ...r.lookupTickers.filter((x) => x !== t)] : [t];
}

/**
 * Keep only security-master candidates that belong to the entity the ticker meant at the
 * date, when the history records an issuer pattern and the candidate carries a name. A
 * candidate without a name is kept (nothing to test it against).
 */
export function candidatesForEntity(raw, candidates = [], opts) {
  const r = resolveTicker(raw, opts);
  if (!r?.issuer) return candidates;
  return candidates.filter((c) => !c?.name || r.issuer.test(String(c.name)));
}

/* ── historical trades (Sonar 6.5.1) ──────────────────────────────────────────────── */

const TICKER_OK = /^[A-Z][A-Z0-9.]{0,9}$/;
const reusedHolders = (t) => TICKER_HISTORY.filter((h) => h.ticker === t && h.reused);

/**
 * The security a dated trade disclosure refers to, by its TRANSACTION date (never the
 * filing date when the transaction date is present). A reused symbol resolves only to a
 * holder whose period is verified for that date; otherwise the trade is unresolved and is
 * never attributed to the symbol's current holder.
 *
 * @param trade  { ticker, transaction_date?, transaction_date_start?, transaction_date_end?,
 *                 disclosure_date?, id?, source_url? }
 * @param opts   { now, successions: Map from registrant-map indexSuccessions (optional) }
 * -> { status: 'resolved'|'unresolved', ticker, cik, name, currentSecurity, basis,
 *      dateUncertain, registrantChange, source }
 */
export function tradeSecurity(trade, { now = new Date(), successions = null } = {}) {
  const ticker = String(trade?.ticker || '')
    .toUpperCase()
    .trim();
  const source = {
    id: trade?.id ?? null,
    disclosureDate: trade?.disclosure_date || null,
    url: trade?.source_url || null,
    filedTicker: trade?.ticker ?? null,
  };
  const out = (status, extra) => ({
    status,
    ticker: ticker || null,
    cik: null,
    name: null,
    currentSecurity: false,
    dateUncertain: false,
    registrantChange: null,
    source,
    ...extra,
  });
  if (!ticker || !TICKER_OK.test(ticker))
    return out('unresolved', { basis: 'the disclosure carries no usable ticker' });
  const held = reusedHolders(ticker);
  const start = trade?.transaction_date_start || trade?.transaction_date || null;
  const end = trade?.transaction_date_end || trade?.transaction_date || null;
  if (!held.length) {
    /* Not a reused symbol: the ticker as filed. A verified succession (changed CIK, same
       security) is noted, never used to move the trade to another security. */
    let registrantChange = null;
    if (successions && start) {
      for (const [pred, list] of successions)
        for (const s of list)
          if (s.ticker === ticker && start < s.effective)
            registrantChange = {
              predecessorCik: pred,
              successorCik: s.successorCik,
              effective: s.effective,
            };
    }
    const r = resolveTicker(ticker, { asOf: start || now });
    return out('resolved', {
      cik: r?.cik || null,
      name: r?.name || null,
      currentSecurity: true,
      basis: r?.basis || 'ticker as filed; no reuse of this symbol on record',
      registrantChange,
    });
  }
  if (!start)
    return out('unresolved', {
      basis: `${ticker} has been held by more than one company and the disclosure has no transaction date`,
    });
  const holderAt = (d) => held.find((h) => inRange(h, d) && h.dateVerified !== false) || null;
  const a = holderAt(String(start).slice(0, 10));
  const b = holderAt(String(end).slice(0, 10));
  if (!a || !b || a.cik !== b.cik)
    return out('unresolved', {
      basis: `${ticker} on ${start}${end !== start ? ` to ${end}` : ''} cannot be tied to a verified holder (the symbol was reassigned; the new holder's start date is not verified)`,
      dateUncertain: end !== start,
    });
  const current = held.find((h) => inRange(h, iso(now)));
  return out('resolved', {
    cik: a.cik,
    name: a.name,
    currentSecurity: Boolean(current && current.cik === a.cik),
    basis: `${ticker} on ${start} was ${a.name} (CIK ${a.cik})`,
    dateUncertain: end !== start,
  });
}

/**
 * One entry per legal entity in a ticker list (CIK-keyed), for universes such as
 * ticker_sectors that list a company under its former and current symbols. The kept symbol
 * is the one marked current; the others are reported as aliases. Symbols without history
 * pass through unchanged.
 * -> { tickers: string[], merged: [{ kept, dropped: [], cik }] }
 */
export function dedupeByEntity(tickers = [], { asOf = new Date() } = {}) {
  const byCik = new Map();
  const out = [];
  const merged = [];
  for (const raw of tickers) {
    const t = String(raw || '').toUpperCase();
    const r = resolveTicker(t, { asOf });
    if (!r?.cik || r.lookupTickers.length < 2) {
      out.push(t);
      continue;
    }
    const prev = byCik.get(r.cik);
    if (!prev) {
      byCik.set(r.cik, { idx: out.length, symbols: [t] });
      out.push(t);
      continue;
    }
    prev.symbols.push(t);
  }
  for (const [cik, e] of byCik) {
    if (e.symbols.length < 2) continue;
    const current =
      e.symbols.find((s) =>
        TICKER_HISTORY.some((h) => h.ticker === s && h.cik === cik && h.current),
      ) || e.symbols[0];
    out[e.idx] = current;
    merged.push({ kept: current, dropped: e.symbols.filter((s) => s !== current), cik });
  }
  return { tickers: out, merged };
}
