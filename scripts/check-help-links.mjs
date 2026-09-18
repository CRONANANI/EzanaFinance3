#!/usr/bin/env node
/**
 * Help center link integrity.
 *
 * Every /help-center/<audience>/article/<slug> href inside an article body must
 * point at a slug that exists in THAT audience's article map. Cross-audience
 * links are legitimate and resolved against the audience named in the href:
 * the partner brokerage note deliberately sends readers to the user guide
 * rather than duplicating its live capability table.
 *
 * Also fails on an inline `style` attribute on an anchor in prose: link colour
 * comes from .hc-prose a in help-center.css so it stays emerald in both themes.
 *
 * Plain Node, no dependencies. Run: npm run check:help-links
 */
import {
  USER_ARTICLES,
  USER_CATEGORIES,
  PARTNER_ARTICLES,
  PARTNER_CATEGORIES,
} from '../src/lib/help-center-content.js';

const HREF = /href="(\/help-center\/(user|partner)\/article\/([a-zA-Z0-9-]+))"/g;
const STYLED_ANCHOR = /<a\b[^>]*\sstyle=/gi;

const AUDIENCES = [
  { name: 'user', articles: USER_ARTICLES, categories: USER_CATEGORIES },
  { name: 'partner', articles: PARTNER_ARTICLES, categories: PARTNER_CATEGORIES },
];

const errors = [];
const warnings = [];

for (const { name, articles, categories } of AUDIENCES) {
  // 1. Every slug listed in a category must have an article, and vice versa.
  const listed = new Set(categories.flatMap((c) => c.articles.map((a) => a.slug)));
  for (const slug of listed) {
    if (!articles[slug]) {
      errors.push(`[${name}] category lists "${slug}" but no article body exists`);
    }
  }
  for (const slug of Object.keys(articles)) {
    if (!listed.has(slug)) {
      errors.push(`[${name}] article "${slug}" exists but is not listed in any category`);
    }
  }

  // 2. Hrefs resolve, and stay inside their own audience.
  for (const [slug, article] of Object.entries(articles)) {
    const body = article.content || '';

    for (const m of body.matchAll(HREF)) {
      const [, href, audience, target] = m;
      const targetMap = AUDIENCES.find((x) => x.name === audience)?.articles;
      if (!targetMap) {
        errors.push(`[${name}] ${slug}: unknown audience segment in ${href}`);
        continue;
      }
      if (!targetMap[target]) {
        errors.push(`[${name}] ${slug}: dead link ${href}`);
      }
    }

    for (const _ of body.matchAll(STYLED_ANCHOR)) {
      errors.push(`[${name}] ${slug}: anchor carries an inline style attribute`);
    }

    // 3. Dense cross-linking: at least two inline links outside the trailing
    //    "Related articles" list. Reported as a warning so a genuinely short
    //    article is not blocked, but it is printed every run.
    const prose = body.split(/<h3>\s*Related articles\s*<\/h3>/i)[0];
    const inline = [...prose.matchAll(/<a\b/gi)].length;
    if (inline < 2) {
      warnings.push(`[${name}] ${slug}: ${inline} inline link(s) in prose, target is 2`);
    }
  }
}

if (errors.length) {
  console.error(`\n✖ ${errors.length} help-center link problem(s).\n`);
  errors.forEach((e) => console.error('  ' + e));
  if (warnings.length) {
    console.error(`\n  (plus ${warnings.length} thin-linking warning(s))`);
  }
  console.error('');
  process.exit(1);
}

console.log(`✔ Help center links resolve (${AUDIENCES.map((a) => a.name).join(', ')}).`);
if (warnings.length) {
  console.log(`\n${warnings.length} article(s) below the 2 inline link target:`);
  warnings.forEach((w) => console.log('  ' + w));
}
