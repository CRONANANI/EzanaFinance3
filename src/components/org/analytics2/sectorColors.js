// Sector → theme-token accent (no raw hex in JSX). Sector names are free-text
// from the data, so match on a normalized substring. Falls back to a muted
// token for anything unmapped (incl. slate "Materials", which has no brand token).
export function sectorColor(name) {
  const s = (name || '').toLowerCase();
  if (/tech|tmt|software|semi|information/.test(s)) return 'var(--emerald, #10b981)';
  if (/health|pharma|bio/.test(s)) return 'var(--info, #3b82f6)';
  if (/financ|bank|insur/.test(s)) return 'var(--purple, #a78bfa)';
  if (/consumer|staple|retail/.test(s)) return 'var(--warning, #f59e0b)';
  if (/energy|oil|utilit/.test(s)) return 'var(--cyan, #06b6d4)';
  if (/industr|manufact/.test(s)) return 'var(--pink, #ec4899)';
  if (/material|metal|mining/.test(s)) return 'var(--text-muted, #64748b)';
  return 'var(--text-muted, #64748b)';
}
