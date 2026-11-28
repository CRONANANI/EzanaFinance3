/**
 * Sonar 6.5: cross-dataset entity identity and award attribution (Nov 28 2026).
 *
 * Reuses the identity rules Sonar already has instead of a competing system:
 *   - canonical security ids from composer/stages.js (cik:, else cusip:, else ticker:)
 *   - verified predecessor and successor CIKs from lib/sec/registrant-map.js, applied only
 *     to periods that end before the succession (no ticker-history look-ahead)
 *
 * Government awards name a recipient, often a subsidiary. An award joins a public company
 * only through a supported link, and the link is labelled:
 *   direct        the recipient resolved to the company itself (a ticker or CIK on the record)
 *   parent_group  the recipient is a verified subsidiary of the company (filed relationship)
 *   subsidiary    the company is a verified subsidiary of the recipient
 *   inferred      a link someone suggested without a filed source (shown, never joined)
 *   unresolved    no supported link; a similar name is never enough
 * Pure; unit-tested in scripts/check-sonar-6-5.mjs.
 */
import { securityId } from '../composer/stages.js';
import { tickerForFact } from '../../sec/registrant-map.js';

export const ATTRIBUTION = ['direct', 'parent_group', 'subsidiary', 'inferred', 'unresolved'];

/** The identity contract for one research entity. */
export function identity({
  type = 'company',
  ticker = null,
  cik = null,
  cusip = null,
  exchange = null,
  name = null,
  historicalNames = [],
  parentCik = null,
  effectiveFrom = null,
  effectiveTo = null,
  source = null,
  confidence = null,
  verified = false,
}) {
  return {
    type,
    id: securityId({ cik, cusip, ticker }),
    ticker: ticker ? String(ticker).toUpperCase() : null,
    cik: cik ? String(cik) : null,
    cusip: cusip || null,
    exchange,
    name,
    historicalNames,
    parentCik: parentCik ? String(parentCik) : null,
    effective: { from: effectiveFrom, to: effectiveTo },
    source,
    confidence,
    verified: Boolean(verified),
  };
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/* First significant word of a name (3+ characters), for the look-alike label only. */
const firstWord = (n) => {
  const w = String(n || '')
    .toUpperCase()
    .match(/[A-Z0-9]{3,}/);
  return w ? w[0] : `\u0000${Math.abs(String(n || '').length)}`;
};

/**
 * Attribute one award to one company.
 * @param award     { recipient, ticker?, cik?, uei? }
 * @param company   { ticker, cik }
 * @param relations [{ child: { name?, uei?, cik? }, parentCik, type, verified, source }]
 * -> { attribution, joins: boolean, basis }
 */
export function attributeAward(award, company, relations = []) {
  const t = String(company?.ticker || '').toUpperCase();
  if (
    (award.ticker && String(award.ticker).toUpperCase() === t) ||
    (award.cik && company.cik && String(award.cik) === String(company.cik))
  )
    return { attribution: 'direct', joins: true, basis: 'recipient resolved to the company' };
  for (const r of relations) {
    const childMatch =
      (r.child?.uei && award.uei && r.child.uei === award.uei) ||
      (r.child?.cik && award.cik && r.child.cik === award.cik);
    if (!childMatch) continue;
    if (String(r.parentCik) !== String(company.cik)) continue;
    /* Sonar 6.5.2: a relationship holds only for its own period. */
    const d = String(award.date || award.action_date || '').slice(0, 10);
    if (d && ((r.effectiveFrom && d < r.effectiveFrom) || (r.effectiveTo && d > r.effectiveTo)))
      return { attribution: 'inferred', joins: false, basis: `relationship not in effect on ${d}` };
    if (r.verified && r.source)
      return {
        attribution: 'parent_group',
        joins: true,
        basis: `verified subsidiary (${r.source})`,
      };
    return {
      attribution: 'inferred',
      joins: false,
      basis: 'relationship not verified from a filing',
    };
  }
  /* A similar name is reported as unresolved, never joined. */
  return {
    attribution: 'unresolved',
    joins: false,
    basis:
      norm(award.recipient).slice(0, 6) === norm(company.name).slice(0, 6) ||
      firstWord(award.recipient) === firstWord(company.name)
        ? 'similar name only; no supported relationship'
        : 'no supported relationship',
  };
}

/**
 * Award exposure for a company under a chosen scope: 'direct' counts direct awards only;
 * 'group' adds verified subsidiaries. Every included and excluded award is listed.
 */
export function awardExposure(awards = [], company, relations = [], { scope = 'direct' } = {}) {
  const included = [];
  const excluded = [];
  for (const a of awards) {
    const r = attributeAward(a, company, relations);
    const ok = r.joins && (scope === 'group' || r.attribution === 'direct');
    (ok ? included : excluded).push({ id: a.id, amount: a.amount ?? a.award_amount ?? null, ...r });
  }
  const total = included.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  return { scope, total: included.length ? total : null, included, excluded };
}

/**
 * The ticker that applied to a filer at a date, through verified successions only (6.4
 * registrant map). Returns { ticker, via } or null; never uses a later identity for an
 * earlier period.
 */
export function historicalTicker(cik, periodEnd, currentByCik, successions) {
  return tickerForFact(cik, periodEnd, currentByCik, successions);
}
