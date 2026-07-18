/**
 * Awarding-agency taxonomy — single source of truth shared by the rollup sync
 * (server-side normalization, stored as agency_bucket) and the client
 * legend/filters, so they never drift. Expanded from 6 → 14 named buckets +
 * Other. Colors are EXISTING theme tokens only (no hex, no new tokens); where 14
 * distinct strong hues aren't available the palette is reused sensibly.
 *
 * Token ↔ agency map (all defined in theme-variables.css):
 *   DoD --positive · DoE --warning · NASA --info · HHS --purple · VA --blue ·
 *   DHS --cyan · State --indigo · Treasury --gold · DOJ --negative ·
 *   USDA --emerald · DOT --orange · Interior --amber · Commerce --pink ·
 *   GSA --gold-champagne · Other --text-faint
 */
export const AGENCIES = {
  DoD: { label: 'DoD', color: 'var(--positive)' },
  DoE: { label: 'DoE', color: 'var(--warning)' },
  NASA: { label: 'NASA', color: 'var(--info)' },
  HHS: { label: 'HHS', color: 'var(--purple)' },
  VA: { label: 'VA', color: 'var(--blue)' },
  DHS: { label: 'DHS', color: 'var(--cyan)' },
  State: { label: 'State', color: 'var(--indigo)' },
  Treasury: { label: 'Treasury', color: 'var(--gold)' },
  DOJ: { label: 'DOJ', color: 'var(--negative)' },
  USDA: { label: 'USDA', color: 'var(--emerald)' },
  DOT: { label: 'DOT', color: 'var(--orange)' },
  Interior: { label: 'Interior', color: 'var(--amber)' },
  Commerce: { label: 'Commerce', color: 'var(--pink)' },
  GSA: { label: 'GSA', color: 'var(--gold-champagne)' },
  Other: { label: 'Other', color: 'var(--text-faint)' },
};

export const AGENCY_ORDER = [
  'DoD', 'DoE', 'NASA', 'HHS', 'VA', 'DHS', 'State', 'Treasury',
  'DOJ', 'USDA', 'DOT', 'Interior', 'Commerce', 'GSA', 'Other',
];

// First match wins. Ordered so specific agencies resolve before broad ones.
const RULES = [
  [/department of defense|dept\.?\s*of\s*defense|\bdod\b|\barmy\b|\bnavy\b|air force|marine corps|defense (logistics|advanced|threat|health|information)|darpa|\busaf\b|\bdla\b/i, 'DoD'],
  [/department of energy|\bdoe\b|national nuclear|\bnnsa\b/i, 'DoE'],
  [/\bnasa\b|aeronautics and space/i, 'NASA'],
  [/veterans affairs|veterans|\bva\b/i, 'VA'],
  [/homeland security|customs and border|border protection|coast guard|\bfema\b|\btsa\b|\bcbp\b|\bice\b|secret service|\bcisa\b/i, 'DHS'],
  [/department of state|state department|\busaid\b|agency for international development/i, 'State'],
  [/treasury|internal revenue|\birs\b|comptroller of the currency|\bfincen\b/i, 'Treasury'],
  [/department of justice|\bdoj\b|\bfbi\b|\bdea\b|bureau of prisons|\batf\b|\bmarshals?\b/i, 'DOJ'],
  [/agriculture|\busda\b|forest service|farm service/i, 'USDA'],
  [/transportation|\bdot\b|\bfaa\b|federal highway|federal aviation|federal railroad|maritime administration/i, 'DOT'],
  [/interior|national park|geological survey|\busgs\b|bureau of land|fish and wildlife|indian affairs|reclamation/i, 'Interior'],
  [/\bcommerce\b|\bnoaa\b|census|patent and trademark|\buspto\b|national institute of standards|\bnist\b/i, 'Commerce'],
  [/health and human|\bhhs\b|\bnih\b|\bcdc\b|\bfda\b|centers for (disease|medicare|medicaid)|\bcms\b|indian health|substance abuse/i, 'HHS'],
  [/general services|\bgsa\b/i, 'GSA'],
];

/** Raw awarding-agency name → canonical bucket. Server-normalized in the sync. */
export function normalizeAgency(name) {
  const s = String(name || '');
  for (const [re, bucket] of RULES) if (re.test(s)) return bucket;
  return 'Other';
}

export function agencyColor(bucket) {
  return (AGENCIES[bucket] || AGENCIES.Other).color;
}

export function agencyLabel(bucket) {
  return (AGENCIES[bucket] || AGENCIES.Other).label;
}
