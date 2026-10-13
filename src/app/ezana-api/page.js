'use client';

/* ============================================================================
 *  EZANA API: documentation (/ezana-api)
 *  ----------------------------------------------------------------------------
 *  Endpoint groups, Live and Roadmap badges, tier cards and rate limits all
 *  render from src/lib/ezana-api/registry.js and tiers.js, the same source the
 *  /v1 router and the OpenAPI spec use, so the docs cannot drift from what the
 *  API serves. All-white surfaces, a sticky legend with scroll-spy, Plus
 *  Jakarta Sans for text and JetBrains Mono for paths, numbers and code.
 *  Visuals render static under prefers-reduced-motion.
 * ==========================================================================*/

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GROUPS, LIVE_ENDPOINTS, ENDPOINTS, PARAMS } from '@/lib/ezana-api/registry';
import { TIERS as API_TIERS, TIER_ORDER } from '@/lib/ezana-api/tiers';
import './ezana-api.css';

/* Bootstrap Icons in place of the old icon components; same props. */
function biIcon(name) {
  function BiIcon({ size = 16, className = '' }) {
    return (
      <i
        className={`bi ${name}${className ? ` ${className}` : ''}`}
        style={{ fontSize: size, lineHeight: 1 }}
        aria-hidden="true"
      />
    );
  }
  BiIcon.displayName = name;
  return BiIcon;
}
const ArrowRight = biIcon('bi-arrow-right');
const Terminal = biIcon('bi-terminal');
const KeyRound = biIcon('bi-key');
const Map = biIcon('bi-map');
const TrendingUp = biIcon('bi-graph-up-arrow');
const Newspaper = biIcon('bi-newspaper');
const Network = biIcon('bi-diagram-3');
const Zap = biIcon('bi-lightning-charge');
const History = biIcon('bi-clock-history');
const Gauge = biIcon('bi-speedometer2');
const Rocket = biIcon('bi-rocket-takeoff');
const Filter = biIcon('bi-funnel');
const AlertTriangle = biIcon('bi-exclamation-triangle');
const Webhook = biIcon('bi-broadcast');
const Database = biIcon('bi-database');
const GitBranch = biIcon('bi-git');
const ShieldCheck = biIcon('bi-shield-check');
const HelpCircle = biIcon('bi-question-circle');

/* Legend / scroll-spy order. */
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'getting-access', label: 'Getting access' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'pagination', label: 'Pagination' },
  { id: 'errors', label: 'Errors' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'data-coverage', label: 'Data coverage' },
  { id: 'rate-limits', label: 'Rate limits & terms' },
  { id: 'versioning', label: 'Versioning' },
  { id: 'security', label: 'Security' },
  { id: 'faq', label: 'FAQ' },
  { id: 'roadmap', label: 'How we build & ship' },
];

const ENDPOINT_GROUPS = GROUPS.map((g) => ({
  ...g,
  Icon: biIcon(g.icon),
  routes: g.routes.map((r) => ({ ...r, desc: r.summary })),
}));

const TIERS = TIER_ORDER.map((id) => API_TIERS[id]);

const QUERY_PARAMS = ['ticker', 'from', 'to', 'limit', 'cursor'].map((name) => ({
  name,
  type: PARAMS[name].type,
  desc: PARAMS[name].desc,
}));

const ERROR_CODES = [
  {
    code: '400',
    name: 'invalid_param',
    meaning: 'An unknown, malformed or out-of-range parameter or cursor.',
  },
  { code: '401', name: 'invalid_key', meaning: 'Missing, unknown, revoked or expired key.' },
  {
    code: '403',
    name: 'not_in_scope',
    meaning: 'The key is valid but not scoped for this dataset.',
  },
  {
    code: '404',
    name: 'not_found',
    meaning: 'No endpoint at the path, or no record with that id.',
  },
  {
    code: '429',
    name: 'rate_limited',
    meaning: 'Rate limit exceeded. Wait for Retry-After seconds.',
  },
  {
    code: '500',
    name: 'internal_error',
    meaning: 'Unexpected error on our side. Safe to retry with backoff.',
  },
  { code: '501', name: 'not_available', meaning: 'A Roadmap endpoint that is not built yet.' },
];

const COVERAGE_ROWS = [
  {
    dataset: 'Congressional trades',
    source: 'House Clerk, Senate Office of Public Records',
    cadence: 'Daily',
  },
  { dataset: 'Committee assignments', source: 'congress-legislators project', cadence: 'Daily' },
  { dataset: 'Lobbying', source: 'Senate LDA', cadence: 'Hourly' },
  { dataset: 'Campaign finance', source: 'FEC', cadence: 'Hourly' },
  { dataset: 'Government contracts', source: 'USAspending', cadence: 'Daily' },
  { dataset: 'Prediction markets', source: 'Polymarket', cadence: 'Every two hours' },
  { dataset: '13F, activist stakes, whale moves', source: 'SEC EDGAR', cadence: 'Hourly' },
  { dataset: 'Insider transactions (Form 4)', source: 'SEC EDGAR', cadence: 'Twice an hour' },
];

const CHANGELOG = [
  {
    date: '2026-10-06',
    text: `v1 is live: ${LIVE_ENDPOINTS.length} endpoints over congressional trades, committees, lobbying, campaign finance, contracts, prediction markets and SEC filings, with issued keys, per-key rate limits, usage metering and an OpenAPI spec.`,
  },
];

const FAQ = [
  {
    q: 'How do I authenticate?',
    a: 'A bearer token in the Authorization header on every HTTPS request. Keys are scoped to your tier and datasets; see Authentication.',
  },
  {
    q: 'What are the rate limits?',
    a: 'Per key and per tier, from 60 a minute on Developer to custom on Institution. Every response carries X-RateLimit-* headers; a 429 carries Retry-After.',
  },
  {
    q: 'Can I redistribute the data?',
    a: 'No wholesale redistribution of raw feeds. You may use the data and derived features in your own analysis and products; every response names its public source in meta.source.',
  },
  {
    q: 'Is there an SLA?',
    a: 'Institution leases include an uptime SLA and dedicated support. Lower tiers are best-effort. Ask us for specifics for your volume.',
  },
  {
    q: 'Do you offer backtest-ready history?',
    a: 'Trades carry both the trade date and the disclosure date, and filings carry their filing dates, so you can backtest on what was public at the time. Point-in-time odds history is on the roadmap.',
  },
  {
    q: 'Are the signals investment advice?',
    a: 'No. Everything is informational inputs/features, not advice or a recommendation. You own how you model and trade around it.',
  },
];

const ROADMAP_STEPS = [
  {
    n: 1,
    title: 'Request, approval, claim (live)',
    body: 'Submit the access form. On approval we email a one-time claim link; the key is generated when you claim it and shown once. Only a keyed hash of each key is stored. Developer keys are self-serve in Settings.',
  },
  {
    n: 2,
    title: 'Versioned /v1 routes (live)',
    body: 'Stable, versioned REST routes over the same sourced data that powers the product. Endpoints not built yet answer 501 and are marked Roadmap here.',
  },
  {
    n: 3,
    title: 'Per-key rate limits and metering (live)',
    body: 'Every request is authenticated, rate-limited per key and metered per key, day and endpoint.',
  },
  {
    n: 4,
    title: 'Billing tie-in (roadmap)',
    body: 'Metered usage feeding billing for the Trader and Quant Firm tiers. Until then, paid tiers are invoiced directly.',
  },
  {
    n: 5,
    title: 'Docs, OpenAPI and changelog (live)',
    body: 'This page, the OpenAPI spec at /v1/openapi.json and the changelog are generated from the same endpoint registry the API serves.',
  },
];

const CURL_SNIPPET = `curl -H "Authorization: Bearer $EZANA_API_KEY" \\
  "https://ezana.world/v1/congress/trades?ticker=NVDA&limit=5"`;

const JS_SNIPPET = `const res = await fetch(
  "https://ezana.world/v1/congress/trades?ticker=NVDA&limit=5",
  { headers: { Authorization: \`Bearer \${process.env.EZANA_API_KEY}\` } }
);
const { data, page, meta } = await res.json();`;

/* The response shape, with placeholder values. */
const RESPONSE_SNIPPET = `{
  "data": [
    {
      "id": "<uuid>",
      "member": {
        "bioguide_id": "<bioguide id>",
        "name": "<member name>",
        "party": "D",
        "chamber": "house",
        "state": "CA"
      },
      "ticker": "NVDA",
      "asset": "<asset description>",
      "transaction": "purchase",
      "amount_min": 15001,
      "amount_max": 50000,
      "owner": "self",
      "traded_at": "<YYYY-MM-DD>",
      "disclosed_at": "<YYYY-MM-DD>",
      "disclosure_lag_days": 19,
      "source": "House Clerk"
    }
  ],
  "page": { "limit": 5, "has_more": true, "next": "<cursor>" },
  "meta": { "request_id": "<uuid>", "source": "House Clerk and Senate Office of Public Records", "delayed_days": 30 }
}`;

const ERROR_ENVELOPE = `{
  "error": {
    "code": "rate_limited",
    "status": 429,
    "message": "Rate limit exceeded. Retry after the window resets.",
    "request_id": "<uuid>",
    "docs": "https://ezana.world/ezana-api#rate-limits"
  }
}`;

function Method({ method = 'GET' }) {
  return <span className={`ea-method ea-method--${method.toLowerCase()}`}>{method}</span>;
}

const REQ_DATASETS = [
  { key: 'congress', label: 'Congressional trading' },
  { key: 'lobbying', label: 'Lobbying & influence' },
  { key: 'fec', label: 'Campaign finance' },
  { key: 'contracts', label: 'Gov contracts' },
  { key: 'predictions', label: 'Prediction markets' },
  { key: 'committees', label: 'Committee activity' },
  { key: 'institutional', label: '13F, activist, whale moves' },
  { key: 'insider', label: 'Insider transactions' },
  { key: 'news', label: 'News signals (roadmap)' },
];
const REQ_ROLES = [
  { value: '', label: 'Select…' },
  { value: 'trader', label: 'Trader' },
  { value: 'quant_firm', label: 'Quant firm' },
  { value: 'institution', label: 'Institution' },
  { value: 'developer', label: 'Developer' },
  { value: 'other', label: 'Other' },
];
const REQ_VOLUMES = [
  { value: '', label: 'Select…' },
  { value: '<10k', label: '< 10k / month' },
  { value: '10-100k', label: '10–100k / month' },
  { value: '100k-1M', label: '100k–1M / month' },
  { value: '1M+', label: '1M+ / month' },
];

/* ── Accessible request-access modal (ESC/overlay close, focus trap) ── */
function RequestAccessModal({ open, onClose }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    useCase: '',
    volume: '',
  });
  const [datasets, setDatasets] = useState([]);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('');

  // Reset when (re)opened.
  useEffect(() => {
    if (open) {
      setForm({ name: '', email: '', company: '', role: '', useCase: '', volume: '' });
      setDatasets([]);
      setErrors({});
      setStatus('idle');
      setErrorMsg('');
    }
  }, [open]);

  // Focus trap + Escape + body scroll lock while open.
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = dialogRef.current;
    const first = el?.querySelector('input, textarea, select, button');
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !el) return;
      const focusables = el.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
      );
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleDataset = (k) =>
    setDatasets((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));

  const submit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    setErrors({});
    try {
      const res = await fetch('/api/ezana-api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, datasets }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setStatus('done');
        return;
      }
      if (data?.fields) setErrors(data.fields);
      setErrorMsg(data?.error || `Request failed (HTTP ${res.status}).`);
      setStatus('error');
    } catch {
      setErrorMsg('Could not reach the server. Please check your connection and try again.');
      setStatus('error');
    }
  };

  return (
    <div className="ea-modal-overlay" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="ea-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ea-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ea-modal-head">
          <h2 id="ea-modal-title">Request API access</h2>
          <button type="button" className="ea-modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {status === 'done' ? (
          <div className="ea-modal-done">
            <p className="ea-modal-done-title">Request received.</p>
            <p>We review requests within two business days and email you a claim link.</p>
            <button type="button" className="ea-btn ea-btn--primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="ea-modal-body" onSubmit={submit} noValidate>
            {errorMsg && (
              <p className="ea-modal-error" role="alert">
                {errorMsg}
              </p>
            )}
            <label className="ea-field">
              <span>
                Name <em>*</em>
              </span>
              <input type="text" value={form.name} onChange={set('name')} required />
              {errors.name && <small className="ea-field-err">{errors.name}</small>}
            </label>
            <label className="ea-field">
              <span>
                Work email <em>*</em>
              </span>
              <input type="email" value={form.email} onChange={set('email')} required />
              {errors.email && <small className="ea-field-err">{errors.email}</small>}
            </label>
            <label className="ea-field">
              <span>Company / firm</span>
              <input type="text" value={form.company} onChange={set('company')} />
            </label>
            <div className="ea-field-row">
              <label className="ea-field">
                <span>Role</span>
                <select value={form.role} onChange={set('role')}>
                  {REQ_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ea-field">
                <span>Expected monthly volume</span>
                <select value={form.volume} onChange={set('volume')}>
                  {REQ_VOLUMES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="ea-field">
              <span>
                How will you use the Ezana API? <em>*</em>
              </span>
              <textarea rows={3} value={form.useCase} onChange={set('useCase')} required />
              {errors.useCase && <small className="ea-field-err">{errors.useCase}</small>}
            </label>
            <div className="ea-field">
              <span>Datasets of interest</span>
              <div className="ea-chips">
                {REQ_DATASETS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    className={`ea-chip${datasets.includes(d.key) ? ' is-on' : ''}`}
                    aria-pressed={datasets.includes(d.key)}
                    onClick={() => toggleDataset(d.key)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="ea-btn ea-btn--primary ea-modal-submit"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'Sending…' : 'Send request'}
              {status !== 'submitting' && <ArrowRight size={15} aria-hidden />}
            </button>
            <p className="ea-modal-alt">
              or email <a href="mailto:api@ezana.world">api@ezana.world</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Visual 1: hero signal-from-noise sparkline (noisy grey → clean emerald) ── */
function HeroSignal() {
  const W = 340;
  const H = 96;
  // Deterministic noisy series + a smooth signal line derived from it.
  const n = 48;
  const noise = [];
  const signal = [];
  for (let i = 0; i < n; i += 1) {
    const x = (i / (n - 1)) * W;
    const base = H * 0.55 - Math.sin(i * 0.32) * 14 - (i / n) * 18;
    const jitter = (Math.sin(i * 12.9) * 43758.5) % 1;
    noise.push(`${x.toFixed(1)},${(base + (jitter - 0.5) * 26).toFixed(1)}`);
    signal.push(`${x.toFixed(1)},${base.toFixed(1)}`);
  }
  return (
    <svg
      className="ea-viz ea-viz--hero"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Signal resolving from noise"
    >
      <polyline className="ea-viz-noise" points={noise.join(' ')} fill="none" />
      <polyline className="ea-viz-signal" points={signal.join(' ')} fill="none" pathLength={1} />
    </svg>
  );
}

/* ── Visual 2: request → node → response flow motif (JSON types in) ── */
function RequestFlow() {
  const lines = ['{', '  "data": [ … ],', '  "page": { "next": "cursor_abc" }', '}'];
  return (
    <div className="ea-flow" aria-hidden>
      <span className="ea-flow-chip ea-flow-req">GET /v1/…</span>
      <svg className="ea-flow-wire" viewBox="0 0 60 12" preserveAspectRatio="none">
        <line x1="0" y1="6" x2="60" y2="6" />
        <circle className="ea-flow-pulse" cx="0" cy="6" r="2.5" />
      </svg>
      <span className="ea-flow-node">
        <Zap size={13} aria-hidden /> Ezana
      </span>
      <svg className="ea-flow-wire" viewBox="0 0 60 12" preserveAspectRatio="none">
        <line x1="0" y1="6" x2="60" y2="6" />
        <circle className="ea-flow-pulse ea-flow-pulse--2" cx="0" cy="6" r="2.5" />
      </svg>
      <span className="ea-flow-res">
        {lines.map((l, i) => (
          <span key={i} className="ea-flow-line" style={{ animationDelay: `${0.5 + i * 0.18}s` }}>
            {l}
          </span>
        ))}
      </span>
    </div>
  );
}

/* ── Visual 3: data-coverage freshness strip (decorative ticks) ── */
function CoverageStrip() {
  const tiles = ['Congress', 'Committees', 'Lobbying', 'FEC', 'Contracts', 'Predictions', 'SEC'];
  return (
    <div className="ea-cov-strip" aria-hidden>
      {tiles.map((t, i) => (
        <div key={t} className="ea-cov-tile">
          <span className="ea-cov-name">{t}</span>
          <span className="ea-cov-ticks" style={{ animationDelay: `${i * 0.22}s` }}>
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
      ))}
    </div>
  );
}

export default function EzanaApiPage() {
  const [active, setActive] = useState('overview');
  const [reqOpen, setReqOpen] = useState(false);

  // Scroll-spy: highlight the legend entry for the section currently in view.
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

  const scrollTo = (e, id) => {
    const el = typeof document !== 'undefined' && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    setActive(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
            The Ezana API serves the under-watched public data that moves markets, structured for
            models: congressional trades and the committees members sit on, lobbying spend, campaign
            finance, federal contracts, prediction-market odds, 13F holdings, activist stakes and
            insider transactions. Every record names its public source.
          </p>
          <div className="ea-viz-frame ea-viz-frame--hero">
            <HeroSignal />
            <span className="ea-viz-cap">Illustrative: noise resolving into signal</span>
          </div>
          <div className="ea-hero-actions">
            <a
              href="#getting-access"
              className="ea-btn ea-btn--primary"
              onClick={(e) => scrollTo(e, 'getting-access')}
            >
              Get API access <ArrowRight size={15} aria-hidden />
            </a>
            <a
              href="#endpoints"
              className="ea-btn ea-btn--ghost"
              onClick={(e) => scrollTo(e, 'endpoints')}
            >
              Explore the signal endpoints
            </a>
          </div>
          <p className="ea-hero-note">
            Built for quant desks, systematic traders and research teams. {LIVE_ENDPOINTS.length} of{' '}
            {ENDPOINTS.length} documented endpoints are live today; the rest are marked{' '}
            <em>Roadmap</em> and answer 501 until they ship.
          </p>
        </div>
      </header>

      {/* ── Docs body: sticky legend + content column ────────────────── */}
      <div className="ea-shell">
        <nav className="ea-sidenav" aria-label="API documentation sections">
          <p className="ea-sidenav-head">Documentation</p>
          <ul className="ea-legend">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={active === s.id ? 'is-active' : ''}
                  onClick={(e) => scrollTo(e, s.id)}
                >
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
              Most alternative data is noise until something connects it to price. The Ezana API
              turns overlooked public datasets into structured inputs: what informed actors trade,
              where policy money goes, who funds whom, which companies win federal contracts, what
              the crowd is betting, and what large funds, activists and insiders do. Every field
              traces to a primary source (House and Senate disclosures, Senate LDA, FEC,
              USAspending, Polymarket, SEC EDGAR), so a signal is auditable back to where it came
              from.
            </p>
            <p>
              It is built for traders, quant firms and research desks who want inputs, not opinions:
              features you can drop into a model, backtest and trade around. News engineering,
              cross-dimensional signals and lead-lag relationships are on the roadmap and marked as
              such below.
            </p>
            <div className="ea-feature-grid">
              <div className="ea-feature">
                <TrendingUp size={18} aria-hidden />
                <h3>Under-watched data, structured</h3>
                <p>
                  Disclosures and filings most desks never parse, cleaned, typed and joined to
                  tickers where the mapping is known.
                </p>
              </div>
              <div className="ea-feature">
                <Newspaper size={18} aria-hidden />
                <h3>
                  News engineering <span className="ea-soon ea-soon--inline">Roadmap</span>
                </h3>
                <p>
                  Market-moving news structured, entity-tagged and linked to tickers, events and
                  odds.
                </p>
              </div>
              <div className="ea-feature">
                <Gauge size={18} aria-hidden />
                <h3>Prediction-market signal</h3>
                <p>Real-money odds as a consensus probability for event-driven strategies.</p>
              </div>
              <div className="ea-feature">
                <Network size={18} aria-hidden />
                <h3>Linked identifiers</h3>
                <p>
                  Members by bioguide id, filers and issuers by SEC CIK, contractors by USAspending
                  recipient id, securities by ticker and CUSIP.
                </p>
              </div>
              <div className="ea-feature">
                <Zap size={18} aria-hidden />
                <h3>Fresh</h3>
                <p>Sources are synced hourly to daily; see Data coverage for each dataset.</p>
              </div>
              <div className="ea-feature">
                <History size={18} aria-hidden />
                <h3>Disclosure dates kept</h3>
                <p>
                  Trades carry the trade and the disclosure date, filings their filing date, so a
                  backtest only sees what was public at the time.
                </p>
              </div>
            </div>
          </section>

          {/* Quickstart */}
          <section id="quickstart" className="ea-section">
            <h2>
              <Rocket size={18} aria-hidden className="ea-h2-icon" />
              Quickstart
            </h2>
            <p>Three steps from zero to your first signal.</p>
            <ol className="ea-qs">
              <li className="ea-qs-step">
                <span className="ea-qs-num">1</span>
                <div>
                  <h3>Get a key</h3>
                  <p>
                    Create a free Developer key in{' '}
                    <Link href="/settings?tab=api">Settings, API</Link>, or request a higher tier
                    below. Export it as <code>EZANA_API_KEY</code>. Keys belong on your server,
                    never in a browser or an app.
                  </p>
                </div>
              </li>
              <li className="ea-qs-step">
                <span className="ea-qs-num">2</span>
                <div>
                  <h3>Make your first request</h3>
                  <div className="ea-code">
                    <div className="ea-code-head">
                      <Terminal size={13} aria-hidden /> curl
                    </div>
                    <pre>
                      <code>{CURL_SNIPPET}</code>
                    </pre>
                  </div>
                  <div className="ea-code">
                    <div className="ea-code-head">
                      <Terminal size={13} aria-hidden /> JavaScript
                    </div>
                    <pre>
                      <code>{JS_SNIPPET}</code>
                    </pre>
                  </div>
                </div>
              </li>
              <li className="ea-qs-step">
                <span className="ea-qs-num">3</span>
                <div>
                  <h3>Read the response</h3>
                  <p>
                    Every list response returns a <code>data</code> array, a <code>page</code>{' '}
                    cursor and <code>meta</code> (request id, public source, and the delay applied
                    to your key). Follow <code>page.next</code> to paginate.
                  </p>
                  <div className="ea-code">
                    <div className="ea-code-head">
                      <Terminal size={13} aria-hidden /> 200 OK
                    </div>
                    <pre>
                      <code>{RESPONSE_SNIPPET}</code>
                    </pre>
                  </div>
                </div>
              </li>
            </ol>
          </section>

          {/* Getting access */}
          <section id="getting-access" className="ea-section">
            <h2>Getting access</h2>
            <p>
              Developer keys are free and self-serve in{' '}
              <Link href="/settings?tab=api">Settings, API</Link> (up to two, data delayed 30 days).
              For the Trader, Quant Firm and Institution tiers, request access below: we review
              requests within two business days and email you a one-time claim link. Questions:{' '}
              <a href="mailto:api@ezana.world">api@ezana.world</a>.
            </p>
            <div className="ea-tiers">
              {TIERS.map((t) => (
                <div key={t.name} className={`ea-tier${t.highlight ? ' ea-tier--hl' : ''}`}>
                  <div className="ea-tier-head">
                    <span className="ea-tier-name">{t.name}</span>
                    <span className="ea-tier-detail">{t.detail}</span>
                  </div>
                  <div className="ea-tier-price">{t.price}</div>
                  <p className="ea-tier-limit">
                    {t.ratePerMin
                      ? `${t.ratePerMin.toLocaleString('en-US')} requests / min`
                      : 'Custom rate limit'}
                    {' · '}
                    {t.delayDays ? `${t.delayDays}-day delay` : 'no delay'}
                  </p>
                  <ul className="ea-tier-feats">
                    {t.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="ea-btn ea-btn--primary"
              onClick={() => setReqOpen(true)}
            >
              Request access <ArrowRight size={15} />
            </button>
          </section>

          {/* Authentication */}
          <section id="authentication" className="ea-section">
            <h2>Authentication</h2>
            <p>
              The API uses bearer-token authentication. Pass your key in the{' '}
              <code>Authorization</code> header on every request over HTTPS. Keys are scoped to your
              tier and datasets; never expose a key in client-side code. Keys look like{' '}
              <code>ezk_live_XXXXXXXX_…</code>, are shown once when created or claimed, and are
              stored only as a keyed hash. To rotate, create a new key, switch over, then revoke the
              old one. Keys in query strings are refused.
            </p>
            <div className="ea-code">
              <div className="ea-code-head">
                <KeyRound size={13} aria-hidden />
                Authenticated request
              </div>
              <pre>
                <code>{CURL_SNIPPET}</code>
              </pre>
            </div>
          </section>

          {/* Endpoints */}
          <section id="endpoints" className="ea-section">
            <h2>Endpoints</h2>
            <p>
              Endpoints are grouped by signal family under a versioned <code>/v1</code> prefix.
              Responses are JSON and list endpoints are cursor-paginated. <strong>Live</strong>{' '}
              endpoints serve data today; <strong>Roadmap</strong> endpoints answer{' '}
              <code>501 not_available</code> until they ship. The full contract, with parameters and
              response fields, is in the <a href="/v1/openapi.json">OpenAPI spec</a>.
            </p>
            <div className="ea-viz-frame">
              <RequestFlow />
            </div>
            {ENDPOINT_GROUPS.map((group) => {
              const GIcon = group.Icon;
              return (
                <div key={group.key} className="ea-ep-group">
                  <div className="ea-ep-group-head">
                    <h3>
                      <GIcon size={15} aria-hidden /> {group.title}
                    </h3>
                    <code className="ea-ep-base">{group.base}</code>
                  </div>
                  {group.framing && <p className="ea-ep-framing">{group.framing}</p>}
                  <ul className="ea-ep-list">
                    {group.routes.map((r) => (
                      <li key={r.path} className="ea-ep">
                        <div className="ea-ep-sig">
                          <Method method="GET" />
                          <code>{r.path}</code>
                          {r.status === 'live' ? (
                            <span className="ea-live">
                              <i className="bi bi-check-circle-fill" aria-hidden="true" /> Live
                            </span>
                          ) : (
                            <span className="ea-soon ea-soon--inline">
                              <i className="bi bi-hourglass-split" aria-hidden="true" /> Roadmap
                            </span>
                          )}
                        </div>
                        <p>
                          {r.desc}
                          {r.status === 'live' && r.scope ? (
                            <span className="ea-ep-scope"> Scope: {r.scope}.</span>
                          ) : null}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
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

          {/* Pagination */}
          <section id="pagination" className="ea-section">
            <h2>
              <Filter size={18} aria-hidden className="ea-h2-icon" />
              Pagination &amp; filtering
            </h2>
            <p>
              List endpoints use opaque cursor pagination. Each response includes a{' '}
              <code>page</code> object; when <code>page.has_more</code> is true, pass{' '}
              <code>page.next</code> back as the <code>cursor</code> query param to fetch the next
              page. Cursors are stable across inserts, so you never miss or double-count rows.
            </p>
            <div className="ea-table-wrap">
              <table className="ea-table">
                <thead>
                  <tr>
                    <th>Param</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {QUERY_PARAMS.map((p) => (
                    <tr key={p.name}>
                      <td>
                        <code>{p.name}</code>
                      </td>
                      <td className="ea-mono">{p.type}</td>
                      <td>{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Errors */}
          <section id="errors" className="ea-section">
            <h2>
              <AlertTriangle size={18} aria-hidden className="ea-h2-icon" />
              Errors
            </h2>
            <p>
              Errors return the appropriate HTTP status and a consistent JSON envelope with a stable{' '}
              <code>code</code>, a human <code>message</code>, and a <code>request_id</code> to
              quote in support.
            </p>
            <div className="ea-code">
              <div className="ea-code-head">
                <Terminal size={13} aria-hidden />
                Error envelope
              </div>
              <pre>
                <code>{ERROR_ENVELOPE}</code>
              </pre>
            </div>
            <div className="ea-table-wrap">
              <table className="ea-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Name</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {ERROR_CODES.map((e) => (
                    <tr key={e.code}>
                      <td className="ea-mono">{e.code}</td>
                      <td>{e.name}</td>
                      <td>{e.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Webhooks */}
          <section id="webhooks" className="ea-section">
            <h2>
              <Webhook size={18} aria-hidden className="ea-h2-icon" />
              Webhooks
              <span className="ea-soon ea-soon--inline">Roadmap</span>
            </h2>
            <p>
              Rather than poll, subscribe to events and let Ezana push. Register a signed HTTPS
              endpoint and choose event types: a new congressional filing for a watched ticker, a
              large prediction-market odds move, or a fresh news match above a confidence threshold.
              Deliveries are retried with backoff and signed with a per-subscription secret.
            </p>
            <div className="ea-code">
              <div className="ea-code-head">
                <Webhook size={13} aria-hidden />
                Example event
              </div>
              <pre>
                <code>{`{
  "type": "congress.trade.created",
  "created_at": "2026-06-02T14:05:00Z",
  "data": { "ticker": "NVDA", "member": "Rep. Jane Doe", "transaction": "purchase" }
}`}</code>
              </pre>
            </div>
            <p className="ea-soon-note">
              <span className="ea-soon">Roadmap</span> Webhook subscriptions are illustrative and
              not yet live.
            </p>
          </section>

          {/* Data coverage */}
          <section id="data-coverage" className="ea-section">
            <h2>
              <Database size={18} aria-hidden className="ea-h2-icon" />
              Data coverage &amp; freshness
            </h2>
            <p>Every live dataset traces to a primary source and is synced on the cadence below.</p>
            <div className="ea-viz-frame">
              <CoverageStrip />
            </div>
            <div className="ea-table-wrap">
              <table className="ea-table">
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th>Source</th>
                    <th>Cadence</th>
                  </tr>
                </thead>
                <tbody>
                  {COVERAGE_ROWS.map((r) => (
                    <tr key={r.dataset}>
                      <td>{r.dataset}</td>
                      <td>{r.source}</td>
                      <td>{r.cadence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Rate limits & terms */}
          <section id="rate-limits" className="ea-section">
            <h2>Rate limits &amp; terms</h2>
            <p>
              Rate limits are enforced per key and vary by lease tier (see{' '}
              <a href="#getting-access" onClick={(e) => scrollTo(e, 'getting-access')}>
                Getting access
              </a>
              ). Every response carries <code>X-RateLimit-Limit</code>,{' '}
              <code>X-RateLimit-Remaining</code>, and <code>X-RateLimit-Reset</code> headers;
              exceeding your limit returns <code>429 rate_limited</code> with{' '}
              <code>Retry-After</code>. Developer keys see data with a 30-day delay on trades,
              filings and transactions; <code>meta.delayed_days</code> says when a delay applied.
            </p>
            <div className="ea-table-wrap">
              <table className="ea-table">
                <thead>
                  <tr>
                    <th>Tier</th>
                    <th>Requests / min</th>
                    <th>Delay</th>
                    <th>Datasets</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((t) => (
                    <tr key={t.id}>
                      <td>{t.name}</td>
                      <td className="ea-mono">
                        {t.ratePerMin ? t.ratePerMin.toLocaleString('en-US') : 'Custom'}
                      </td>
                      <td className="ea-mono">{t.delayDays ? `${t.delayDays} days` : 'None'}</td>
                      <td>{t.scopes.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="ea-terms">
              <li>
                Data is licensed for your own analysis and products, with no wholesale
                redistribution of raw feeds.
              </li>
              <li>
                Every response names its public source in <code>meta.source</code>.
              </li>
              <li>Signals are informational, not investment advice.</li>
            </ul>
            <p className="ea-soon-note">
              <span className="ea-soon">Coming soon</span> Full terms of use and a data-license
              agreement will accompany general availability.
            </p>
          </section>

          {/* Versioning */}
          <section id="versioning" className="ea-section">
            <h2>
              <GitBranch size={18} aria-hidden className="ea-h2-icon" />
              Versioning &amp; changelog
            </h2>
            <p>
              The API is versioned in the path (<code>/v1</code>). Within a version we only make
              additive changes (new endpoints and fields), never breaking ones. Breaking changes
              ship under a new version with a migration window and deprecation notices.
            </p>
            <ul className="ea-changelog">
              {CHANGELOG.map((c) => (
                <li key={c.date}>
                  <span className="ea-changelog-date">{c.date}</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Security */}
          <section id="security" className="ea-section">
            <h2>
              <ShieldCheck size={18} aria-hidden className="ea-h2-icon" />
              Security
            </h2>
            <div className="ea-feature-grid">
              <div className="ea-feature">
                <KeyRound size={18} aria-hidden />
                <h3>Scoped keys</h3>
                <p>
                  Keys are bound to a lease tier and dataset scopes, so a key only reaches what
                  it&apos;s entitled to.
                </p>
              </div>
              <div className="ea-feature">
                <ShieldCheck size={18} aria-hidden />
                <h3>Hashed at rest</h3>
                <p>
                  Only a keyed hash (HMAC-SHA256) of each key is stored, never the raw secret, and
                  keys are compared in constant time.
                </p>
              </div>
              <div className="ea-feature">
                <History size={18} aria-hidden />
                <h3>Rotation</h3>
                <p>
                  Revoke a key at any time in Settings; it stops working on the next request. Create
                  the new key first to roll without downtime.
                </p>
              </div>
              <div className="ea-feature">
                <Terminal size={18} aria-hidden />
                <h3>TLS only</h3>
                <p>
                  All traffic is HTTPS (TLS 1.2+). Plaintext requests are rejected; never embed a
                  key client-side.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="ea-section">
            <h2>
              <HelpCircle size={18} aria-hidden className="ea-h2-icon" />
              FAQ
            </h2>
            <div className="ea-faq">
              {FAQ.map((f) => (
                <details key={f.q} className="ea-faq-item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Roadmap / build & distribution */}
          <section id="roadmap" className="ea-section">
            <h2>
              <Map size={18} aria-hidden className="ea-h2-icon" />
              How we build &amp; ship it
            </h2>
            <p>
              The outline below is how the Ezana API is built and distributed to users who request
              it. It is a roadmap; items ship incrementally.
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
                Create a Developer key in Settings, or request a higher tier for live data and more
                throughput.
              </p>
              <button
                type="button"
                className="ea-btn ea-btn--primary"
                onClick={() => setReqOpen(true)}
              >
                Request API access <ArrowRight size={15} aria-hidden />
              </button>
              <p className="ea-cta-alt">
                or email <a href="mailto:api@ezana.world">api@ezana.world</a>
              </p>
            </div>
          </section>
        </main>
      </div>

      <RequestAccessModal open={reqOpen} onClose={() => setReqOpen(false)} />
    </div>
  );
}
