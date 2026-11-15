'use client';

/**
 * Brokerage account page (/trading), Nov 2026 redesign.
 *
 * One flat page for the member's Ezana brokerage account and the outside
 * accounts they have linked. It is read-only: it shows status, balances and
 * positions, starts the existing application, and opens the existing connect
 * dialog. It places no orders and moves no money.
 *
 * States: loading, signed out, lookup error, no account (application entry
 * with the checklist gate), application in review, not approved, closed, and
 * active. Linked accounts load, fail and retry on their own.
 *
 * No sample content is ever shown here. Every figure comes from the member's
 * own account or reads N/A.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { AddPortfolioModal } from '@/components/home/AddPortfolioModal';
import {
  accountPhase,
  accountTypeLabel,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtPrice,
  fmtQty,
  fmtSignedMoney,
  fmtSignedPct,
  linkedTotals,
  mapLinkedHolding,
  mapPosition,
  maskAccountNumber,
  positionTotals,
  sortRows,
  statusLabel,
  tone,
} from '@/lib/trading/account-view';

const POSITION_COLS = [
  { key: 'symbol', label: 'Symbol', text: true },
  { key: 'qty', label: 'Qty' },
  { key: 'avgEntry', label: 'Avg entry' },
  { key: 'current', label: 'Current' },
  { key: 'marketValue', label: 'Market value' },
  { key: 'costBasis', label: 'Cost basis' },
  { key: 'unrealized', label: 'Unrealized $' },
  { key: 'unrealizedPct', label: 'Unrealized %' },
  { key: 'todayPct', label: 'Today %' },
];

const HOLDING_COLS = [
  { key: 'symbol', label: 'Symbol', text: true },
  { key: 'name', label: 'Name', text: true },
  { key: 'qty', label: 'Qty' },
  { key: 'avgCost', label: 'Avg cost' },
  { key: 'price', label: 'Price' },
  { key: 'marketValue', label: 'Market value' },
  { key: 'costBasis', label: 'Cost basis' },
  { key: 'gain', label: 'Gain or loss $' },
  { key: 'gainPct', label: 'Gain or loss %' },
  { key: 'pricing', label: 'Pricing', text: true },
];

function useSort(initialKey, initialDir = 'asc') {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir });
  const toggle = useCallback((key, text) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: text ? 'asc' : 'desc' },
    );
  }, []);
  return [sort, toggle];
}

function SortHead({ cols, sort, onSort }) {
  return (
    <thead>
      <tr>
        {cols.map((c) => {
          const on = sort.key === c.key;
          return (
            <th
              key={c.key}
              scope="col"
              className={c.text ? undefined : 'bka-num'}
              aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              <button
                type="button"
                className={`bka-th-btn${on ? ' is-on' : ''}`}
                onClick={() => onSort(c.key, c.text)}
              >
                {c.label}
                {on && (
                  <i
                    className={`bi bi-caret-${sort.dir === 'asc' ? 'up' : 'down'}-fill`}
                    aria-hidden="true"
                  />
                )}
              </button>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

function SkeletonTable({ cols, rows = 5, label }) {
  return (
    <div className="bka-table-wrap" aria-busy="true">
      <span className="bka-sr">{label}</span>
      <table className="bka-table" aria-hidden="true">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} scope="col" className={c.text ? undefined : 'bka-num'}>
                <span className="bka-th-label">{c.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {cols.map((c) => (
                <td key={c.key} className={c.text ? undefined : 'bka-num'}>
                  <span className="bka-skel bka-skel--cell" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineError({ children, onRetry }) {
  return (
    <p className="bka-error" role="alert">
      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
      <span>{children}</span>
      <button type="button" className="bka-text-btn bka-text-btn--accent" onClick={onRetry}>
        Retry
      </button>
    </p>
  );
}

function Signed({ value, format }) {
  return <span className={`bka-delta is-${tone(value)}`}>{format(value)}</span>;
}

function LegalLine() {
  return (
    <p className="bka-legal">
      Brokerage services provided by Alpaca Securities LLC, member{' '}
      <a href="https://www.finra.org" target="_blank" rel="noopener noreferrer">
        FINRA
      </a>
      /
      <a href="https://www.sipc.org" target="_blank" rel="noopener noreferrer">
        SIPC
      </a>
      . Investments involve risk and are not FDIC insured.
    </p>
  );
}

function MockLink() {
  return (
    <Link href="/trading/mock" className="bka-text-btn">
      Mock trading
    </Link>
  );
}

/* ── Ezana account: status and details (side column) ─────────────────── */

const PHASE_STATUS = {
  none: { label: 'Not opened', cls: 'is-muted', icon: 'bi-dash-circle' },
  review: { label: 'In review', cls: 'is-warn', icon: 'bi-hourglass-split' },
  refused: { label: 'Not approved', cls: 'is-neg', icon: 'bi-x-circle' },
  closed: { label: 'Closed', cls: 'is-muted', icon: 'bi-slash-circle' },
  active: { label: 'Active', cls: 'is-pos', icon: 'bi-check-circle' },
};

function AccountDetails({ phase, account }) {
  const st = PHASE_STATUS[phase];
  return (
    <section className="bka-section" aria-labelledby="bka-ezana-title">
      <h2 id="bka-ezana-title" className="bka-title">
        Ezana brokerage account
      </h2>
      <p className={`bka-status ${st.cls}`}>
        <i className={`bi ${st.icon}`} aria-hidden="true" />
        {st.label}
      </p>
      {account && (
        <dl className="bka-kv">
          <dt>Status</dt>
          <dd className="bka-kv__text">{statusLabel(account.account_status)}</dd>
          <dt>Submitted</dt>
          <dd>{fmtDate(account.application_submitted_at)}</dd>
          <dt>Approved</dt>
          <dd>{fmtDate(account.approved_at)}</dd>
          <dt>Account</dt>
          <dd>{maskAccountNumber(account.alpaca_account_number)}</dd>
        </dl>
      )}
      <p className="bka-caption">United States residents only. One account per member.</p>
    </section>
  );
}

/* ── Linked outside accounts (side column) ───────────────────────────── */

function LinkedAccounts({ linked, onRetry, onLink }) {
  const { status, accounts, totals } = linked;
  return (
    <section className="bka-section" aria-labelledby="bka-linked-title">
      <div className="bka-head">
        <h2 id="bka-linked-title" className="bka-title">
          Linked accounts
        </h2>
        {status === 'ready' && accounts.length > 0 && (
          <button type="button" className="bka-text-btn" onClick={onLink}>
            Link another account
          </button>
        )}
      </div>

      {status === 'loading' && (
        <div className="bka-acct-list" aria-busy="true">
          <span className="bka-sr">Loading linked accounts</span>
          {[0, 1].map((i) => (
            <div key={i} className="bka-acct" aria-hidden="true">
              <span className="bka-skel bka-skel--line" />
              <span className="bka-skel bka-skel--line bka-skel--short" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <InlineError onRetry={onRetry}>Linked accounts could not be loaded.</InlineError>
      )}

      {status === 'ready' && accounts.length === 0 && (
        <div className="bka-empty">
          <p className="bka-empty__line">No linked accounts yet.</p>
          <button type="button" className="bka-primary" onClick={onLink}>
            Link account
          </button>
        </div>
      )}

      {status === 'ready' && accounts.length > 0 && (
        <>
          <ul className="bka-acct-list">
            {accounts.map((a) => {
              const type = accountTypeLabel(a.type);
              return (
                <li key={a.id} className="bka-acct">
                  <div className="bka-acct__row">
                    <span className="bka-acct__name" title={a.institutionName || undefined}>
                      {a.institutionName || 'Linked institution'}
                    </span>
                    <span className="bka-mono bka-acct__bal">{fmtMoney(a.balance)}</span>
                  </div>
                  <p className="bka-acct__meta">
                    <span>{a.accountName || 'Account'}</span>
                    {a.mask ? <span className="bka-mono">..{a.mask}</span> : null}
                    {type ? <span>{type}</span> : null}
                  </p>
                  <p className="bka-acct__meta">
                    <span>Last synced</span>
                    <span className="bka-mono">{fmtDateTime(a.lastSyncedAt)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
          <dl className="bka-kv bka-kv--totals">
            <dt>Total value</dt>
            <dd>{fmtMoney(totals.marketValue)}</dd>
            <dt>Cost basis</dt>
            <dd>{fmtMoney(totals.costBasis)}</dd>
            <dt>Gain or loss</dt>
            <dd>
              <Signed value={totals.gain} format={fmtSignedMoney} />
              {totals.gainPct !== null && (
                <>
                  {' '}
                  <Signed value={totals.gainPct} format={fmtSignedPct} />
                </>
              )}
            </dd>
          </dl>
          <p className="bka-caption">
            Totals cover holdings only. Linked accounts are view only on this page.
          </p>
        </>
      )}
    </section>
  );
}

/* ── Main column sections ────────────────────────────────────────────── */

function SignedOut() {
  return (
    <section className="bka-section" aria-labelledby="bka-signin-title">
      <h2 id="bka-signin-title" className="bka-title">
        Sign in to see your brokerage account
      </h2>
      <p className="bka-body">
        This page shows your Ezana brokerage account and the outside accounts you have linked.
        Opening an account needs an Ezana sign-in and is for United States residents only.
      </p>
      <div className="bka-actions">
        <a href="/auth/continue" className="bka-primary">
          Sign in
        </a>
        <MockLink />
      </div>
    </section>
  );
}

function ApplicationEntry({ checklistComplete, onOpen }) {
  return (
    <section className="bka-section" aria-labelledby="bka-open-title">
      <h2 id="bka-open-title" className="bka-title">
        Open an Ezana brokerage account
      </h2>
      <p className="bka-notice">
        <i className="bi bi-info-circle" aria-hidden="true" />
        <span>
          The application is for United States residents only. It asks for a Social Security number
          and a United States address.
        </span>
      </p>
      <ol className="bka-steps">
        <li className="bka-step">
          <span className="bka-step__num bka-mono" aria-hidden="true">
            1
          </span>
          <div>
            <p className="bka-step__title">
              Complete your Getting Started checklist
              <span className={`bka-step__state ${checklistComplete ? 'is-pos' : 'is-muted'}`}>
                <i
                  className={`bi ${checklistComplete ? 'bi-check-lg' : 'bi-circle'}`}
                  aria-hidden="true"
                />
                {checklistComplete ? 'Done' : 'Not complete'}
              </span>
            </p>
            <p className="bka-step__desc">
              The required checklist tasks come first. The check runs again when the application is
              submitted.
            </p>
          </div>
        </li>
        <li className="bka-step">
          <span className="bka-step__num bka-mono" aria-hidden="true">
            2
          </span>
          <div>
            <p className="bka-step__title">Fill in the application</p>
            <p className="bka-step__desc">
              Six steps: personal details, address, employment and finances, investment profile,
              disclosures, then a review with your agreement.
            </p>
          </div>
        </li>
        <li className="bka-step">
          <span className="bka-step__num bka-mono" aria-hidden="true">
            3
          </span>
          <div>
            <p className="bka-step__title">Follow the status here</p>
            <p className="bka-step__desc">
              After you submit, this page shows the status of your application.
            </p>
          </div>
        </li>
      </ol>
      <div className="bka-actions">
        <button
          type="button"
          className="bka-primary"
          onClick={onOpen}
          disabled={!checklistComplete}
        >
          {checklistComplete ? 'Open brokerage account' : 'Complete checklist to unlock'}
        </button>
        <MockLink />
      </div>
      {!checklistComplete && (
        <p className="bka-caption">
          Complete the required tasks in your Getting Started checklist to enable account opening.
        </p>
      )}
    </section>
  );
}

const PHASE_COPY = {
  review: {
    title: 'Application in review',
    body: 'Your application has been received. Return to this page to see its status.',
  },
  refused: {
    title: 'Application not approved',
    body: 'Your application was not approved. No reason is available on this page.',
  },
  closed: {
    title: 'Account closed',
    body: 'This brokerage account is not open for trading.',
  },
};

function ApplicationStatus({ phase, account }) {
  const copy = PHASE_COPY[phase];
  return (
    <section className="bka-section" aria-labelledby="bka-app-title">
      <h2 id="bka-app-title" className="bka-title">
        {copy.title}
      </h2>
      <p className="bka-body">{copy.body}</p>
      <dl className="bka-kv">
        <dt>Status</dt>
        <dd className="bka-kv__text">{statusLabel(account.account_status)}</dd>
        <dt>Submitted</dt>
        <dd>{fmtDate(account.application_submitted_at)}</dd>
      </dl>
      <div className="bka-actions">
        <MockLink />
        {phase !== 'review' && (
          <Link href="/help-center" className="bka-text-btn">
            Help center
          </Link>
        )}
      </div>
    </section>
  );
}

const FIGURES = [
  { key: 'equity', label: 'Equity', icon: 'bi-wallet2' },
  { key: 'buying_power', label: 'Buying power', icon: 'bi-lightning-charge' },
  { key: 'cash', label: 'Cash', icon: 'bi-cash-stack' },
];

function FigureStrip({ portfolio, onRefresh }) {
  const { status, account, positions, loadedAt } = portfolio;
  const loading = status === 'loading';
  return (
    <section className="bka-strip" aria-label="Account figures">
      <dl className="bka-figs" aria-busy={loading || undefined}>
        {FIGURES.map((f) => (
          <div key={f.key} className="bka-fig">
            <i className={`bi ${f.icon} bka-fig__icon`} aria-hidden="true" />
            <div>
              <dt className="bka-fig__label">{f.label}</dt>
              <dd className="bka-fig__value">
                {loading ? <span className="bka-skel bka-skel--fig" /> : fmtMoney(account?.[f.key])}
              </dd>
            </div>
          </div>
        ))}
        <div className="bka-fig">
          <i className="bi bi-briefcase bka-fig__icon" aria-hidden="true" />
          <div>
            <dt className="bka-fig__label">Open positions</dt>
            <dd className="bka-fig__value">
              {loading ? (
                <span className="bka-skel bka-skel--fig bka-skel--short" />
              ) : status === 'ready' ? (
                positions.length
              ) : (
                'N/A'
              )}
            </dd>
          </div>
        </div>
      </dl>
      <div className="bka-strip__side">
        <div className="bka-actions bka-actions--end">
          <button type="button" className="bka-text-btn" onClick={onRefresh} disabled={loading}>
            Refresh
          </button>
          <MockLink />
        </div>
        <p className="bka-caption bka-strip__stamp">
          {loadedAt ? (
            <>
              Figures loaded <span className="bka-mono">{fmtDateTime(loadedAt)}</span>
            </>
          ) : (
            'Figures load when the page opens'
          )}
        </p>
      </div>
    </section>
  );
}

function Positions({ portfolio, onRetry }) {
  const { status, positions } = portfolio;
  const [sort, onSort] = useSort('symbol');
  const rows = useMemo(() => sortRows(positions, sort.key, sort.dir), [positions, sort]);
  const totals = useMemo(() => positionTotals(positions), [positions]);
  return (
    <section className="bka-section" aria-labelledby="bka-pos-title">
      <h2 id="bka-pos-title" className="bka-title">
        Positions
      </h2>
      {status === 'loading' && <SkeletonTable cols={POSITION_COLS} label="Loading positions" />}
      {status === 'error' && (
        <InlineError onRetry={onRetry}>
          Account figures and positions could not be loaded.
        </InlineError>
      )}
      {status === 'ready' && rows.length === 0 && (
        <div className="bka-empty">
          <p className="bka-empty__line">No open positions in this account.</p>
          <button type="button" className="bka-text-btn bka-text-btn--accent" onClick={onRetry}>
            Refresh
          </button>
        </div>
      )}
      {status === 'ready' && rows.length > 0 && (
        <div className="bka-table-wrap">
          <table className="bka-table">
            <SortHead cols={POSITION_COLS} sort={sort} onSort={onSort} />
            <tbody>
              {rows.map((p) => (
                <tr key={p.symbol}>
                  <td className="bka-sym">{p.symbol}</td>
                  <td className="bka-num">{fmtQty(p.qty)}</td>
                  <td className="bka-num">{fmtPrice(p.avgEntry)}</td>
                  <td className="bka-num">{fmtPrice(p.current)}</td>
                  <td className="bka-num">{fmtPrice(p.marketValue)}</td>
                  <td className="bka-num">{fmtPrice(p.costBasis)}</td>
                  <td className="bka-num">
                    <Signed value={p.unrealized} format={fmtSignedMoney} />
                  </td>
                  <td className="bka-num">
                    <Signed value={p.unrealizedPct} format={fmtSignedPct} />
                  </td>
                  <td className="bka-num">
                    <Signed value={p.todayPct} format={fmtSignedPct} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="bka-total">
                  Total
                </th>
                <td className="bka-num">N/A</td>
                <td className="bka-num">N/A</td>
                <td className="bka-num">N/A</td>
                <td className="bka-num">{fmtPrice(totals.marketValue)}</td>
                <td className="bka-num">{fmtPrice(totals.costBasis)}</td>
                <td className="bka-num">
                  <Signed value={totals.unrealized} format={fmtSignedMoney} />
                </td>
                <td className="bka-num">
                  <Signed value={totals.unrealizedPct} format={fmtSignedPct} />
                </td>
                <td className="bka-num">N/A</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="bka-notice bka-notice--foot">
        <i className="bi bi-info-circle" aria-hidden="true" />
        <span>
          Order entry, order history, deposits and withdrawals are not available on this page yet.
        </span>
      </p>
    </section>
  );
}

function LinkedHoldings({ linked, onRetry }) {
  const { status, holdings, accounts } = linked;
  const [sort, onSort] = useSort('marketValue', 'desc');
  const rows = useMemo(() => sortRows(holdings, sort.key, sort.dir), [holdings, sort]);
  if (status === 'error') return null;
  if (status === 'ready' && accounts.length === 0) return null;
  return (
    <section className="bka-section" aria-labelledby="bka-hold-title">
      <div className="bka-head">
        <h2 id="bka-hold-title" className="bka-title">
          Linked holdings
        </h2>
        {status === 'ready' && (
          <button type="button" className="bka-text-btn" onClick={onRetry}>
            Refresh
          </button>
        )}
      </div>
      {status === 'loading' && (
        <SkeletonTable cols={HOLDING_COLS} rows={4} label="Loading linked holdings" />
      )}
      {status === 'ready' && rows.length === 0 && (
        <div className="bka-empty">
          <p className="bka-empty__line">Your linked accounts report no holdings.</p>
          <button type="button" className="bka-text-btn bka-text-btn--accent" onClick={onRetry}>
            Refresh
          </button>
        </div>
      )}
      {status === 'ready' && rows.length > 0 && (
        <div className="bka-table-wrap">
          <table className="bka-table bka-table--wide">
            <SortHead cols={HOLDING_COLS} sort={sort} onSort={onSort} />
            <tbody>
              {rows.map((h) => (
                <tr key={h.symbol}>
                  <td className="bka-sym">{h.symbol || 'N/A'}</td>
                  <td className="bka-name" title={h.name || undefined}>
                    {h.name || 'N/A'}
                  </td>
                  <td className="bka-num">{fmtQty(h.qty)}</td>
                  <td className="bka-num">{fmtPrice(h.avgCost)}</td>
                  <td className="bka-num">{fmtPrice(h.price)}</td>
                  <td className="bka-num">{fmtPrice(h.marketValue)}</td>
                  <td className="bka-num">{fmtPrice(h.costBasis)}</td>
                  <td className="bka-num">
                    <Signed value={h.gain} format={fmtSignedMoney} />
                  </td>
                  <td className="bka-num">
                    <Signed value={h.gainPct} format={fmtSignedPct} />
                  </td>
                  <td className="bka-pricing">{h.pricing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status === 'ready' && rows.length > 0 && (
        <p className="bka-caption">
          Holdings are combined across your linked accounts. Gain or loss is against cost and reads
          N/A where the institution reports no cost.
        </p>
      )}
    </section>
  );
}

function BootSkeleton() {
  return (
    <div className="bka-grid" aria-busy="true">
      <span className="bka-sr">Loading your brokerage account</span>
      <div className="bka-main" aria-hidden="true">
        <div className="bka-section">
          <span className="bka-skel bka-skel--title" />
          <span className="bka-skel bka-skel--line" />
          <span className="bka-skel bka-skel--line bka-skel--short" />
          <span className="bka-skel bka-skel--btn" />
        </div>
      </div>
      <div className="bka-rule" aria-hidden="true" />
      <aside className="bka-side" aria-hidden="true">
        <div className="bka-section">
          <span className="bka-skel bka-skel--title" />
          <span className="bka-skel bka-skel--line" />
          <span className="bka-skel bka-skel--line bka-skel--short" />
        </div>
      </aside>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

const EMPTY_PORTFOLIO = { status: 'idle', account: null, positions: [], loadedAt: null };
const EMPTY_LINKED = {
  status: 'idle',
  accounts: [],
  holdings: [],
  totals: linkedTotals([]),
};

export function BrokerageAccountPage() {
  const router = useRouter();
  const [boot, setBoot] = useState({ status: 'loading' });
  const [portfolio, setPortfolio] = useState(EMPTY_PORTFOLIO);
  const [linked, setLinked] = useState(EMPTY_LINKED);
  const [connectOpen, setConnectOpen] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /* The same reads the page has always made: the signed-in user, their
     brokerage account row (then the older account record), and the checklist
     marker. A failed account lookup is an error with Retry, never "no account". */
  const loadUserData = useCallback(async () => {
    setBoot({ status: 'loading' });
    try {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) {
        if (alive.current) setBoot({ status: 'signed-out' });
        return;
      }

      let account = null;
      const { data: br, error: brErr } = await supabase
        .from('brokerage_accounts')
        .select('*')
        .eq('user_id', u.id)
        .maybeSingle();
      if (brErr) throw brErr;

      if (br) {
        account = br;
      } else {
        const { data: legacy, error: legacyErr } = await supabase
          .from('alpaca_accounts')
          .select('*')
          .eq('user_id', u.id)
          .maybeSingle();
        if (legacyErr) throw legacyErr;
        if (legacy) {
          account = {
            account_status: legacy.account_status,
            alpaca_account_id: legacy.alpaca_account_id,
            _legacy: true,
          };
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('checklist_completed')
        .eq('id', u.id)
        .single();

      if (alive.current) {
        setBoot({
          status: 'ready',
          account,
          checklistComplete: !!profile?.checklist_completed,
        });
      }
    } catch {
      if (alive.current) setBoot({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const phase = boot.status === 'ready' ? accountPhase(boot.account) : null;

  /* Balances and positions for an active account (the same request the old
     Trading dashboard subpage made). */
  const loadPortfolio = useCallback(async () => {
    setPortfolio((p) => ({ ...p, status: 'loading' }));
    try {
      const res = await fetch('/api/trading/portfolio');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      if (!alive.current) return;
      setPortfolio({
        status: 'ready',
        account: json.account || null,
        positions: (Array.isArray(json.positions) ? json.positions : []).map(mapPosition),
        loadedAt: new Date(),
      });
    } catch {
      if (alive.current) setPortfolio({ ...EMPTY_PORTFOLIO, status: 'error' });
    }
  }, []);

  useEffect(() => {
    if (phase === 'active') loadPortfolio();
  }, [phase, loadPortfolio]);

  /* Linked outside accounts and their holdings (the same request Home makes). */
  const loadLinked = useCallback(async () => {
    setLinked((l) => ({ ...l, status: 'loading' }));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No session');
      const res = await fetch('/api/portfolio/holdings', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (!alive.current) return;
      const holdings = (Array.isArray(data.aggregated) ? data.aggregated : []).map(
        mapLinkedHolding,
      );
      setLinked({
        status: 'ready',
        accounts: Array.isArray(data.accounts) ? data.accounts : [],
        holdings,
        totals: linkedTotals(holdings),
      });
    } catch {
      if (alive.current) setLinked({ ...EMPTY_LINKED, status: 'error' });
    }
  }, []);

  useEffect(() => {
    if (boot.status === 'ready') loadLinked();
  }, [boot.status, loadLinked]);

  /* The server decides again when the application is submitted. */
  const handleOpenAccount = () => {
    if (!boot.checklistComplete) return;
    router.push('/trading/open-account');
  };

  const openConnect = () => setConnectOpen(true);

  return (
    <div className="bka-page dashboard-page-inset ez-canvas">
      <h1 className="bka-sr">Brokerage account</h1>

      {boot.status === 'loading' && <BootSkeleton />}

      {boot.status === 'error' && (
        <section className="bka-section" aria-label="Brokerage account">
          <InlineError onRetry={loadUserData}>
            Your brokerage account could not be loaded.
          </InlineError>
          <div className="bka-actions">
            <MockLink />
          </div>
        </section>
      )}

      {boot.status === 'signed-out' && <SignedOut />}

      {boot.status === 'ready' && (
        <>
          {phase === 'active' && <FigureStrip portfolio={portfolio} onRefresh={loadPortfolio} />}
          <div className="bka-grid">
            <div className="bka-main">
              {phase === 'none' && (
                <ApplicationEntry
                  checklistComplete={boot.checklistComplete}
                  onOpen={handleOpenAccount}
                />
              )}
              {(phase === 'review' || phase === 'refused' || phase === 'closed') && (
                <ApplicationStatus phase={phase} account={boot.account} />
              )}
              {phase === 'active' && <Positions portfolio={portfolio} onRetry={loadPortfolio} />}
              <LinkedHoldings linked={linked} onRetry={loadLinked} />
            </div>
            <div className="bka-rule" aria-hidden="true" />
            <aside className="bka-side" aria-label="Accounts">
              <AccountDetails phase={phase} account={boot.account} />
              <LinkedAccounts linked={linked} onRetry={loadLinked} onLink={openConnect} />
            </aside>
          </div>
          <AddPortfolioModal
            open={connectOpen}
            onClose={() => setConnectOpen(false)}
            onConnected={() => {
              setConnectOpen(false);
              loadLinked();
            }}
          />
        </>
      )}

      <LegalLine />
    </div>
  );
}

export default BrokerageAccountPage;
