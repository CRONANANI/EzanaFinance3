'use client';

/* ============================================================================
 *  EZANA API — documentation landing page (/ezana-api)
 *  ----------------------------------------------------------------------------
 *  A clean, docs-style page positioning the Ezana API as a signal-from-noise
 *  engine for traders and quant firms: it surfaces the relationships between
 *  obscure, overlooked data (congressional trades, lobbying flows, prediction
 *  markets, alt-data) and market movement, powered by elite news engineering.
 *  Layout is modeled on docs.adjacent.markets: a sticky left section nav, a
 *  single readable content column, and endpoint/code blocks in JetBrains Mono.
 *  On-brand (emerald accents, Plus Jakarta Sans) via the shared design tokens;
 *  scoped styles live in ezana-api.css.
 *
 *  The global top nav comes from the root layout (ConditionalNavbar) — this
 *  page deliberately does NOT build its own top navigation.
 *
 *  Everything here is documentation/scaffolding. Endpoints and payloads are
 *  illustrative placeholders and are marked "coming soon" where not yet built.
 * ==========================================================================*/

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Terminal,
  KeyRound,
  Gauge,
  Map,
  TrendingUp,
  Newspaper,
  Network,
  Zap,
  History,
} from 'lucide-react';
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
    framing:
      'Insider-flow signal — what informed, access-rich actors are trading, structured for signal extraction, not just raw disclosures.',
    routes: [
      {
        method: 'GET',
        path: '/v1/congress/trades',
        desc: 'Disclosed House & Senate trades, filterable by member, ticker, party, and filing date — the raw substrate for an informed-flow factor.',
      },
      {
        method: 'GET',
        path: '/v1/congress/members',
        desc: 'Roster of the 535 members with disclosure history and committee assignments, so you can weight signal by seat and sector oversight.',
      },
      {
        method: 'GET',
        path: '/v1/congress/trades/{id}',
        desc: 'A single disclosure with STOCK Act filing metadata and disclosure lag — model the delay between the trade and when the market saw it.',
      },
    ],
  },
  {
    key: 'lobbying',
    title: 'Lobbying & government',
    base: '/v1/lobbying',
    framing:
      'Influence-flow signal — map corporate influence spend and contract awards to sector and price exposure before the thesis is consensus.',
    routes: [
      {
        method: 'GET',
        path: '/v1/lobbying/filings',
        desc: 'LDA lobbying filings by registrant, client, issue area, and quarter — track where policy money is moving and which issuers are exposed.',
      },
      {
        method: 'GET',
        path: '/v1/lobbying/clients/{id}',
        desc: 'Spend history and issue exposure for a single client, ready to join against your position book for a policy-risk overlay.',
      },
      {
        method: 'GET',
        path: '/v1/government/contracts',
        desc: 'Awarded federal contracts mapped to publicly traded parents — a revenue-visibility signal ahead of guidance.',
      },
    ],
  },
  {
    key: 'markets',
    title: 'Markets & prediction signals',
    base: '/v1/markets',
    framing:
      'Consensus & odds signal — prediction-market probabilities and composite scores, semantically linked to the news moving them.',
    routes: [
      {
        method: 'GET',
        path: '/v1/markets/quotes',
        desc: 'Reference and end-of-day market data for a symbol universe — the price series you regress every other signal against.',
      },
      {
        method: 'GET',
        path: '/v1/markets/predictions',
        desc: 'Prediction-market odds (Polymarket-sourced) for tracked events — a real-money consensus probability for event-driven strategies.',
      },
      {
        method: 'GET',
        path: '/v1/markets/signals',
        desc: 'Composite Ezana signals blending the datasets above into a single score you can drop into a model as a feature.',
      },
    ],
  },
  {
    key: 'news',
    title: 'News engineering',
    base: '/v1/news',
    framing:
      'The signal layer — news structured, entity-tagged, and semantically linked to tickers, events, and prediction-market odds so headlines become machine-usable features.',
    routes: [
      {
        method: 'GET',
        path: '/v1/news/search',
        desc: 'Semantic news search over structured, deduplicated articles — retrieve by meaning, not keywords, for a topic, thesis, or event.',
      },
      {
        method: 'GET',
        path: '/v1/news/entities',
        desc: 'Entity-tagged articles resolved to tickers, people, and issues, so you can build per-name news-flow and sentiment features.',
      },
      {
        method: 'GET',
        path: '/v1/news/matches',
        desc: 'News↔market/odds matches — each article linked to the securities and prediction markets it moves, with a confidence score.',
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
      'Sandbox signal data',
      '60 requests / min',
      'Congress flow (delayed)',
      'Community support',
    ],
  },
  {
    name: 'Trader',
    price: 'Lease',
    detail: 'Per-seat monthly',
    features: [
      'Live congress & lobbying signal',
      '600 requests / min',
      'Prediction-market odds',
      'Email support',
    ],
  },
  {
    name: 'Quant Firm',
    price: 'Scale',
    detail: 'Systematic desks',
    features: [
      'Full signal + news-engineering feeds',
      'High-throughput limits',
      'Backtest-ready history',
      'Priority support',
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
    body: 'Metered usage and tier feed billing (Stripe), so Developer/Trader/Quant Firm/Institution leases map cleanly to signal entitlements and overage.',
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
            Signal from noise
          </span>
          <h1 className="ea-h1">Find the trend before the market does.</h1>
          <p className="ea-lede">
            The Ezana API exposes the relationships between under-watched data — congressional
            trades, lobbying flows, prediction-market odds, and alternative signals — and how
            markets actually move, so traders and quant firms can act on signal others miss.
            It&apos;s powered by elite <strong>news engineering</strong>: we structure and enrich
            market-moving news into machine-usable signal, entity-tagged and semantically linked to
            the securities and events it touches.
          </p>
          <div className="ea-hero-actions">
            <a href="#getting-access" className="ea-btn ea-btn--primary">
              Get API access <ArrowRight size={15} aria-hidden />
            </a>
            <a href="#endpoints" className="ea-btn ea-btn--ghost">
              Explore the signal endpoints
            </a>
          </div>
          <p className="ea-hero-note">
            Built for quant desks, systematic traders, and research teams. Documentation preview —
            several endpoints are marked <em>coming soon</em> while the API is being rolled out.
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
              Most alternative data is noise until something connects it to price. The Ezana API is
              that connection: it turns obscure, overlooked datasets into tradeable signal and maps
              the non-obvious relationships between what informed actors do, what policy money
              chases, what the crowd is betting, and where markets move next. Every field traces to
              a primary source — House &amp; Senate disclosures, SEC EDGAR, FEC records, prediction
              markets, and structured news — so a signal is auditable back to where it came from.
            </p>
            <p>
              It&apos;s built for traders, quant firms, and systematic and research desks who want
              inputs, not opinions — features you can drop into a model, backtest, and trade around.
              What sets it apart is <strong>news engineering</strong>: real-time structuring,
              entity-tagging, and semantic linking of market-moving news to securities, events, and
              prediction-market odds.
            </p>
            <div className="ea-feature-grid">
              <div className="ea-feature">
                <TrendingUp size={18} aria-hidden />
                <h3>Obscure data → market trends</h3>
                <p>
                  Non-obvious relationships between under-watched datasets and price, surfaced as
                  signal before they&apos;re consensus.
                </p>
              </div>
              <div className="ea-feature">
                <Newspaper size={18} aria-hidden />
                <h3>News engineering</h3>
                <p>
                  Market-moving news structured and enriched into machine-usable signal — the core
                  competency behind the feeds.
                </p>
              </div>
              <div className="ea-feature">
                <Gauge size={18} aria-hidden />
                <h3>Prediction-market signal</h3>
                <p>Real-money odds as a consensus probability for event-driven strategies.</p>
              </div>
              <div className="ea-feature">
                <Network size={18} aria-hidden />
                <h3>Entity-linked &amp; queryable</h3>
                <p>
                  Everything resolved to tickers, people, and issues, and semantically searchable by
                  meaning.
                </p>
              </div>
              <div className="ea-feature">
                <Zap size={18} aria-hidden />
                <h3>Low-latency</h3>
                <p>Signal delivered close to the event, so you act while the edge is still live.</p>
              </div>
              <div className="ea-feature">
                <History size={18} aria-hidden />
                <h3>Backtest-ready history</h3>
                <p>
                  Point-in-time series with disclosure lag preserved, so backtests aren&apos;t
                  contaminated by hindsight.
                </p>
              </div>
            </div>
          </section>

          {/* Getting access */}
          <section id="getting-access" className="ea-section">
            <h2>Getting access</h2>
            <p>
              Access is lease-based — you&apos;re leasing signal and structured alternative data,
              not a static dump. Tell us the signal families you need and your expected volume, and
              we issue a scoped API key for the matching tier. Reach us at{' '}
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
              Endpoints are grouped by signal family under a versioned <code>/v1</code> prefix —
              each group framed by what a quant would actually do with it. Responses are JSON and
              cursor-paginated. The shapes below are illustrative placeholders.
            </p>
            {ENDPOINT_GROUPS.map((group) => (
              <div key={group.key} className="ea-ep-group">
                <div className="ea-ep-group-head">
                  <h3>{group.title}</h3>
                  <code className="ea-ep-base">{group.base}</code>
                </div>
                {group.framing && <p className="ea-ep-framing">{group.framing}</p>}
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
              <h3>Ready to trade on signal others miss?</h3>
              <p>
                Request an evaluation key and we&apos;ll get you a scoped token wired to the signal
                families your models need.
              </p>
              <a href="mailto:api@ezana.world" className="ea-btn ea-btn--primary">
                Get API access <ArrowRight size={15} aria-hidden />
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
