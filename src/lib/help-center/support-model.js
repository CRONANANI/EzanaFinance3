/**
 * Support centre model: pure functions that shape what the User Support and
 * Partner Support landing pages render (src/components/help-center/
 * SupportCenter.jsx). No React, no fetching. Tested in
 * scripts/check-support-center.mjs.
 *
 * Source of truth for content is src/lib/help-center-content.js. Matches for
 * a question come from the in-repo lexical index (help-center-search.js),
 * the same index the Ask endpoint falls back to, so rail counts, Keep
 * reading and Related articles never depend on the network. The AI answer
 * and its sources come from /api/help-center/ask.
 */
import {
  USER_CATEGORIES,
  PARTNER_CATEGORIES,
  USER_ARTICLES,
  PARTNER_ARTICLES,
} from '../help-center-content.js';
import { htmlToText, searchHelp } from '../help-center-search.js';

const WPM = 200;

/* Bootstrap Icons for the content module's icon names (which were lucide
   names). Brand rule: Bootstrap Icons only. Unknown names get the book. */
export const BI_ICON = {
  BookOpen: 'bi-book',
  Activity: 'bi-bank',
  Wallet: 'bi-wallet2',
  Bookmark: 'bi-bell',
  BarChart3: 'bi-bar-chart',
  Shield: 'bi-shield',
  CreditCard: 'bi-credit-card',
  Users: 'bi-people',
  GraduationCap: 'bi-mortarboard',
  Globe2: 'bi-globe',
  Building2: 'bi-diagram-3',
  Scale: 'bi-scales',
  FileText: 'bi-file-earmark-text',
  Repeat: 'bi-arrow-repeat',
  LayoutDashboard: 'bi-grid-1x2',
  Code2: 'bi-code-slash',
  LifeBuoy: 'bi-life-preserver',
};

export const AUDIENCES = {
  user: {
    id: 'user',
    base: '/help-center/user',
    title: 'User Support',
    eyebrow: 'HELP CENTER · USER SUPPORT',
    contact: 'mailto:contact@ezana.world',
    contactLabel: 'Contact Support',
    tryChips: [
      'Connect a brokerage',
      'Export my portfolio',
      'Congressional data',
      'Cancel my plan',
    ],
    /* The three most-opened categories. Configured until view analytics
       per category exist; ids from help-center-content.js. */
    startHere: ['getting-started', 'portfolio', 'congressional-trading'],
    faqs: [
      'How do I connect my brokerage account?',
      'What is congressional trading data?',
      'Can I export my portfolio data?',
      'How do I contact support?',
    ],
  },
  partner: {
    id: 'partner',
    base: '/help-center/partner',
    title: 'Partner Support',
    eyebrow: 'HELP CENTER · PARTNER SUPPORT',
    contact: 'mailto:partners@ezana.world',
    contactLabel: 'Contact partner support',
    tryChips: ['Invite team members', 'Seats and roles', 'SSO setup', 'Billing for organisations'],
    startHere: ['onboarding', 'dashboard', 'copy-trading'],
    faqs: [
      'How do I join the partner program?',
      'What commission do partners earn?',
      'Can I use the Ezana API for my own product?',
      'How do I contact partner support?',
    ],
  },
};

const CATALOG = {
  user: { cats: USER_CATEGORIES, arts: USER_ARTICLES },
  partner: { cats: PARTNER_CATEGORIES, arts: PARTNER_ARTICLES },
};

export function audienceConfig(audience) {
  return AUDIENCES[audience] || AUDIENCES.user;
}

/** Minutes at 200 words per minute, never below 1. */
export function readMinutes(html) {
  const words = htmlToText(String(html || ''))
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WPM));
}

/** One article, resolved by slug, with its url and read time. Null if unknown. */
export function articleMeta(audience, slug) {
  const { arts } = CATALOG[audience] || CATALOG.user;
  const a = arts[slug];
  if (!a) return null;
  const cfg = audienceConfig(audience);
  return {
    audience,
    slug,
    title: a.title,
    category: a.category || null,
    url: `${cfg.base}/article/${slug}`,
    readMinutes: readMinutes(a.content),
    updatedAt: a.updatedAt || null,
  };
}

/** Every category for the audience in canonical order, with counts and icons. */
export function categoriesFor(audience) {
  const { cats } = CATALOG[audience] || CATALOG.user;
  const cfg = audienceConfig(audience);
  return cats.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    icon: BI_ICON[c.iconName] || 'bi-book',
    count: c.articles.length,
    url: `${cfg.base}/category/${c.id}`,
    slugs: c.articles.map((a) => a.slug),
  }));
}

/** The three configured "most-opened" categories, in configured order. */
export function startHere(audience) {
  const cats = categoriesFor(audience);
  const byId = new Map(cats.map((c) => [c.id, c]));
  return audienceConfig(audience)
    .startHere.map((id) => byId.get(id))
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Articles relevant to a question, from the lexical index. Each match carries
 * the article's category title so the rail can count it. `n` is generous:
 * the rail needs every matching category, not just the top few.
 */
export function matchesFor(query, audience, n = 40) {
  const q = String(query || '').trim();
  if (q.length < 3) return [];
  return searchHelp(q, { audience, limit: n, prefix: false }).map((m) => ({
    slug: m.slug,
    title: m.title,
    category: m.category,
    categoryId: m.categoryId,
    url: m.url,
    score: m.score,
  }));
}

/** { [categoryTitle]: distinct matched articles } for the rail and Keep reading. */
export function matchesByCategory(matches) {
  const seen = new Set();
  const out = {};
  for (const m of matches || []) {
    if (!m.category || seen.has(m.slug)) continue;
    seen.add(m.slug);
    out[m.category] = (out[m.category] || 0) + 1;
  }
  return out;
}

const key = (x) => x.slug;

/** Sources first (payload order), then matches by score, no duplicates. */
export function relatedArticles(sources, matches, audience) {
  const seen = new Set();
  const out = [];
  for (const s of sources || []) {
    if (seen.has(key(s))) continue;
    seen.add(key(s));
    out.push({ ...(articleMeta(audience, s.slug) || s), isSource: true });
  }
  for (const m of [...(matches || [])].sort((a, b) => b.score - a.score)) {
    if (seen.has(key(m))) continue;
    seen.add(key(m));
    out.push({ ...(articleMeta(audience, m.slug) || m), isSource: false, score: m.score });
  }
  return out;
}

/**
 * Keep reading: the top categories by match count, each with up to
 * `perCategory` matched articles that are NOT already sources. The header
 * count is the full match count for that category. Categories whose every
 * match is a source are skipped.
 */
export function keepReading(sources, matches, audience, { categories = 3, perCategory = 3 } = {}) {
  const counts = matchesByCategory(matches);
  const sourceSlugs = new Set((sources || []).map(key));
  const cats = categoriesFor(audience);
  const byTitle = new Map(cats.map((c) => [c.title, c]));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([title, count]) => {
      const cat = byTitle.get(title);
      const articles = [];
      const seen = new Set();
      for (const m of [...matches].sort((a, b) => b.score - a.score)) {
        if (m.category !== title || sourceSlugs.has(m.slug) || seen.has(m.slug)) continue;
        seen.add(m.slug);
        articles.push(articleMeta(audience, m.slug) || m);
        if (articles.length >= perCategory) break;
      }
      return cat && articles.length
        ? { id: cat.id, title, icon: cat.icon, url: cat.url, count, articles }
        : null;
    })
    .filter(Boolean)
    .slice(0, categories);
}

/** Trending minus anything already shown as a source or related article. */
export function stillTrending(trending, shown, n = 3) {
  const taken = new Set((shown || []).map(key));
  return (trending || []).filter((t) => !taken.has(t.slug)).slice(0, n);
}

/**
 * Articles with an `updatedAt` (ISO date) on their content entry, newest
 * first, within `days`. The content module carries no dates today, so this
 * returns [] and the block hides; adding `updatedAt` to an article turns it
 * on. Never invents a date.
 */
export function recentlyUpdated(audience, { days = 30, n = 5, now = new Date() } = {}) {
  const { arts } = CATALOG[audience] || CATALOG.user;
  const cutoff = new Date(now.getTime() - days * 86400000);
  return Object.keys(arts)
    .map((slug) => articleMeta(audience, slug))
    .filter((a) => a?.updatedAt && new Date(a.updatedAt) >= cutoff)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, n);
}

/** "2 days ago", "today", or the ISO date when older than 60 days. */
export function relativeDate(iso, now = new Date()) {
  if (!iso) return null;
  const d = Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return 'today';
  if (d === 1) return '1 day ago';
  if (d < 60) return `${d} days ago`;
  return String(iso).slice(0, 10);
}

/** Static trending fallback: the first articles of the first two categories. */
export function trendingFallback(audience, n = 6) {
  const cats = categoriesFor(audience);
  const out = [];
  for (const c of cats.slice(0, 2)) {
    for (const slug of c.slugs.slice(0, Math.ceil(n / 2))) {
      if (out.length >= n) return out;
      const a = articleMeta(audience, slug);
      if (a) out.push({ ...a, views: null });
    }
  }
  return out;
}
