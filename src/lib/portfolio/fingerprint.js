/**
 * Deterministic account fingerprinting for cross-provider dedup.
 */
export function buildAccountFingerprint({ institutionName, accountMask, accountType }) {
  const inst = String(institutionName || '')
    .toLowerCase()
    .trim();
  const mask = String(accountMask || 'nomask')
    .toLowerCase()
    .trim();
  const type = String(accountType || 'unknown')
    .toLowerCase()
    .trim();
  return `${inst}::${mask}::${type}`;
}

export function canonicalizeInstitutionName(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/[\u2018\u2019']/g, '')
    .replace(/&\s*co\.?/gi, '')
    .replace(/\b(inc|llc|ltd|corp|corporation|incorporated)\b\.?/gi, '')
    .replace(/\((us|usa|na|n\.a\.)\)/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
