#!/usr/bin/env node
/**
 * Audits course section modules for authoring rule violations.
 * Run: node scripts/lint-course-sections.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIB_DIR = path.resolve(__dirname, '../src/lib');

const HISTORY_RE =
  /history|historical|crash|crisis|origin|evolution|the rise of|the fall of|invented|founded/i;
const TICKER_RE =
  /\b(AAPL|MSFT|GOOGL?|AMZN|META|TSLA|NVDA|JPM|GS|XOM|JNJ|UNH|WMT|KO|HD|MCD|SPY|QQQ|VTI|TLT|GLD|BTC|ETH)\b/;

function lintSection(section) {
  const violations = [];
  const modules = section.modules || [];
  const types = modules.map((m) => m.type);

  if (modules.length === 0) {
    violations.push('empty modules array');
    return violations;
  }

  if (HISTORY_RE.test(section.title || '') && !types.includes('contextTimeline')) {
    violations.push(`title looks historical ("${section.title}") but no contextTimeline module`);
  }

  const proseText = modules
    .filter((m) => m.type === 'paragraphs')
    .map((m) => m.body || '')
    .join(' ');

  const proseWithoutTokens = proseText.replace(
    /\[\[ticker:[A-Z0-9.-]+\]\](.*?)\[\[\/ticker\]\]/g,
    '',
  );
  const nakedTickerMatches = proseWithoutTokens.match(new RegExp(TICKER_RE.source, 'gi'));

  if (nakedTickerMatches && nakedTickerMatches.length > 0) {
    const unique = [...new Set(nakedTickerMatches.map((t) => t.toUpperCase()))];
    violations.push(`prose mentions ${unique.join(', ')} without [[ticker:...]] wrapper`);
  }

  if (types.filter((t) => t === 'pullQuote').length > 1) {
    violations.push(
      `${types.filter((t) => t === 'pullQuote').length} pullQuote modules — max is 1`,
    );
  }
  if (types.filter((t) => t === 'keyTermCards').length > 1) {
    violations.push(
      `${types.filter((t) => t === 'keyTermCards').length} keyTermCards modules — max is 1`,
    );
  }
  if (types.filter((t) => t === 'callout').length > 1) {
    violations.push(`${types.filter((t) => t === 'callout').length} callout modules — max is 1`);
  }
  if (modules.some((m) => m._needsAuthoring)) {
    violations.push('contains placeholder modules flagged _needsAuthoring');
  }

  return violations;
}

async function main() {
  const moduleFiles = [
    'course-content-bronze-rest.modules.json',
    'course-content-crypto-bronze.modules.json',
    'course-content-silver-gold-platinum.modules.json',
  ];

  let totalViolations = 0;
  let totalSections = 0;
  const report = [];

  for (const file of moduleFiles) {
    const fullPath = path.join(LIB_DIR, file);
    if (!fs.existsSync(fullPath)) continue;
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    for (const [courseId, course] of Object.entries(data)) {
      if (!course?.sections) continue;
      course.sections.forEach((s, i) => {
        totalSections += 1;
        const violations = lintSection(s);
        if (violations.length > 0) {
          totalViolations += violations.length;
          report.push({ courseId, sectionIdx: i, title: s.title, violations });
        }
      });
    }
  }

  if (report.length === 0) {
    console.log(`[lint] ${totalSections} sections checked — all clean.`);
    process.exit(0);
  }

  console.log(
    `[lint] ${totalSections} sections checked — ${totalViolations} violations in ${report.length} sections:\n`,
  );
  for (const r of report.slice(0, 30)) {
    console.log(`  ${r.courseId} §${r.sectionIdx + 1} — "${r.title}"`);
    for (const v of r.violations) console.log(`    • ${v}`);
  }
  if (report.length > 30)
    console.log(`\n  ...and ${report.length - 30} more sections with violations.`);
  console.log('\n[lint] Run migration helpers or hand-author missing modules to fix.');
  process.exit(1);
}

main();
