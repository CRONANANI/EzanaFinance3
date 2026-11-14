'use client';

/**
 * Home dashboard sections B to I (Nov 2026 redesign). Every section reads
 * the one derived snapshot from src/lib/dashboard/derive.js, so the same
 * number never disagrees with itself across cards.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import s from '@/app/(dashboard)/home-dashboard/dashboard.module.css';
import { CustomDateCalendar } from '@/components/ui/CustomDateCalendar';
import {
  HOLDING_RANGES,
  HOLDINGS_PAGE,
  NA,
  SNAPSHOT_RANGES,
  TXN_ROWS,
  diversificationBadge,
  fmtCompactMoney,
  fmtDate,
  fmtMoney,
  fmtQty,
  fmtSignedMoney,
  fmtSignedPct,
  riskBadge,
  tone,
} from '@/lib/dashboard/derive';
import { SnapshotChart } from './SnapshotChart';
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  InfoTip,
  Segmented,
  Signed,
  Skeleton,
  cx,
} from './primitives';

const tradeHref = (t) => `/trading/mock?symbol=${encodeURIComponent(t)}`;

/* ── B · Greeting and actions ───────────────────────────────────────── */

export function Greeting({ firstName, greeting, longDate, data, mode, loading }) {
  const pct = data?.totals.totalReturnPct;
  let line;
  if (loading) {
    line = <span className={s.skel} style={{ display: 'inline-block', width: 360, height: 16 }} />;
  } else if (mode === 'none') {
    line = <>Connect a brokerage or start mock trading to see your portfolio here.</>;
  } else if (pct == null) {
    line = <>Your portfolio summary updates as your linked accounts sync.</>;
  } else {
    const subject = mode === 'mock' ? 'Your mock portfolio is' : 'Your portfolio is';
    const basis = mode === 'mock' ? 'since inception' : 'against cost basis';
    line = (
      <>
        {subject} {pct < 0 ? 'down' : 'up'}{' '}
        <strong>
          <Signed value={pct}>{fmtSignedPct(pct)}</Signed>
        </strong>{' '}
        {basis}
        {longDate ? ` as of ${longDate}` : ''}.
      </>
    );
  }
  return (
    <section className={s.greetRow} aria-label="Greeting">
      <div className={s.greet}>
        <span className={s.greetBar} aria-hidden="true" />
        <div className={s.greetText}>
          <h1 className={s.h1}>
            {greeting ? `Good ${greeting}, ${firstName}` : `Welcome back, ${firstName}`}
          </h1>
          <p className={s.sub}>{line}</p>
        </div>
      </div>
    </section>
  );
}

/** Deposit funds, Rebalance and Trade: sits on the KPI row, right-aligned. */
export function DashboardActions() {
  return (
    <div className={s.actions}>
      <Link href="/trading" className={s.btn}>
        Deposit funds
      </Link>
      <button
        type="button"
        className={s.btn}
        disabled
        title="Rebalancing is coming soon"
        aria-describedby="db-rebalance-note"
      >
        Rebalance
      </button>
      <span id="db-rebalance-note" className={s.srOnly}>
        Coming soon
      </span>
      <Link href="/trading/mock" className={cx(s.btn, s.btnPrimary)}>
        Trade
      </Link>
    </div>
  );
}

/* ── C · KPI strip ──────────────────────────────────────────────────── */

const TIPS = {
  return:
    'Your total gain or loss since you started, as a share of what you started with. Linked accounts are measured against cost basis.',
  risk: 'How exposed and concentrated your portfolio is: the share you have invested and how much rides on your largest holdings and sectors. 0 is all cash, 10 is one stock. It does not measure price swings.',
  div: 'How evenly your money is spread across holdings and sectors. Ten or more similar-sized holdings across five or more sectors scores 100.',
};

function Kpi({ icon, label, tip, children }) {
  return (
    <div className={s.kpi}>
      <span className={s.kpiIcon} aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <div className={s.kpiText}>
        <span className={s.kpiLabel}>
          {label}
          {tip ? <InfoTip label={label.toLowerCase()} text={tip} /> : null}
        </span>
        {children}
      </div>
    </div>
  );
}

export function KpiStrip({ data, loading }) {
  if (loading || !data) {
    return (
      <section className={cx(s.card, s.kpis)} aria-label="Key metrics" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cx(s.kpi, s.kpiSkel)}>
            <span className={s.kpiIcon} aria-hidden="true" />
            <div className={s.kpiText} style={{ flex: 1 }}>
              <div className={s.skel} style={{ height: 16, width: '60%' }} />
              <div className={s.skel} style={{ height: 22, width: '80%' }} />
            </div>
          </div>
        ))}
      </section>
    );
  }
  const { totals, scores, bestPerformer } = data;
  return (
    <section className={cx(s.card, s.kpis)} aria-label="Key metrics">
      <Kpi icon="bi-graph-up-arrow" label="Portfolio return" tip={TIPS.return}>
        <span className={s.kpiValue}>
          {totals.totalReturnPct == null ? (
            <span className={s.muted}>{NA}</span>
          ) : (
            <>
              <Signed value={totals.totalReturnPct}>{fmtSignedPct(totals.totalReturnPct)}</Signed>
              <span className={s.kpiExtra}>({fmtSignedMoney(totals.totalPnl)})</span>
            </>
          )}
        </span>
      </Kpi>
      <Kpi icon="bi-trophy" label="Best performer">
        <span className={s.kpiValue}>
          {bestPerformer ? (
            <>
              <span>{bestPerformer.ticker}</span>
              <Signed value={bestPerformer.returnPct}>
                {fmtSignedPct(bestPerformer.returnPct)}
              </Signed>
            </>
          ) : (
            <span className={s.muted}>{NA}</span>
          )}
        </span>
      </Kpi>
      <Kpi icon="bi-speedometer2" label="Risk score" tip={TIPS.risk}>
        <span className={s.kpiValue}>
          {scores.risk == null ? (
            <span className={s.muted}>{NA}</span>
          ) : (
            <>
              <span>
                {scores.risk.toFixed(1)} <span className={s.kpiOf}>/ 10</span>
              </span>
              <Badge badge={riskBadge(scores.risk)} />
            </>
          )}
        </span>
      </Kpi>
      <Kpi icon="bi-pie-chart" label="Diversification score" tip={TIPS.div}>
        <span className={s.kpiValue}>
          {scores.diversification == null ? (
            <span className={s.muted}>{NA}</span>
          ) : (
            <>
              <span>
                {scores.diversification} <span className={s.kpiOf}>/ 100</span>
              </span>
              <Badge badge={diversificationBadge(scores.diversification)} />
            </>
          )}
        </span>
      </Kpi>
    </section>
  );
}

/* ── D · Portfolio snapshot ─────────────────────────────────────────── */

function rangeChipLabel(range, custom) {
  if (range !== 'CUSTOM') return range;
  if (!custom?.start || !custom?.end) return 'Custom';
  return `${fmtDate(+custom.start).replace(/, \d{4}$/, '')} to ${fmtDate(+custom.end)}`;
}

export function PortfolioSnapshot({
  data,
  loading,
  range,
  onRange,
  custom,
  onCustom,
  rows,
  change,
  seriesLoading,
  seriesError,
  onRetry,
  mode,
}) {
  const [calendar, setCalendar] = useState(false);
  const totals = data?.totals;
  return (
    <Card
      title="Portfolio snapshot"
      data-tour="db-snapshot"
      tools={
        <>
          <Segmented
            options={SNAPSHOT_RANGES}
            value={range}
            onChange={onRange}
            label="Time range"
          />
          <button
            type="button"
            className={s.rangeCustom}
            aria-pressed={range === 'CUSTOM'}
            onClick={() => setCalendar(true)}
          >
            <i className="bi bi-calendar3" aria-hidden="true" />
            Custom
          </button>
        </>
      }
    >
      {calendar ? (
        <CustomDateCalendar
          mode="range"
          value={custom || null}
          onChange={(r) => {
            if (r?.start && r?.end) onCustom(r);
            setCalendar(false);
          }}
          onClose={() => setCalendar(false)}
        />
      ) : null}
      <div className={s.snapBody}>
        <div className={s.snapLeft}>
          <span className={s.snapLabel}>Current value</span>
          {loading ? (
            <div className={s.skel} style={{ height: 41, width: 300, maxWidth: '100%' }} />
          ) : (
            <span className={s.snapValue}>
              {totals?.currentValue == null ? NA : fmtMoney(totals.currentValue)}
            </span>
          )}
          <span className={cx(s.delta, s[tone(change?.abs)])}>
            {change ? (
              <>
                <span>{fmtSignedPct(change.pct)}</span>
                <span>{fmtSignedMoney(change.abs)}</span>
              </>
            ) : (
              <span className={s.muted}>{loading || seriesLoading ? '' : NA}</span>
            )}
            <span className={s.chip}>{rangeChipLabel(range, custom)}</span>
          </span>
          <div className={s.stats}>
            <div className={s.statsRow}>
              <div className={s.stat}>
                <span className={s.statLabel}>Open positions</span>
                <span className={s.statValue}>{loading ? '' : (totals?.openPositions ?? NA)}</span>
              </div>
              <div className={s.stat}>
                <span className={s.statLabel}>Cash balance</span>
                <span
                  className={s.statValue}
                  title={mode === 'linked' ? 'Held at your institution' : undefined}
                >
                  {loading ? '' : totals?.cashBalance == null ? NA : fmtMoney(totals.cashBalance)}
                </span>
              </div>
              <div className={s.stat}>
                <span className={s.statLabel}>Total P&amp;L</span>
                <span className={cx(s.statValue, s[tone(totals?.totalPnl)])}>
                  {loading ? '' : fmtSignedMoney(totals?.totalPnl)}
                </span>
              </div>
            </div>
          </div>
        </div>
        <SnapshotChart
          rows={rows}
          range={range}
          loading={loading || seriesLoading}
          error={seriesError}
          onRetry={onRetry}
        />
      </div>
    </Card>
  );
}

/* ── E · My holdings ────────────────────────────────────────────────── */

function pageWindow(page, count) {
  const max = 5;
  let start = Math.max(0, page - 2);
  const end = Math.min(count, start + max);
  start = Math.max(0, end - max);
  return Array.from({ length: end - start }, (_, i) => start + i);
}

export function HoldingsCard({ data, loading, error, onRetry, range, onRange, mode }) {
  const [page, setPage] = useState(0);
  const holdings = useMemo(() => data?.holdings ?? [], [data]);
  const count = Math.max(1, Math.ceil(holdings.length / HOLDINGS_PAGE));
  const current = Math.min(page, count - 1);
  const rows = holdings.slice(current * HOLDINGS_PAGE, current * HOLDINGS_PAGE + HOLDINGS_PAGE);
  const from = holdings.length ? current * HOLDINGS_PAGE + 1 : 0;
  const to = current * HOLDINGS_PAGE + rows.length;

  let body;
  if (loading) body = <Skeleton rows={8} height={20} gap={14} />;
  else if (error) body = <ErrorState onRetry={onRetry} />;
  else if (!holdings.length)
    body = (
      <EmptyState
        icon="bi-briefcase"
        message={
          mode === 'none'
            ? 'No holdings yet. Connect a brokerage or start mock trading.'
            : 'No open positions yet.'
        }
        action={
          <Link href="/trading/mock" className={s.btn}>
            Start trading
          </Link>
        }
      />
    );
  else
    body = (
      <>
        <div className={cx(s.tableWrap, s.scrollX)}>
          <table className={cx(s.table, s.holdTable)}>
            <caption className={s.srOnly}>Your holdings, largest first</caption>
            <thead>
              <tr>
                <th scope="col">Ticker</th>
                <th scope="col">Company</th>
                <th scope="col" className={s.r}>
                  Value
                </th>
                <th scope="col" className={s.r}>
                  Quantity
                </th>
                <th scope="col" className={s.r}>
                  Price / share
                </th>
                <th scope="col" className={s.r}>
                  Daily change
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.ticker}>
                  <td className={s.ticker}>
                    <Link href={tradeHref(h.ticker)}>{h.ticker}</Link>
                  </td>
                  <td className={s.company}>{h.company}</td>
                  <td className={cx(s.r, s.num)}>{fmtMoney(h.value)}</td>
                  <td className={cx(s.r, s.num, s.company)}>{fmtQty(h.quantity)}</td>
                  <td className={cx(s.r, s.num, s.company)}>{fmtMoney(h.price)}</td>
                  <td className={cx(s.r, s.num, s[tone(h.dayChangePct)])}>
                    {h.dayChangePct == null
                      ? NA
                      : `${fmtSignedPct(h.dayChangePct)} (${fmtSignedMoney(h.dayChangeAbs)})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={s.tableFoot}>
          <span>
            Showing {from}–{to} of {holdings.length}{' '}
            {holdings.length === 1 ? 'holding' : 'holdings'}
          </span>
          {count > 1 ? (
            <nav className={s.pager} aria-label="Holdings pages">
              <button
                type="button"
                aria-label="Previous page"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <i className="bi bi-chevron-left" aria-hidden="true" />
              </button>
              {pageWindow(current, count).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-label={`Page ${p + 1}`}
                  aria-current={p === current ? 'page' : undefined}
                  onClick={() => setPage(p)}
                >
                  {p + 1}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                disabled={current >= count - 1}
                onClick={() => setPage(current + 1)}
              >
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </div>
      </>
    );

  return (
    <Card
      title="My holdings"
      className={s.holdings}
      tools={
        <>
          <Segmented
            options={HOLDING_RANGES}
            value={range}
            onChange={onRange}
            label="Holdings range"
            small
          />
          <Link href="/trading/mock" className={cx(s.link, s.linkBox)}>
            View full portfolio
            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
          </Link>
        </>
      }
    >
      {body}
    </Card>
  );
}

/* ── G · Total profits ──────────────────────────────────────────────── */

export function ProfitsCard({ data, loading }) {
  const totals = data?.totals;
  const profits = data?.profits;
  let body;
  if (loading) body = <Skeleton rows={7} height={16} />;
  else if (!profits?.rows.length && totals?.totalPnl == null)
    body = <EmptyState icon="bi-bar-chart" message="No positions to show yet." />;
  else
    body = (
      <>
        <div className={s.profitTop}>
          <Signed value={totals?.totalPnl} className={s.profitBig}>
            {fmtSignedMoney(totals?.totalPnl)}
          </Signed>
          <span className={cx(s.num, s.muted)} style={{ fontSize: 12 }}>
            {totals?.totalReturnPct == null ? '' : `${fmtSignedPct(totals.totalReturnPct)} total`}
          </span>
        </div>
        {profits.rows.length ? (
          <ul className={s.bars} aria-label="Unrealized profit and loss by position">
            {profits.rows.map((r) => (
              <li key={r.ticker} className={s.bar}>
                <span style={{ fontWeight: 600 }}>{r.ticker}</span>
                <span className={s.barTrack} aria-hidden="true">
                  <span
                    className={cx(s.barFill, r.pnl < 0 && s.barFillDown)}
                    style={{ width: `${Math.max(2, r.widthPct)}%` }}
                  />
                </span>
                <Signed value={r.pnl} className={s.barValue}>
                  {fmtSignedMoney(r.pnl)}
                </Signed>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.note}>Profit by position appears once you hold something.</p>
        )}
        {profits.realized != null && Math.abs(profits.realized) >= 0.01 ? (
          <p className={s.note}>
            Realized and closed positions:{' '}
            <Signed value={profits.realized}>{fmtSignedMoney(profits.realized)}</Signed>
          </p>
        ) : null}
        {profits.topWeights.length ? (
          <div className={s.weights} aria-label="Largest positions by weight">
            {profits.topWeights.map((w) => (
              <span key={w.ticker}>
                <strong>{w.ticker}</strong> {Math.round(w.weightPct)}%{' '}
                {w.pnl == null ? '' : <Signed value={w.pnl}>{fmtSignedMoney(w.pnl)}</Signed>}
              </span>
            ))}
          </div>
        ) : null}
      </>
    );
  return (
    <Card title="Total profits" className={s.profits}>
      {body}
    </Card>
  );
}

/* ── H · Sector distribution ────────────────────────────────────────── */

function shadeClass(slice, i) {
  if (slice.isCash) return s.sCash;
  if (slice.name === 'Other') return s.sOther;
  return s[`s${Math.min(i, 4)}`];
}

export function SectorCard({ data, loading }) {
  const sectors = data?.sectors ?? [];
  const total = data?.totals.currentValue;
  const R = 69;
  const C = 2 * Math.PI * R;
  const sum = sectors.reduce((a, x) => a + x.value, 0) || 1;
  let acc = 0;
  const arcs = sectors.map((x, i) => {
    const len = (x.value / sum) * C;
    const arc = { ...x, len, off: acc, cls: shadeClass(x, i) };
    acc += len;
    return arc;
  });
  const label = sectors.map((x) => `${x.name} ${x.pct}%`).join(', ');

  let body;
  if (loading) body = <Skeleton rows={5} height={18} />;
  else if (!sectors.length)
    body = (
      <EmptyState
        icon="bi-pie-chart"
        message="Your sector breakdown appears once you hold something."
      />
    );
  else
    body = (
      <div className={s.sectorBody} data-dense={arcs.length > 4 ? 'true' : undefined}>
        <figure className={s.donut}>
          <svg
            viewBox="0 0 160 160"
            width="160"
            height="160"
            role="img"
            aria-label={`Sector distribution: ${label}`}
          >
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--db-track)" strokeWidth="22" />
            {arcs.map((a) => (
              <circle
                key={a.name}
                className={cx('slice', a.cls)}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeWidth="22"
                strokeDasharray={`${a.len} ${C}`}
                strokeDashoffset={-a.off}
                transform="rotate(-90 80 80)"
              />
            ))}
          </svg>
          <figcaption className={s.donutCenter}>
            <span className={s.donutTotal}>{fmtCompactMoney(total)}</span>
            <span className={s.muted} style={{ fontSize: 11 }}>
              Total
            </span>
          </figcaption>
        </figure>
        <ul className={s.legend}>
          {arcs.map((a) => (
            <li key={a.name}>
              <span className={cx(s.swatch, a.cls)} aria-hidden="true" />
              <span className={s.legendName}>{a.name}</span>
              <span className={s.num} style={{ fontWeight: 600 }}>
                {a.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    );

  const count = data?.sectorCount ?? 0;
  return (
    <Card
      title="Sector distribution"
      titleExtra={
        <InfoTip
          label="sector distribution"
          text="The share of your portfolio value in each sector, with cash shown on its own. Shares are rounded so they add up to 100%."
        />
      }
      className={s.sectors}
      data-tour="db-sectors"
      tools={
        count ? (
          <span className={s.muted} style={{ fontSize: 12 }}>
            {count} {count === 1 ? 'sector' : 'sectors'}
          </span>
        ) : null
      }
    >
      {body}
    </Card>
  );
}

/* ── I · Recent transactions ────────────────────────────────────────── */

export function TransactionsCard({ data, loading, mode }) {
  const rows = (data?.transactions ?? []).slice(0, TXN_ROWS);
  let body;
  if (loading) body = <Skeleton rows={5} height={26} />;
  else if (!rows.length)
    body = (
      <EmptyState
        icon="bi-receipt"
        message={mode === 'linked' ? 'Linked account activity will appear here.' : 'No trades yet.'}
      />
    );
  else
    body = (
      <table className={cx(s.table, s.txTable)}>
        <caption className={s.srOnly}>Most recent trades, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Company</th>
            <th scope="col" className={s.r}>
              Amount
            </th>
            <th scope="col" className={s.r}>
              Date / ID
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                <span className={s.txCompany}>
                  <span className={s.txLogo} aria-hidden="true">
                    {t.ticker?.[0] ?? ''}
                  </span>
                  <span className={s.txNames}>
                    <span className={s.ticker}>{t.ticker}</span>
                    {t.company && t.company !== t.ticker ? (
                      <span className={s.txName}>{t.company}</span>
                    ) : null}
                  </span>
                </span>
              </td>
              <td className={cx(s.r, s.num, s.txAmount, s[tone(t.amount)])}>
                {fmtSignedMoney(t.amount)}
              </td>
              <td className={s.r}>
                <span className={s.txWhen}>
                  <span className={s.company}>{t.date}</span>
                  <span className={s.txRef}>{t.ref}</span>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  return (
    <Card title="Recent transactions" className={s.txns}>
      {body}
      {rows.length ? (
        <div className={s.cardFoot}>
          <Link href="/trading/mock" className={s.link}>
            View all transactions
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
