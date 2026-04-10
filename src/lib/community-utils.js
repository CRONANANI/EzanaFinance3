/** Display name → initials (max 2 chars). */
export function getInitials(displayName, fallbackEmail) {
  const s = (displayName || '').trim();
  if (s) {
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return s.slice(0, 2).toUpperCase();
  }
  const e = (fallbackEmail || '').split('@')[0];
  return e ? e.slice(0, 2).toUpperCase() : '?';
}

export function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

/** Extract $TICKER or uppercase 2–5 letter token from text. */
export function extractTickerFromContent(text) {
  if (!text) return null;
  const m = text.match(/\$([A-Z]{1,5})\b/i);
  if (m) return m[1].toUpperCase();
  return null;
}

const EMBED_PERIODS = new Set(['1D', '1W', '1M', '3M', '1Y']);

/**
 * Normalize community post ticker_embed JSON (legacy single-symbol or multi-symbol, max 3).
 * @returns {{ period: string, symbols: { symbol: string, highlight_price: number | null }[] } | null}
 */
export function normalizeTickerEmbed(embed) {
  if (!embed || typeof embed !== 'object') return null;
  const period = EMBED_PERIODS.has(embed.period) ? embed.period : '1M';
  const symbols = [];
  if (Array.isArray(embed.symbols)) {
    for (const s of embed.symbols.slice(0, 3)) {
      const sym = String(s?.symbol || '')
        .toUpperCase()
        .trim();
      if (!sym) continue;
      const hp =
        typeof s.highlight_price === 'number' && Number.isFinite(s.highlight_price) ? s.highlight_price : null;
      symbols.push({ symbol: sym, highlight_price: hp });
    }
  } else if (embed.symbol) {
    const sym = String(embed.symbol)
      .toUpperCase()
      .trim();
    const hp =
      typeof embed.highlight_price === 'number' && Number.isFinite(embed.highlight_price)
        ? embed.highlight_price
        : null;
    if (sym) symbols.push({ symbol: sym, highlight_price: hp });
  }
  if (!symbols.length) return null;
  return { period, symbols };
}
