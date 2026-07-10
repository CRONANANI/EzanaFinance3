'use client';

/* ============================================================================
 *  EZANA API — documentation landing page (/ezana-api)
 *  ----------------------------------------------------------------------------
 *  Docs-style page positioning the Ezana API as a signal-from-noise engine for
 *  traders and quant firms. All-white surfaces (separation via hairline borders
 *  only), a sticky left legend with scroll-spy (a sticky pill bar on mobile),
 *  Plus Jakarta Sans for text and JetBrains Mono (tabular-nums) for every
 *  number / path / method / code block. Restrained, self-animating SVG visuals
 *  render static under prefers-reduced-motion.
 *
 *  The global top nav comes from the root layout (ConditionalNavbar). Everything
 *  here is documentation/scaffolding — endpoints and payloads are illustrative
 *  placeholders, marked roadmap/coming-soon where not yet live.
 * ==========================================================================*/

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Terminal,
  KeyRound,
  Map,
  TrendingUp,
  Newspaper,
  Network,
  Zap,
  History,
  Gauge,
  Landmark,
  Banknote,
  Building2,
  LineChart,
  Rocket,
  Filter,
  AlertTriangle,
  Webhook,
  Database,
  GitBranch,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import './ezana-api.css';

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

const ENDPOINT_GROUPS = [
  {
    key: 'congress',
    title: 'Congressional trading',
    base: '/v1/congress',
    Icon: Landmark,
    framing:
      'Insider-flow signal — what informed, access-rich actors are trading, structured for signal extraction, not just raw disclosures.',
    routes: [
      {
        path: '/v1/congress/trades',
        desc: 'Disclosed House & Senate trades, filterable by member, ticker, party, and filing date — the raw substrate for an informed-flow factor.',
      },
      {
        path: '/v1/congress/trades/{id}',
        desc: 'A single disclosure with STOCK Act filing metadata and disclosure lag, to model the delay between the trade and when the market saw it.',
      },
      {
        path: '/v1/congress/members',
        desc: 'Roster of all 535 members with disclosure history and committee assignments, so you can weight signal by seat and sector oversight.',
      },
      {
        path: '/v1/congress/members/{id}/trades',
        desc: 'Full trade history for one member — build per-actor track records and conviction weights.',
      },
      {
        path: '/v1/congress/committees/{id}/activity',
        desc: 'Trading activity rolled up by committee, aligning flow with the sectors a committee actually oversees.',
      },
      {
        path: '/v1/congress/signals/insider-flow',
        desc: 'Pre-computed insider-flow score per ticker — a drop-in feature ranking names by informed-actor accumulation.',
      },
    ],
  },
  {
    key: 'lobbying',
    title: 'Lobbying & influence',
    base: '/v1/lobbying',
    Icon: Network,
    framing:
      'Influence-flow signal — map corporate influence spend to sector and price exposure before the thesis is consensus.',
    routes: [
      {
        path: '/v1/lobbying/filings',
        desc: 'LDA lobbying filings by registrant, client, issue area, and quarter — where policy money is moving and which issuers are exposed.',
      },
      {
        path: '/v1/lobbying/filings/{uuid}',
        desc: 'One filing in full, with issues lobbied, lobbyists, and reported spend.',
      },
      {
        path: '/v1/lobbying/clients/{id}',
        desc: 'Spend history and issue exposure for a single client, ready to join against your position book for a policy-risk overlay.',
      },
      {
        path: '/v1/lobbying/top-spenders',
        desc: 'Leaderboard of influence spend by client and sector over a window — spot ramps early.',
      },
      {
        path: '/v1/lobbying/issues/mix',
        desc: 'Breakdown of spend by issue area, so you can tilt toward the policy themes gaining budget.',
      },
      {
        path: '/v1/lobbying/registrants/{id}',
        desc: 'Activity for a lobbying firm across its client book — a cross-issuer influence network view.',
      },
      {
        path: '/v1/lobbying/signals/policy-exposure',
        desc: 'Per-ticker policy-exposure score blending spend, issues, and contract adjacency into one feature.',
      },
    ],
  },
  {
    key: 'fec',
    title: 'Campaign finance (FEC)',
    base: '/v1/fec',
    Icon: Banknote,
    framing:
      'Political-capital signal — who funds whom, tied back to the sectors and issuers with the most at stake.',
    routes: [
      {
        path: '/v1/fec/contributions',
        desc: 'Itemized contributions filterable by contributor, committee, cycle, and employer — map corporate and executive giving.',
      },
      {
        path: '/v1/fec/committees/{id}',
        desc: 'A committee’s receipts, disbursements, and affiliations over a cycle.',
      },
      {
        path: '/v1/fec/candidates/{id}/funding',
        desc: 'Funding profile for a candidate — sector concentration and top backers.',
      },
      {
        path: '/v1/fec/signals/sector-giving',
        desc: 'Net political giving by sector as a directional signal on regulatory posture.',
      },
    ],
  },
  {
    key: 'contracts',
    title: 'Government contracts (USASpending)',
    base: '/v1/contracts',
    Icon: Building2,
    framing:
      'Revenue-visibility signal — federal award flow mapped to publicly traded recipients, ahead of guidance.',
    routes: [
      {
        path: '/v1/contracts/awards',
        desc: 'Awarded federal contracts filterable by recipient, agency, NAICS, and date — mapped to public parents.',
      },
      {
        path: '/v1/contracts/recipients/{id}',
        desc: 'Award history for one recipient — backlog and momentum for an issuer.',
      },
      {
        path: '/v1/contracts/agencies/{id}/spending',
        desc: 'Spending by agency and program, to anticipate which vendors benefit.',
      },
      {
        path: '/v1/contracts/signals/award-momentum',
        desc: 'Per-ticker award-momentum score — acceleration in federal revenue exposure.',
      },
    ],
  },
  {
    key: 'predictions',
    title: 'Prediction markets',
    base: '/v1/predictions',
    Icon: Gauge,
    framing:
      'Consensus & odds signal — real-money probabilities for the events your positions are exposed to.',
    routes: [
      {
        path: '/v1/predictions/markets',
        desc: 'Live and historical prediction markets by topic and status — a real-money probability for each event.',
      },
      {
        path: '/v1/predictions/markets/{id}',
        desc: 'One market with current odds, liquidity, and resolution criteria.',
      },
      {
        path: '/v1/predictions/markets/{id}/history',
        desc: 'Point-in-time odds series for a market — the input to event-driven backtests.',
      },
      {
        path: '/v1/predictions/consensus',
        desc: 'Aggregated consensus probability across correlated markets for a theme.',
      },
      {
        path: '/v1/predictions/movers',
        desc: 'Markets with the largest odds moves over a window — where conviction is shifting fastest.',
      },
    ],
  },
  {
    key: 'news',
    title: 'News engineering',
    base: '/v1/news',
    Icon: Newspaper,
    framing:
      'The signal layer — news structured, entity-tagged, and semantically linked to tickers, events, and odds so headlines become machine-usable features.',
    routes: [
      {
        path: '/v1/news/search',
        desc: 'Semantic news search over structured, deduplicated articles — retrieve by meaning, not keywords.',
      },
      {
        path: '/v1/news/{id}/entities',
        desc: 'Entities resolved from one article to tickers, people, and issues — build per-name news-flow features.',
      },
      {
        path: '/v1/news/{id}/related-markets',
        desc: 'Prediction markets and securities an article is semantically linked to, with confidence scores.',
      },
      {
        path: '/v1/news/signals/odds-moves',
        desc: 'News items time-aligned to the odds moves they preceded — a news→consensus lead signal.',
      },
      {
        path: '/v1/news/sentiment/by-entity',
        desc: 'Rolling entity-level sentiment derived from structured news flow.',
      },
    ],
  },
  {
    key: 'markets',
    title: 'Market data & signals',
    base: '/v1/markets',
    Icon: LineChart,
    framing:
      'The price layer — the series you regress every other signal against, plus composite and correlation features.',
    routes: [
      {
        path: '/v1/markets/quotes',
        desc: 'Reference and end-of-day market data for a symbol universe — the price series behind every feature.',
      },
      {
        path: '/v1/markets/signals',
        desc: 'Composite Ezana signals blending the datasets above into a single score per name.',
      },
      {
        path: '/v1/signals/correlations',
        desc: 'Discovered relationships between obscure datasets and price — the non-obvious links you can trade around.',
      },
      {
        path: '/v1/signals/backtests/{id}',
        desc: 'Point-in-time backtest results for a signal spec, with disclosure lag preserved so history isn’t contaminated by hindsight.',
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

const QUERY_PARAMS = [
  { name: 'ticker', type: 'string', desc: 'Filter to a symbol (repeatable for a universe).' },
  { name: 'from', type: 'date', desc: 'Inclusive start date (ISO 8601, e.g. 2026-01-01).' },
  { name: 'to', type: 'date', desc: 'Inclusive end date (ISO 8601).' },
  { name: 'limit', type: 'int', desc: 'Page size, 1–200 (default 50).' },
  { name: 'cursor', type: 'string', desc: 'Opaque cursor from the previous page’s page.next.' },
];

const ERROR_CODES = [
  {
    code: '400',
    name: 'Bad Request',
    meaning: 'Malformed query — an invalid param, date, or cursor.',
  },
  { code: '401', name: 'Unauthorized', meaning: 'Missing or invalid bearer token.' },
  {
    code: '403',
    name: 'Forbidden',
    meaning: 'Key is valid but not scoped to this dataset or tier.',
  },
  { code: '404', name: 'Not Found', meaning: 'No resource matches the id/path.' },
  {
    code: '429',
    name: 'Too Many Requests',
    meaning: 'Rate limit exceeded — back off and retry after Reset.',
  },
  {
    code: '500',
    name: 'Server Error',
    meaning: 'Unexpected error on our side — safe to retry with backoff.',
  },
];

const COVERAGE_ROWS = [
  {
    dataset: 'Congressional trades',
    source: 'House Clerk · Senate eFD',
    depth: '2012 → present',
    cadence: 'Ingested continuously',
  },
  {
    dataset: 'Lobbying',
    source: 'Senate LDA',
    depth: '2013 → present',
    cadence: 'Quarterly + backfill',
  },
  { dataset: 'Campaign finance', source: 'FEC', depth: '2003 → present', cadence: 'Daily' },
  { dataset: 'Gov. contracts', source: 'USASpending', depth: '2008 → present', cadence: 'Daily' },
  {
    dataset: 'Prediction markets',
    source: 'Polymarket',
    depth: '2021 → present',
    cadence: 'Near real-time',
  },
  {
    dataset: 'News',
    source: 'Multi-source, structured',
    depth: 'Rolling 5-yr',
    cadence: 'Streaming',
  },
  {
    dataset: 'Market data',
    source: 'Reference + EOD',
    depth: '2000 → present',
    cadence: 'End of day',
  },
];

const CHANGELOG = [
  {
    date: '2026-07-01',
    text: 'Added News-engineering signal endpoints (odds-moves, sentiment-by-entity).',
  },
  {
    date: '2026-05-18',
    text: 'Correlations endpoint (/v1/signals/correlations) enters private beta.',
  },
  { date: '2026-03-09', text: 'Cursor pagination standardized across all list endpoints.' },
  { date: '2026-01-15', text: 'v1 congressional-trading + lobbying endpoints published.' },
];

const FAQ = [
  {
    q: 'How do I authenticate?',
    a: 'A bearer token in the Authorization header on every HTTPS request. Keys are scoped to your lease tier and datasets — see Authentication.',
  },
  {
    q: 'What are the rate limits?',
    a: 'Per-key and tier-dependent (60/min on Developer up to custom on Institution). Every response carries X-RateLimit-* headers; a 429 means back off until Reset.',
  },
  {
    q: 'Can I redistribute the data?',
    a: 'No wholesale redistribution of raw feeds. You may use signal and derived features in your own analysis and products; primary-source attribution is preserved in every payload.',
  },
  {
    q: 'Is there an SLA?',
    a: 'Institution leases include an uptime SLA and dedicated support. Lower tiers are best-effort. Ask us for specifics for your volume.',
  },
  {
    q: 'Do you offer backtest-ready history?',
    a: 'Yes — series are point-in-time with disclosure lag preserved, so backtests aren’t contaminated by hindsight. Depth varies by dataset (see Data coverage).',
  },
  {
    q: 'Are the signals investment advice?',
    a: 'No. Everything is informational inputs/features, not advice or a recommendation. You own how you model and trade around it.',
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

const CURL_SNIPPET = `curl https://api.ezana.world/v1/congress/trades?ticker=NVDA&limit=20 \\
  -H "Authorization: Bearer $EZANA_API_KEY" \\
  -H "Accept: application/json"`;

const JS_SNIPPET = `const res = await fetch(
  "https://api.ezana.world/v1/congress/trades?ticker=NVDA&limit=20",
  { headers: { Authorization: \`Bearer \${process.env.EZANA_API_KEY}\` } }
);
const { data, page } = await res.json();`;

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

const ERROR_ENVELOPE = `{
  "error": {
    "code": "rate_limited",
    "status": 429,
    "message": "Rate limit exceeded. Retry after the window resets.",
    "request_id": "req_7c1f0a"
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
  { key: 'news', label: 'News signals' },
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
            <p className="ea-modal-done-title">Request received — we&apos;ll be in touch.</p>
            <p>We review access requests manually and reply from api@ezana.world.</p>
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
  const tiles = ['Congress', 'Lobbying', 'FEC', 'Contracts', 'Predictions', 'News', 'Markets'];
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
            The Ezana API exposes the relationships between under-watched data — congressional
            trades, lobbying flows, prediction-market odds, and alternative signals — and how
            markets actually move, so traders and quant firms can act on signal others miss.
            It&apos;s powered by elite <strong>news engineering</strong>: we structure and enrich
            market-moving news into machine-usable signal, entity-tagged and semantically linked to
            the securities and events it touches.
          </p>
          <div className="ea-viz-frame ea-viz-frame--hero">
            <HeroSignal />
            <span className="ea-viz-cap">Illustrative — noise resolving into signal</span>
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
            Built for quant desks, systematic traders, and research teams. Documentation preview —
            several endpoints are marked <em>coming soon</em> while the API is being rolled out.
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
                    Request a scoped key at <a href="mailto:api@ezana.world">api@ezana.world</a> and
                    export it as <code>EZANA_API_KEY</code>.
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
                    Every list response returns a <code>data</code> array and a <code>page</code>{' '}
                    cursor. Follow <code>page.next</code> to paginate.
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
                <code>{CURL_SNIPPET}</code>
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
                        </div>
                        <p>{r.desc}</p>
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
              endpoint and choose event types — a new congressional filing for a watched ticker, a
              large prediction-market odds move, or a fresh news→market match above a confidence
              threshold. Deliveries are retried with backoff and signed with a per-subscription
              secret.
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
            <p>
              Every dataset traces to a primary source, with point-in-time history and a defined
              update cadence. Depth and cadence below are indicative.
            </p>
            <div className="ea-viz-frame">
              <CoverageStrip />
            </div>
            <div className="ea-table-wrap">
              <table className="ea-table">
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th>Source</th>
                    <th>History</th>
                    <th>Cadence</th>
                  </tr>
                </thead>
                <tbody>
                  {COVERAGE_ROWS.map((r) => (
                    <tr key={r.dataset}>
                      <td>{r.dataset}</td>
                      <td>{r.source}</td>
                      <td className="ea-mono">{r.depth}</td>
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
              exceeding your limit returns <code>429 Too Many Requests</code>.
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

          {/* Versioning */}
          <section id="versioning" className="ea-section">
            <h2>
              <GitBranch size={18} aria-hidden className="ea-h2-icon" />
              Versioning &amp; changelog
            </h2>
            <p>
              The API is versioned in the path (<code>/v1</code>). Within a version we only make
              additive changes — new endpoints and fields — never breaking ones. Breaking changes
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
                  Only a salted hash of each key is stored — never the raw secret. If our store
                  leaked, keys stay safe.
                </p>
              </div>
              <div className="ea-feature">
                <History size={18} aria-hidden />
                <h3>Rotation</h3>
                <p>
                  Rotate or revoke a key at any time; overlapping keys let you roll without
                  downtime.
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
