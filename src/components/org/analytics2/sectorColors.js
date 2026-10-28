// Sector → theme-token accent (no raw hex in JSX). Sector names are free-text
// from the data, so match on a normalized substring. Falls back to a muted
// token for anything unmapped (incl. slate "Materials", which has no brand token).
export function sectorColor(name) {
  const s = (name || '').toLowerCase();
  if (/tech|tmt|software|semi|information/.test(s)) return 'var(--emerald)';
  if (/health|pharma|bio/.test(s)) return 'var(--info)';
  if (/financ|bank|insur/.test(s)) return 'var(--purple)';
  if (/consumer|staple|retail/.test(s)) return 'var(--warning)';
  if (/energy|oil|utilit/.test(s)) return 'var(--cyan)';
  if (/industr|manufact/.test(s)) return 'var(--pink)';
  if (/material|metal|mining/.test(s)) return 'var(--text-muted)';
  return 'var(--text-muted)';
}
