// src/lib/notifications/destination.js
// Where a notification opens, and the text it shows. Pure (no imports, no
// I/O), so the bell panel and scripts/check-notification-destination.mjs
// share one rulebook.
//
// A notification row has no link column. The destination is resolved, in
// order, from:
//   1. a "↳ /path" line the generator appends to `content`
//   2. the friend request it carries
//   3. its type and tickers
// and falls back to the notification center, so every card opens something.

const CENTER = { href: '/settings?tab=notifications', label: 'Notification center' };

/* App pages a "↳ /path" line may point at. Anything else is ignored, so a
   stored string can never send the user off-site or to an arbitrary route. */
const LINKABLE = [
  ['/company-research', 'Company research'],
  ['/market-analysis', 'Market analysis'],
  ['/watchlist', 'Watchlist'],
  ['/home-dashboard', 'Dashboard'],
  ['/home', 'Home'],
  ['/community', 'Community'],
  ['/learning-center', 'Learning center'],
  ['/trading', 'Trading'],
  ['/sonar', 'Sonar'],
  ['/ezana-echo', 'Ezana Echo'],
  ['/settings', 'Settings'],
];

const LINK_LINE = /(?:^|\n)\s*↳\s*(\S+)\s*$/u;
const SAFE_PATH = /^\/[A-Za-z0-9][A-Za-z0-9\-_/]*(?:\?[A-Za-z0-9\-_=&%.+~]*)?$/;
const TICKER = /^[A-Z][A-Z0-9.-]{0,9}$/;

function linkable(path) {
  if (typeof path !== 'string' || !SAFE_PATH.test(path)) return null;
  const pathname = path.split('?')[0];
  const hit = LINKABLE.find(([base]) => pathname === base || pathname.startsWith(`${base}/`));
  return hit ? { href: path, label: hit[1] } : null;
}

const research = (ticker) => ({
  href: `/company-research?q=${encodeURIComponent(ticker)}`,
  label: `${ticker} research`,
});

function soleTicker(n) {
  const list = Array.isArray(n?.tickers) ? n.tickers.filter(Boolean) : [];
  if (list.length !== 1) return null;
  const t = String(list[0]).toUpperCase();
  return TICKER.test(t) ? t : null;
}

/**
 * The page a notification opens.
 * @param {{ type?: string, content?: string, tickers?: string[], friendRequestId?: any }} n
 * @returns {{ href: string, label: string }}
 */
export function notificationDestination(n) {
  if (!n) return CENTER;

  const embedded = LINK_LINE.exec(String(n.content || ''));
  if (embedded) {
    const dest = linkable(embedded[1]);
    if (dest) return dest;
  }

  if (n.friendRequestId) return { href: '/community', label: 'Community' };

  const ticker = soleTicker(n);
  switch (n.type) {
    case 'watchlist':
      return ticker ? research(ticker) : { href: '/watchlist', label: 'Watchlist' };
    case 'portfolio_alerts':
      return ticker ? research(ticker) : { href: '/home-dashboard', label: 'Dashboard' };
    case 'market_news':
    case 'inside-the-capitol':
      return ticker ? research(ticker) : { href: '/market-analysis', label: 'Market analysis' };
    case 'community':
      return { href: '/community', label: 'Community' };
    case 'learning':
      return { href: '/learning-center', label: 'Learning center' };
    default:
      return ticker ? research(ticker) : CENTER;
  }
}

/* Emoji the generator prefixes to titles and summaries. The panel shows
   priority and direction in type, so they are dropped from displayed text. */
const DECOR =
  /[\u{1F534}\u{1F7E0}\u{1F7E1}\u{1F7E2}\u{26AA}\u{26AB}\u{1F4C8}\u{1F4C9}\u{1F4CA}]️?\s*/gu;

/** A notification's summary as shown: no "↳ /path" line, no marker emoji. */
export function notificationSummary(content) {
  return String(content || '')
    .replace(LINK_LINE, '')
    .replace(DECOR, '')
    .replace(/\s+/g, ' ')
    .trim();
}
