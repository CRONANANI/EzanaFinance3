'use client';

/* ============================================================================
 *  EZANA API — documentation landing page (/ezana-api)
 *  ----------------------------------------------------------------------------
 *  A clean, docs-style page for leasing Ezana data and algorithms to traders
 *  and institutions. Layout is modeled on docs.adjacent.markets: a sticky left
 *  section nav, a single readable content column, and endpoint/code blocks in
 *  JetBrains Mono. On-brand (emerald accents, Plus Jakarta Sans) via the shared
 *  design tokens; scoped styles live in ezana-api.css.
 *
 *  The global top nav comes from the root layout (ConditionalNavbar) — this
 *  page deliberately does NOT build its own top navigation.
 *
 *  Everything here is documentation/scaffolding. Endpoints and payloads are
 *  illustrative placeholders and are marked "coming soon" where not yet built.
 * ==========================================================================*/

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Terminal, KeyRound, ShieldCheck, Gauge, Boxes, Map } from 'lucide-react';
import './ezana-api.css';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'getting-access', label: 'Getting access' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'rate-limits', label: 'Rate limits & terms' },
  { id: 'roadmap', label: 'How we build & ship it' },
];

const ENDPOINT_GROUPS = [
  {
    key: 'congress',
    title: 'Congressional trading',
    base: '/v1/congress',
    routes: [
      {
        method: 'GET',
        path: '/v1/congress/trades',
        desc: 'Disclosed House & Senate trades, filterable by member, ticker, party, and filing date.',
      },
      {
        method: 'GET',
        path: '/v1/congress/members',
        desc: 'Roster of the 535 members with disclosure history and committee assignments.',
      },
      {
        method: 'GET',
        path: '/v1/congress/trades/{id}',
        desc: 'A single disclosure with the STOCK Act filing metadata and disclosure lag.',
      },
    ],
  },
  {
    key: 'lobbying',
    title: 'Lobbying & government',
    base: '/v1/lobbying',
    routes: [
      {
        method: 'GET',
        path: '/v1/lobbying/filings',
        desc: 'LDA lobbying filings by registrant, client, issue area, and quarter.',
      },
      {
        method: 'GET',
        path: '/v1/lobbying/clients/{id}',
        desc: 'Spend history and issue exposure for a single lobbying client.',
      },
      {
        method: 'GET',
        path: '/v1/government/contracts',
        desc: 'Awarded federal contracts mapped to publicly traded parents.',
      },
    ],
  },
  {
    key: 'markets',
    title: 'Markets & prediction signals',
    base: '/v1/markets',
    routes: [
      {
        method: 'GET',
        path: '/v1/markets/quotes',
        desc: 'Reference and end-of-day market data for a symbol universe.',
      },
      {
        method: 'GET',
        path: '/v1/markets/predictions',
        desc: 'Prediction-market odds (Polymarket-sourced) for tracked events.',
      },
      {
        method: 'GET',
        path: '/v1/markets/signals',
        desc: 'Composite Ezana signals blending the datasets above into a score.',
      },
    ],
  },
];

const TIERS = [
  {
    name: 'Developer',
    price: 'Free',
    detail: 'Evaluation key',
    features: [
      'Sandbox data',
      '60 requests / min',
      'Congress trades (delayed)',
      'Community support',
    ],
  },
  {
    name: 'Trader',
    price: 'Lease',
    detail: 'Per-seat monthly',
    features: [
      'Live congress & lobbying',
      '600 requests / min',
      'Prediction-market odds',
      'Email support',
    ],
    highlight: true,
  },
  {
    name: 'Institution',
    price: 'Custom',
    detail: 'Volume + SLA',
    features: [
      'Full warehouse access',
      'Custom rate limits',
      'Bulk & backfill exports',
      'Dedicated support + SLA',
    ],
  },
];

const ROADMAP_STEPS = [
  {
    n: 1,
    title: 'Request → scoped API key',
    body: 'A requester submits the access form. On approval we issue a scoped key backed by a Supabase key table — only a salted hash is stored, never the raw key — bound to a lease tier and dataset scopes.',
  },
  {
    n: 2,
    title: 'Versioned /v1/* routes over the warehouse',
    body: 'Stable, versioned REST routes read directly from the same warehouse that powers the product, so API consumers get the identical sourced-and-attributed data behind the app.',
  },
  {
    n: 3,
    title: 'Per-key rate limiting + usage metering',
    body: 'Each request is authenticated, rate-limited per key, and metered. Usage rolls up per key and per dataset for quotas, dashboards, and billing.',
  },
  {
    n: 4,
    title: 'Billing & lease-tier tie-in',
    body: 'Metered usage and tier feed billing (Stripe), so Developer/Trader/Institution leases map cleanly to entitlements and overage.',
  },
  {
    n: 5,
    title: 'Docs + changelog',
    body: 'This page is the front door; a versioned changelog tracks new endpoints, fields, and deprecations so integrators can upgrade safely.',
  },
];

const AUTH_SNIPPET = `curl https://api.ezana.world/v1/congress/trades \\
  -H "Authorization: Bearer $EZANA_API_KEY" \\
  -H "Accept: application/json"`;

const RESPONSE_SNIPPET = `{
  "data": [
    {
      "id": "trd_9f2c1a",
      "member": "Rep. Jane Doe",
      "party": "D",
      "ticker": "NVDA",
      "transaction": "purchase",
      "amount_range": "$15,001 - $50,000",
      "traded_at": "2026-05-14",
      "disclosed_at": "2026-06-02",
      "disclosure_lag_days": 19
    }
  ],
  "page": { "next": "cursor_abc", "has_more": true }
}`;

function Method({ method }) {
  return <span className={`ea-method ea-method--${method.toLowerCase()}`}>{method}</span>;
}

export default function EzanaApiPage() {
  const [active, setActive] = useState('overview');

  // Scroll-spy: highlight the sidebar entry for the section currently in view.
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="ea-page">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="ea-hero">
        <div className="ea-hero-inner">
          <span className="ea-eyebrow">
            <Terminal size={13} aria-hidden />
            Ezana API
          </span>
          <h1 className="ea-h1">Lease Ezana data &amp; signals</h1>
          <p className="ea-lede">
            Congressional trading, lobbying, prediction-market, and market data — the same sourced,
            attributed datasets that power Ezana — delivered to traders and institutions through a
            versioned REST API.
          </p>
          <div className="ea-hero-actions">
            <a href="#getting-access" className="ea-btn ea-btn--primary">
              Request access <ArrowRight size={15} aria-hidden />
            </a>
            <a href="#endpoints" className="ea-btn ea-btn--ghost">
              Browse endpoints
            </a>
          </div>
          <p className="ea-hero-note">
            Documentation preview — several endpoints are marked <em>coming soon</em> while the API
            is being rolled out.
          </p>
        </div>
      </header>

      {/* ── Docs body: sticky section nav + content column ───────────── */}
      <div className="ea-shell">
        <nav className="ea-sidenav" aria-label="API documentation sections">
          <p className="ea-sidenav-head">Documentation</p>
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={active === s.id ? 'is-active' : ''}>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="ea-sidenav-card">
            <p className="ea-sidenav-card-title">Need a custom lease?</p>
            <p className="ea-sidenav-card-text">
              Institutions can request volume pricing and an SLA.
            </p>
            <a href="mailto:api@ezana.world" className="ea-sidenav-card-link">
              api@ezana.world
            </a>
          </div>
        </nav>

        <main className="ea-content">
          {/* Overview */}
          <section id="overview" className="ea-section">
            <h2>Overview</h2>
            <p>
              The Ezana API exposes the datasets and derived signals behind the Ezana platform so
              you can build them into your own research, models, and products. Every field traces to
              a primary source — House &amp; Senate disclosures, SEC EDGAR, FEC records, prediction
              markets, and macro indicators — the same provenance you get inside the app.
            </p>
            <div className="ea-feature-grid">
              <div className="ea-feature">
                <Boxes size={18} aria-hidden />
                <h3>Congressional trading</h3>
                <p>
                  Disclosed House &amp; Senate trades with filing dates, disclosure lag, and
                  per-member history.
                </p>
              </div>
              <div className="ea-feature">
                <ShieldCheck size={18} aria-hidden />
                <h3>Lobbying &amp; government</h3>
                <p>LDA lobbying filings and federal contract awards mapped to public issuers.</p>
              </div>
              <div className="ea-feature">
                <Gauge size={18} aria-hidden />
                <h3>Prediction &amp; market signals</h3>
                <p>
                  Prediction-market odds and composite Ezana signals alongside reference market
                  data.
                </p>
              </div>
            </div>
          </section>

          {/* Getting access */}
          <section id="getting-access" className="ea-section">
            <h2>Getting access</h2>
            <p>
              Access is lease-based. Tell us the datasets you need and your expected volume, and we
              issue a scoped API key for the matching tier. Reach us at{' '}
              <a href="mailto:api@ezana.world">api@ezana.world</a> or from your{' '}
              <Link href="/pricing">plan</Link> — Enterprise plans include API access.
            </p>
            <div className="ea-tiers">
              {TIERS.map((t) => (
                <div key={t.name} className={`ea-tier${t.highlight ? ' ea-tier--hl' : ''}`}>
                  <div className="ea-tier-head">
                    <span className="ea-tier-name">{t.name}</span>
                    <span className="ea-tier-detail">{t.detail}</span>
                  </div>
                  <div className="ea-tier-price">{t.price}</div>
                  <ul className="ea-tier-feats">
                    {t.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="ea-soon-note">
              <span className="ea-soon">Coming soon</span> Self-serve key issuance and a request
              form. For now, access is granted manually on request.
            </p>
          </section>

          {/* Authentication */}
          <section id="authentication" className="ea-section">
            <h2>Authentication</h2>
            <p>
              The API uses bearer-token authentication. Pass your key in the{' '}
              <code>Authorization</code> header on every request over HTTPS. Keys are scoped to your
              lease tier and datasets; never expose a key in client-side code.
            </p>
            <div className="ea-code">
              <div className="ea-code-head">
                <KeyRound size={13} aria-hidden />
                Authenticated request
              </div>
              <pre>
                <code>{AUTH_SNIPPET}</code>
              </pre>
            </div>
            <p className="ea-soon-note">
              <span className="ea-soon">Placeholder</span> The token format and key-rotation flow
              are illustrative and will be finalized at launch.
            </p>
          </section>

          {/* Endpoints */}
          <section id="endpoints" className="ea-section">
            <h2>Endpoints</h2>
            <p>
              Endpoints are grouped by dataset under a versioned <code>/v1</code> prefix. Responses
              are JSON and cursor-paginated. The shapes below are illustrative placeholders.
            </p>
            {ENDPOINT_GROUPS.map((group) => (
              <div key={group.key} className="ea-ep-group">
                <div className="ea-ep-group-head">
                  <h3>{group.title}</h3>
                  <code className="ea-ep-base">{group.base}</code>
                </div>
                <ul className="ea-ep-list">
                  {group.routes.map((r) => (
                    <li key={r.path} className="ea-ep">
                      <div className="ea-ep-sig">
                        <Method method={r.method} />
                        <code>{r.path}</code>
                      </div>
                      <p>{r.desc}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="ea-code">
              <div className="ea-code-head">
                <Terminal size={13} aria-hidden />
                Example response · GET /v1/congress/trades
              </div>
              <pre>
                <code>{RESPONSE_SNIPPET}</code>
              </pre>
            </div>
          </section>

          {/* Rate limits & terms */}
          <section id="rate-limits" className="ea-section">
            <h2>Rate limits &amp; terms</h2>
            <p>
              Rate limits are enforced per key and vary by lease tier (see{' '}
              <a href="#getting-access">Getting access</a>). Every response carries{' '}
              <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, and{' '}
              <code>X-RateLimit-Reset</code> headers; exceeding your limit returns{' '}
              <code>429 Too Many Requests</code>.
            </p>
            <ul className="ea-terms">
              <li>
                Data is licensed for your own analysis and products — no wholesale redistribution of
                raw feeds.
              </li>
              <li>Attribution of underlying primary sources is preserved in every payload.</li>
              <li>Signals are informational, not investment advice.</li>
            </ul>
            <p className="ea-soon-note">
              <span className="ea-soon">Coming soon</span> Full terms of use and a data-license
              agreement will accompany general availability.
            </p>
          </section>

          {/* Roadmap / build & distribution */}
          <section id="roadmap" className="ea-section">
            <h2>
              <Map size={18} aria-hidden className="ea-h2-icon" />
              How we build &amp; ship it
            </h2>
            <p>
              The outline below is how the Ezana API is built and distributed to users who request
              it. It is a roadmap — items ship incrementally.
            </p>
            <ol className="ea-steps">
              {ROADMAP_STEPS.map((s) => (
                <li key={s.n} className="ea-step">
                  <span className="ea-step-num">{s.n}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="ea-cta">
              <h3>Ready to build on Ezana data?</h3>
              <p>Request an evaluation key and we’ll get you a scoped token for your use case.</p>
              <a href="mailto:api@ezana.world" className="ea-btn ea-btn--primary">
                Request access <ArrowRight size={15} aria-hidden />
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
