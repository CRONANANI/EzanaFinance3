/**
 * Help Center content quality (Nov 23 2026 audit). Structural and accuracy
 * checks over src/lib/help-center-content.js that do not depend on wording
 * that changes often:
 *   - every article is in exactly one category, and every category entry
 *     resolves to an article with a matching category string;
 *   - no two articles in one help center share a title;
 *   - a troubleshooting bullet is never only "Refresh the page.",
 *     "Try again later." or "Contact support." with nothing else;
 *   - every article with a troubleshooting section offers a way to reach
 *     support;
 *   - no unsupported "typically takes N business days" promise;
 *   - facts that come from code match the code: the Echo writer
 *     application limits, the trial length, Sonar's question length and
 *     saved-item caps, and the Quant Lab backtest limits.
 *   node --no-warnings --test scripts/check-help-content-quality.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  USER_ARTICLES,
  PARTNER_ARTICLES,
  USER_CATEGORIES,
  PARTNER_CATEGORIES,
} from '../src/lib/help-center-content.js';
import { LIMITS } from '../src/lib/echo/writer-application.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const num = (src, name) => {
  const m = src.match(new RegExp(`${name}\\s*=\\s*([0-9_]+)`));
  assert.ok(m, `${name} found`);
  return Number(m[1].replace(/_/g, ''));
};
const text = (html) =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const SETS = [
  ['user', USER_ARTICLES, USER_CATEGORIES],
  ['partner', PARTNER_ARTICLES, PARTNER_CATEGORIES],
];

test('every article is filed once, and every category entry resolves', () => {
  for (const [name, articles, cats] of SETS) {
    const seen = new Map();
    for (const c of cats) {
      for (const a of c.articles) {
        assert.ok(articles[a.slug], `${name}: ${c.id} lists missing article ${a.slug}`);
        assert.equal(
          articles[a.slug].category,
          c.title,
          `${name}: ${a.slug} category string matches ${c.title}`,
        );
        assert.ok(!seen.has(a.slug), `${name}: ${a.slug} filed twice`);
        seen.set(a.slug, c.id);
      }
    }
    for (const slug of Object.keys(articles)) {
      assert.ok(seen.has(slug), `${name}: ${slug} is not in any category (orphan)`);
    }
  }
});

test('titles are unique within each help center', () => {
  for (const [name, articles] of SETS) {
    const titles = new Map();
    for (const [slug, a] of Object.entries(articles)) {
      assert.ok(a.title && a.content, `${name}: ${slug} has a title and content`);
      const t = a.title.toLowerCase();
      assert.ok(!titles.has(t), `${name}: "${a.title}" used by ${titles.get(t)} and ${slug}`);
      titles.set(t, slug);
    }
  }
});

const BARE = /^(refresh the page|reload the page|try again later|try again|contact support)\.?$/i;
const TS_HEADING =
  /<h3>(Troubleshooting|Common causes|If your post won|The form won|Find your situation|If a backtest)/i;
const ESCALATION = /Contact support|contact support|Still stuck|@ezana\.world/;

test('troubleshooting bullets give a real next step, and a route to support', () => {
  for (const [name, articles] of SETS) {
    for (const [slug, a] of Object.entries(articles)) {
      for (const li of a.content.match(/<li>[\s\S]*?<\/li>/g) || []) {
        const advice = text(li.replace(/^<li>\s*<strong>[\s\S]*?<\/strong>/, ''));
        assert.ok(!BARE.test(advice), `${name}: ${slug} has a bare "${advice}" bullet`);
      }
      if (TS_HEADING.test(a.content)) {
        assert.match(
          a.content,
          ESCALATION,
          `${name}: ${slug} troubleshooting has no support route`,
        );
      }
      assert.doesNotMatch(
        text(a.content),
        /typically takes \d/i,
        `${name}: ${slug} promises a review time`,
      );
    }
  }
});

test('code-backed facts match the code', () => {
  const echo = text(PARTNER_ARTICLES['applying-to-write'].content);
  assert.ok(echo.includes(`at least ${LIMITS.experienceMin} characters`), 'Echo: experience min');
  assert.ok(echo.includes(`${LIMITS.samplesMin} to ${LIMITS.samplesMax} links`), 'Echo: samples');
  assert.doesNotMatch(echo, /business days/, 'Echo: no review-time promise');

  const trialDays = num(read('src/lib/billing/renewal-terms.js'), 'TRIAL_DAYS');
  assert.ok(
    text(USER_ARTICLES['free-trial-explained'].content).includes(`${trialDays}-day free trial`),
    'trial length',
  );
  assert.ok(
    USER_ARTICLES['free-trial-explained'].title.includes(`${trialDays}-Day`),
    'trial title',
  );

  const queryMax = num(read('src/lib/sonar/limits.js'), 'SONAR_QUERY_MAX');
  assert.ok(
    text(USER_ARTICLES['using-ezana-sonar'].content).includes(`up to ${queryMax} characters`),
  );
  const saved = read('src/lib/sonar/saved.js');
  const sharing = text(USER_ARTICLES['sonar-saving-and-sharing'].content);
  assert.ok(sharing.includes(`up to ${num(saved, 'SAVED_MAX')} saved items`), 'saved cap');
  assert.ok(sharing.includes(`${num(saved, 'COLLECTIONS_MAX')} folders`), 'folder cap');

  const quant = text(USER_ARTICLES['quant-tools'].content);
  assert.ok(
    quant.includes(`up to ${num(read('src/lib/quants/lab-server.js'), 'MAX_RUNS_PER_DAY')} a day`),
  );
  assert.ok(
    quant.includes(`at most ${num(read('src/lib/quants/strategy-spec.js'), 'MAX_YEARS')} years`),
  );
  assert.ok(
    quant.includes(`up to ${num(read('src/lib/quants/strategy-spec.js'), 'MAX_UNIVERSE')} tickers`),
  );
});

test('the writer application form and API share one rule set', () => {
  assert.match(read('src/components/echo/WriterApplication.jsx'), /validateWriterApplication/);
  const api = read('src/app/api/echo/writer-application/route.js');
  assert.match(api, /validateWriterApplication/);
  assert.match(api, /isActivePartner/);
  assert.match(api, /already_pending/);
});
