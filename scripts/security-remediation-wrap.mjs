/**
 * Wrap API route handlers with withApiGuard (security remediation).
 * Run: node scripts/security-remediation-wrap.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const AUTH_TRUE = [
  'src/app/api/portfolio/route.js',
  'src/app/api/portfolio/value-series/route.js',
  'src/app/api/portfolio/week-series/route.js',
  'src/app/api/portfolio/mock-value-series/route.js',
  'src/app/api/trading/portfolio/route.js',
  'src/app/api/trade-notes/route.js',
  'src/app/api/mock-trades/route.js',
  'src/app/api/mock-portfolio/route.js',
  'src/app/api/debrief-items/route.js',
  'src/app/api/alpaca/account/route.js',
  'src/app/api/alpaca/fund/route.js',
  'src/app/api/alpaca/positions/route.js',
  'src/app/api/plaid/exchange-token/route.js',
  'src/app/api/plaid/holdings/route.js',
  'src/app/api/plaid/portfolio/route.js',
  'src/app/api/plaid/sync/route.js',
  'src/app/api/plaid/create-link-token/route.js',
  'src/app/api/plaid/update-link-token/route.js',
  'src/app/api/trading/create-account/route.js',
  'src/app/api/trading/orders/route.js',
  'src/app/api/snaptrade/brokers/route.js',
  'src/app/api/stripe/create-checkout-session/route.js',
  'src/app/api/stripe/customer-portal/route.js',
  'src/app/api/user/preferences/route.js',
  'src/app/api/elo/me/route.js',
  'src/app/api/elo/user/[userId]/route.js',
  'src/app/api/profile/main-track/route.js',
  'src/app/api/login-history/route.js',
  'src/app/api/personas/route.js',
  'src/app/api/account/reactivate/route.js',
  'src/app/api/learning/bookmarks/route.js',
  'src/app/api/learning/progress/route.js',
  'src/app/api/learning/streak/route.js',
  'src/app/api/learning/quests/daily/route.js',
  'src/app/api/rewards/checklist-task/route.js',
  'src/app/api/watchlists/route.js',
  'src/app/api/watchlists/[listId]/route.js',
  'src/app/api/watchlists/[listId]/items/route.js',
  'src/app/api/org/messages/route.js',
  'src/app/api/org/messages/[messageId]/read/route.js',
  'src/app/api/org/notification-prefs/route.js',
  'src/app/api/org/pinned-items/route.js',
  'src/app/api/org/pitches/route.js',
  'src/app/api/org/pitches/[pitchId]/route.js',
  'src/app/api/org/pitches/[pitchId]/vote/route.js',
  'src/app/api/org/pitches/[pitchId]/discussion/route.js',
  'src/app/api/org/pitches/[pitchId]/decision/route.js',
  'src/app/api/org/pitches/[pitchId]/stage/route.js',
  'src/app/api/org/pitches/[pitchId]/deliverables/route.js',
  'src/app/api/org/pitches/[pitchId]/history/route.js',
  'src/app/api/org/pitches/[pitchId]/supporting-data/route.js',
  'src/app/api/org/pitches/board/route.js',
  'src/app/api/org/archive/route.js',
  'src/app/api/org/archive/report/[period]/route.js',
  'src/app/api/org/archive/hindsight/[pitchId]/route.js',
  'src/app/api/org/archive/compare/route.js',
  'src/app/api/org/archive/by-ticker/[ticker]/route.js',
  'src/app/api/org/symbol-search/route.js',
  'src/app/api/org-trading/flags/route.js',
  'src/app/api/org-trading/flags/[flagId]/route.js',
  'src/app/api/org-trading/flags/[flagId]/messages/route.js',
  'src/app/api/org-trading/permissions/route.js',
  'src/app/api/market-opportunities/org/route.js',
  'src/app/api/community/profile/[userId]/route.js',
  'src/app/api/community/friends-activity/route.js',
  'src/app/api/community/conviction-map/route.js',
  'src/app/api/community/events/route.js',
  'src/app/api/community/pulse/route.js',
  'src/app/api/community/search/route.js',
  'src/app/api/messages/route.js',
  'src/app/api/messages/[conversationId]/route.js',
  'src/app/api/messages/friends/route.js',
  'src/app/api/echo/articles/route.js',
  'src/app/api/echo/comments/route.js',
  'src/app/api/echo/comments/[commentId]/route.js',
  'src/app/api/echo/like/route.js',
  'src/app/api/echo/subscribe/route.js',
  'src/app/api/echo/engagement/route.js',
  'src/app/api/echo/writer-application/route.js',
  'src/app/api/echo/admin/archive/route.js',
  'src/app/api/echo/admin/archived-articles/route.js',
  'src/app/api/echo/anon-track/route.js',
  'src/app/api/ai-analyzer/route.js',
  'src/app/api/ai-stock-analysis/route.js',
  'src/app/api/market-opportunities/route.js',
  'src/app/api/market-opportunities/analyze/route.js',
  'src/app/api/quants/correlation/route.js',
  'src/app/api/quants/pairs/route.js',
  'src/app/api/quants/indicators/[symbol]/route.js',
];

const AUTH_FALSE = [
  'src/app/api/fmp/commodities/route.js',
  'src/app/api/fmp/congress-latest/route.js',
  'src/app/api/fmp/crypto/route.js',
  'src/app/api/fmp/dcf-advanced/route.js',
  'src/app/api/fmp/house/route.js',
  'src/app/api/fmp/movers/route.js',
  'src/app/api/fmp/peers/route.js',
  'src/app/api/fmp/quote/route.js',
  'src/app/api/fmp/search/route.js',
  'src/app/api/fmp/sector-performance/route.js',
  'src/app/api/fmp/senate/route.js',
  'src/app/api/fmp/stock-stats/route.js',
  'src/app/api/alpha/bulk-quotes/route.js',
  'src/app/api/alpha/index/route.js',
  'src/app/api/alpha/movers/route.js',
  'src/app/api/alpha/news/route.js',
  'src/app/api/alpha/quote/route.js',
  'src/app/api/market-data/news/route.js',
  'src/app/api/market-data/route.js',
  'src/app/api/market-data/economic-calendar/route.js',
  'src/app/api/market-data/sector-detail/route.js',
  'src/app/api/market-data/billionaires/route.js',
  'src/app/api/market-data/city-news/route.js',
  'src/app/api/market-data/power-map-news/route.js',
  'src/app/api/market-data/stock-candles/route.js',
  'src/app/api/market-data/upcoming-events/route.js',
  'src/app/api/market/batch-quotes/route.js',
  'src/app/api/market/index-history/route.js',
  'src/app/api/market/index-week/route.js',
  'src/app/api/finnhub/[...endpoint]/route.js',
  'src/app/api/polygon/markets/route.js',
  'src/app/api/polymarket/markets/route.js',
  'src/app/api/polymarket/market/route.js',
  'src/app/api/polymarket/activity/route.js',
  'src/app/api/polymarket/profile/route.js',
  'src/app/api/polymarket/tags/route.js',
  'src/app/api/polymarket/user-search/route.js',
  'src/app/api/polymarket/builder-leaderboard/route.js',
  'src/app/api/polymarket/related-markets/route.js',
  'src/app/api/inside-capitol/bipartisan-trades/route.js',
  'src/app/api/inside-capitol/earnings-watch/route.js',
  'src/app/api/inside-capitol/unusual-volume/route.js',
  'src/app/api/politicians/top-performers/route.js',
  'src/app/api/kairos/correlations/route.js',
  'src/app/api/kairos/events/route.js',
  'src/app/api/kairos/weather/route.js',
  'src/app/api/comps/[symbol]/route.js',
  'src/app/api/earnings/analysis/[symbol]/route.js',
  'src/app/api/institutions/list/route.js',
  'src/app/api/locations/cities/route.js',
  'src/app/api/locations/countries/route.js',
  'src/app/api/news/alpha-vantage/poll/route.js',
  'src/app/api/news/city/route.js',
  'src/app/api/news/massive/poll/route.js',
  'src/app/api/community/trending-discussions/route.js',
  'src/app/api/community/trending-topics/route.js',
  'src/app/api/community/bull-bear/route.js',
  'src/app/api/community/narratives/route.js',
  'src/app/api/community/legendary-takes/route.js',
  'src/app/api/community/leaderboard/route.js',
  'src/app/api/leaderboard/route.js',
  'src/app/api/leaderboard/elo/route.js',
  'src/app/api/leaderboard/league/route.js',
  'src/app/api/leaderboard/stats/route.js',
  'src/app/api/learning/courses/route.js',
  'src/app/api/learning/courses/[courseId]/route.js',
  'src/app/api/learning/community-badges/route.js',
  'src/app/api/learning/financial-statement/route.js',
  'src/app/api/learning/friends-activity/route.js',
  'src/app/api/learning/leaderboard/route.js',
  'src/app/api/learning/ticker-snapshot/route.js',
  'src/app/api/learning/tracks/route.js',
  'src/app/api/empire/scores/route.js',
  'src/app/api/echo/article-statuses/route.js',
  'src/app/api/echo/authors/route.js',
  'src/app/api/isr/feed/route.js',
  'src/app/api/isr/polymarket-matches/route.js',
  'src/app/api/platform/aggregates/route.js',
  'src/app/api/platform-aggregates/route.js',
  'src/app/api/health/route.js',
  'src/app/api/health/earnings/route.js',
  'src/app/api/health/billing/route.js',
  'src/app/api/betting/live-games/route.js',
  'src/app/api/notifications/vapid-public-key/route.js',
  'src/app/api/alpaca/assets/route.js',
];

const STRICT_PUBLIC = [
  'src/app/api/newsletter/subscribe/route.js',
  'src/app/api/waitlist/route.js',
  'src/app/api/support/contact/route.js',
  'src/app/api/partner-application/documents/route.js',
  'src/app/api/partner-application/verify/route.js',
  'src/app/api/auth/activate-free/route.js',
];

const AUTH_PATTERNS = [
  /const\s+user\s*=\s*await\s+getAuthUser\s*\(\s*\w+\s*\)\s*;?\s*\n\s*if\s*\(\s*!user\s*\)\s*\{[\s\S]*?\}\s*\n?/g,
  /const\s+user\s*=\s*await\s+getAuthUser\s*\(\s*\w+\s*\)\s*;?\s*\n\s*if\s*\(\s*!user\s*\)\s*return\s+NextResponse\.json\([^)]+\)\s*;?\s*\n?/g,
  /const\s+supabase\s*=\s*createServerSupabase\s*\(\s*\)\s*;?\s*\n\s*const\s*\{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*await\s+supabase\.auth\.getUser\s*\(\s*\)\s*;?\s*\n\s*if\s*\(\s*!user\s*\)[\s\S]*?\n/g,
  /const\s*\{\s*data:\s*\{\s*user\s*\}\s*,\s*error:\s*authErr\s*\}\s*=\s*await\s+supabase\.auth\.getUser\s*\(\s*\)\s*;?\s*\n\s*if\s*\(\s*authErr\s*\|\|\s*!user\s*\)[\s\S]*?\n/g,
  /const\s*\{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*await\s+supabase\.auth\.getUser\s*\(\s*\)\s*;?\s*\n\s*if\s*\(\s*!user\s*\)[\s\S]*?\n/g,
  /const\s+supabase\s*=\s*getUserClient\s*\(\s*\)\s*;?\s*\n\s*const\s*\{\s*data:\s*\{\s*user\s*\}[\s\S]*?if\s*\(\s*authErr\s*\|\|\s*!user\s*\)[\s\S]*?\n/g,
  /const\s+user\s*=\s*await\s+getCurrentUser\s*\(\s*\w+\s*\)\s*;?\s*\n\s*if\s*\(\s*!user\s*\)[\s\S]*?\n/g,
  /\/\/ Resolve the authenticated user[\s\S]*?if\s*\(\s*!user\s*\)\s*\{[\s\S]*?\}\s*\n/g,
];

function findMatchingBrace(content, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function stripAuthBlocks(body) {
  let b = body;
  for (const pat of AUTH_PATTERNS) {
    b = b.replace(pat, '');
  }
  b = b.replace(/const\s+userId\s*=\s*user\.id\s*;?\s*\n/g, 'const userId = user.id;\n');
  return b;
}

function addGuardImport(content) {
  if (content.includes('withApiGuard')) return content;
  const lines = content.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i;
  }
  const guardImport = "import { withApiGuard } from '@/lib/api-guard';";
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, guardImport);
  } else {
    lines.unshift(guardImport);
  }
  return lines.join('\n');
}

function wrapExports(content, options) {
  const { requireAuth, strict } = options;
  const optsStr = strict
    ? '{ requireAuth: false, strict: true }'
    : requireAuth
      ? '{ requireAuth: true }'
      : '{ requireAuth: false }';
  const handlerArgs = requireAuth ? 'request, user, context' : 'request, context';
  const paramName = 'request';

  const methodRe =
    /export\s+async\s+function\s+(GET|POST|PATCH|DELETE|PUT)\s*\(\s*(\w+)?(?:\s*,\s*\{[^}]*\})?\s*\)\s*\{/g;
  let match;
  const replacements = [];

  while ((match = methodRe.exec(content)) !== null) {
    const method = match[1];
    const bodyStart = match.index + match[0].length;
    const closeBrace = findMatchingBrace(content, match.index + match[0].length - 1);
    if (closeBrace < 0) continue;
    let body = content.slice(bodyStart, closeBrace);
    if (requireAuth) body = stripAuthBlocks(body);
    replacements.push({
      start: match.index,
      end: closeBrace + 1,
      method,
      body: body.trim(),
    });
  }

  if (replacements.length === 0) return null;

  let result = content;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const r = replacements[i];
    const wrapped = `export const ${r.method} = withApiGuard(async (${handlerArgs}) => {\n${r.body}\n}, ${optsStr});`;
    result = result.slice(0, r.start) + wrapped + result.slice(r.end);
  }
  return result;
}

function processFile(relPath, options) {
  const full = path.join(root, relPath);
  if (!fs.existsSync(full)) {
    console.warn('SKIP missing:', relPath);
    return false;
  }
  let content = fs.readFileSync(full, 'utf8');
  if (content.includes('withApiGuard')) {
    console.log('SKIP already wrapped:', relPath);
    return false;
  }
  if (!/export\s+async\s+function\s+(GET|POST|PATCH|DELETE|PUT)\s*\(/.test(content)) {
    console.warn('SKIP no export async function:', relPath);
    return false;
  }
  const wrapped = wrapExports(content, options);
  if (!wrapped) {
    console.warn('SKIP wrap failed:', relPath);
    return false;
  }
  let out = addGuardImport(wrapped);
  fs.writeFileSync(full, out, 'utf8');
  console.log('OK', relPath);
  return true;
}

let ok = 0;
for (const f of AUTH_TRUE) if (processFile(f, { requireAuth: true })) ok++;
for (const f of AUTH_FALSE) if (processFile(f, { requireAuth: false })) ok++;
for (const f of STRICT_PUBLIC) if (processFile(f, { requireAuth: false, strict: true })) ok++;
console.log(`\nWrapped ${ok} files`);
