/**
 * Page canvas (Nov 2026): every page under the top navigation bar spans the
 * bar, from the left edge of the Ezana logo to the right edge of the logout
 * icon, in retail, partner and org.
 *   npm run test:page-canvas
 *
 * The dashboard shell (.dashboard-main-content, layout.css) already carries
 * the nav's envelope (--app-shell-max, --app-shell-pad), so a page root must
 * not narrow it again: no px max-width below the envelope and no side
 * padding of its own. Full-bleed routes (/sonar) and pages outside the shell
 * take the nav's envelope themselves.
 *
 * Intentional exceptions (listed below): modals and drawers, chart and
 * control internals, and reading columns (an Echo article's body, the course
 * editor's article), whose line length is a reading width, not a canvas.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));

/** Top-level rules (not inside @media) of a CSS file: [{ sel, body }]. */
function rules(file) {
  const s = strip(fs.readFileSync(file, 'utf8'));
  const out = [];
  let depth = 0;
  let start = 0;
  let sel = '';
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === '{') {
      if (depth === 0) sel = s.slice(start, i).trim();
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (s[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        if (!sel.startsWith('@')) out.push({ sel, body: s.slice(start, i) });
        start = i + 1;
      }
    }
  }
  return out;
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.css')) acc.push(p);
  }
  return acc;
}

const px = (v) => {
  const m = String(v).match(/^(\d+(?:\.\d+)?)(px|rem)\b/);
  return m ? Number(m[1]) * (m[2] === 'rem' ? 16 : 1) : null;
};

/* The authed app's CSS: the dashboard route group and the components its
   pages are built from. */
const APP_DIRS = [
  'src/app/(dashboard)',
  'src/components/org',
  'src/components/partner',
  'src/components/badges',
  'src/components/leaderboard',
  'src/components/community',
  'src/components/research',
];
const PAGE_ROOT =
  /(^|\s)\.[\w-]+(-page|-container|-root|-canvas|-hub|-content|-wrap|-shell|-layout)$/;
const EXCEPTIONS = new Set([
  '.pmodal',
  '.sentinel-modal-shell',
  '.ma-event-analysis-shell',
  '.echo-article-page .echo-article-page-inset',
  '.pcx-empty-page',
  '.us-wrap',
  '.sa-page',
  '.onboarding-page',
  '.trd-pending-wrap',
  '.kairos-hero-inner',
  '.jx-container',
]);

test('no page root narrows the nav-wide canvas', () => {
  const bad = [];
  for (const dir of APP_DIRS) {
    for (const f of walk(dir)) {
      for (const { sel, body } of rules(f)) {
        const last = sel.split(',').pop().trim();
        if (!PAGE_ROOT.test(last) || EXCEPTIONS.has(last)) continue;
        const mw = body.match(/max-width\s*:\s*([^;]+);/);
        const v = mw ? px(mw[1].trim()) : null;
        if (v !== null && v >= 480 && v < 1600) bad.push(`${f}: ${last} max-width ${mw[1].trim()}`);
      }
    }
  }
  assert.deepEqual(bad, [], `Page roots capped below the nav bar:\n${bad.join('\n')}`);
});

/* The pages fixed in Nov 2026: no cap and no side padding of their own. */
const FIXED = [
  ['src/components/badges/badges-page.css', '.bp-container'],
  ['src/components/org/permissions/team-permissions.css', '.tpm-root'],
  ['src/components/org/competitions/competitions.css', '.pcx-page'],
  ['src/components/leaderboard/elo-leaderboard.css', '.elo-lb-container'],
  ['src/app/ui-improvements.css', '.partner-dashboard-container'],
  ['src/app/(dashboard)/community/community.css', '.evo-hub'],
  ['src/app/(dashboard)/learning-center/learning-center.css', '.lc-page'],
  ['src/app/(dashboard)/council-rankings/council-rankings.css', '.crx-page'],
  ['src/app/(dashboard)/council-rankings/council-rankings.css', '.crx-container'],
  ['src/app/(dashboard)/research-copilot/research-copilot.css', '.rc-page'],
  ['src/app/(dashboard)/company-research/dossier.css', '.crx-canvas'],
  ['src/app/(dashboard)/real-estate/real-estate.css', '.re-page'],
  ['src/app/(dashboard)/ezana-echo/ezana-echo.css', '.echo-archive-page'],
  ['src/app/(dashboard)/kairos-signal/kairos-signal.css', '.kairos-page'],
  ['src/app/(dashboard)/changelog/changelog.css', '.cl-page'],
  ['src/app/(dashboard)/pricing/pricing.css', '.pricing-page'],
  ['src/app/(dashboard)/org-team-hub/org-chart/org-final.css', '.ox-wrap'],
  ['src/app/(dashboard)/alternative-markets/am2.css', '.am2-content'],
  ['src/components/sonar/research/research-report.css', '.srr'],
];

test('the fixed page roots carry no cap and no side padding', () => {
  for (const [file, root] of FIXED) {
    const all = strip(fs.readFileSync(file, 'utf8'));
    const re = new RegExp(`(^|[}\\s])${root.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'g');
    let m;
    let seen = 0;
    while ((m = re.exec(all))) {
      seen += 1;
      const body = m[2];
      assert.doesNotMatch(body, /max-width\s*:\s*\d/, `${root} in ${file} sets a max-width`);
      const pad = body.match(/padding\s*:\s*([^;]+);/);
      if (pad) {
        const parts = pad[1].trim().split(/\s+/);
        const sides =
          parts.length === 1 ? [parts[0]] : parts.length <= 3 ? [parts[1]] : [parts[1], parts[3]];
        for (const s of sides)
          assert.equal(s, '0', `${root} in ${file} pads its sides (${pad[1]})`);
      }
      assert.doesNotMatch(body, /padding-(left|right|inline)\s*:\s*[^0;]/, `${root} side padding`);
    }
    assert.ok(seen, `${root} not found in ${file}`);
  }
});

test('deep research spans the nav bar on full-bleed /sonar and fills the shell elsewhere', () => {
  const css = strip(fs.readFileSync('src/components/sonar/deep-research.css', 'utf8'));
  assert.match(
    css,
    /\.sdr-run\s*\{[^}]*max-width:\s*var\(--marketing-shell-max\);[^}]*padding:\s*24px var\(--app-shell-pad\) 64px;/,
  );
  assert.match(
    css,
    /\.ds-shell--in-app \.sdr-run,\s*\.dashboard-main-content \.sdr-run\s*\{\s*max-width:\s*var\(--app-shell-max\);/,
  );
  assert.match(
    css,
    /\.dashboard-main-content:not\(\.dashboard-main-content--fullscreen\) \.sdr-run\s*\{\s*max-width:\s*none;\s*padding-left:\s*0;\s*padding-right:\s*0;/,
  );
  assert.doesNotMatch(css, /max-width:\s*1040px/);
  /* The envelope the nav itself uses. */
  const nav = strip(fs.readFileSync('src/app/globals.css', 'utf8'));
  assert.match(
    nav,
    /\.main-nav \.nav-container\s*\{[^}]*max-width:\s*var\(--app-shell-max\);[^}]*padding:\s*0 var\(--app-shell-pad\);/,
  );
  const shell = strip(fs.readFileSync('src/app/(dashboard)/layout.css', 'utf8'));
  assert.match(
    shell,
    /padding-left:\s*var\(--app-shell-pad\);\s*padding-right:\s*var\(--app-shell-pad\);[\s\S]*?max-width:\s*var\(--app-shell-max\);/,
  );
});
