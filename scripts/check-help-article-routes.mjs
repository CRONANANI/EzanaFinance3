#!/usr/bin/env node
/* Help Center route sweep: requests every article slug listed on every
   category (user and partner) against a running server and asserts HTTP 200,
   a non-empty <h1> and a non-empty article body. Regression guard for the
   Sept 2026 outage where every article page 500'd in production.

   Usage: BASE_URL=http://localhost:3000 node scripts/check-help-article-routes.mjs
   (npm run check:help-routes). Needs a running build: next build && next start. */
import { USER_CATEGORIES, PARTNER_CATEGORIES } from '../src/lib/help-center-content.js';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const targets = [];
for (const [audience, cats] of [
  ['user', USER_CATEGORIES],
  ['partner', PARTNER_CATEGORIES],
]) {
  const seen = new Set();
  for (const cat of cats) {
    for (const a of cat.articles) {
      if (seen.has(a.slug)) continue;
      seen.add(a.slug);
      targets.push(`/help-center/${audience}/article/${a.slug}`);
    }
  }
}

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

let failures = 0;
const CONCURRENCY = 6;
let next = 0;
async function worker() {
  while (next < targets.length) {
    const path = targets[next++];
    try {
      const res = await fetch(BASE + path);
      const html = await res.text();
      const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
      const body = (html.match(/id="hc-article-body"[^>]*>([\s\S]*?)<\/div>/i) || [])[1];
      const problems = [];
      if (res.status !== 200) problems.push(`HTTP ${res.status}`);
      if (!h1 || !strip(h1)) problems.push('empty <h1>');
      if (!body || strip(body).length < 40) problems.push('empty article body');
      if (problems.length) {
        failures++;
        console.log(`FAIL ${path}: ${problems.join('; ')}`);
      }
    } catch (err) {
      failures++;
      console.log(`FAIL ${path}: ${err.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(
  failures
    ? `\n${failures} of ${targets.length} article routes failed.`
    : `ok   ${targets.length} article routes render (200, h1, body)`,
);
process.exit(failures ? 1 : 0);
