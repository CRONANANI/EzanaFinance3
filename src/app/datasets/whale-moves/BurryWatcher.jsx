'use client';

import Link from 'next/link';
import { Badge, VisuallyHidden } from '@/components/ds';
import { SCION_FINAL } from '@/lib/whales/burry-model';

/* Burry Watcher: Scion Asset Management's final public 13F, Ezana Echo
   coverage of Michael Burry, and major-outlet news about him. Every section
   has its own empty and unavailable state; nothing here is presented as a
   current position. */

const KIND = {
  shares: { label: 'Shares', tone: 'neutral', icon: 'bi-circle' },
  principal: { label: 'Principal', tone: 'neutral', icon: 'bi-circle' },
  put: { label: 'Puts', tone: 'warning', icon: 'bi-arrow-down-right' },
  call: { label: 'Calls', tone: 'info', icon: 'bi-arrow-up-right' },
};

const MAX_ROWS = 12;

function fmtUSD(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 'Not reported';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(v) {
  return v == null || !Number.isFinite(Number(v)) ? 'Not reported' : `${Number(v).toFixed(1)}%`;
}

/** UTC so the server and client render the same string. */
function fmtDate(s) {
  if (!s) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00Z` : s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function SectionEmpty({ icon, children, role }) {
  return (
    <div className="bw-empty" role={role}>
      <i className={`bi ${icon}`} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function Holdings({ h }) {
  const status = h?.status || 'unavailable';
  if (status === 'unavailable') {
    return (
      <SectionEmpty icon="bi-cloud-slash" role="status">
        The holdings from Scion&apos;s final 13F could not be loaded from SEC EDGAR just now. Try
        again later, or{' '}
        <a href={h?.filerUrl} target="_blank" rel="noopener noreferrer">
          view Scion&apos;s filings on SEC EDGAR
        </a>
        .
      </SectionEmpty>
    );
  }
  if (status === 'empty' || !h.positions?.length) {
    return (
      <SectionEmpty icon="bi-inbox" role="status">
        No 13F holdings were found in Scion&apos;s public filings.
      </SectionEmpty>
    );
  }
  const rows = h.positions.slice(0, MAX_ROWS);
  const hidden = h.positions.length - rows.length;
  return (
    <>
      <div
        className="bw-table-wrap"
        role="region"
        aria-label="Scion final 13F holdings"
        tabIndex={0}
      >
        <table className="bw-table">
          <thead>
            <tr>
              <th scope="col">Issuer</th>
              <th scope="col">Type</th>
              <th scope="col" className="bw-num">
                Reported value
              </th>
              <th scope="col" className="bw-share-col">
                Share of reported value
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const k = KIND[p.kind] || KIND.shares;
              const pct = Math.max(0, Math.min(100, Number(p.pctOfReported) || 0));
              return (
                <tr key={`${p.issuer}|${p.kind}`}>
                  <td>
                    <span className="bw-issuer">{p.issuer}</span>
                    {p.ticker && <span className="bw-ticker">{p.ticker}</span>}
                  </td>
                  <td>
                    <Badge tone={k.tone} icon={k.icon}>
                      {k.label}
                    </Badge>
                  </td>
                  <td className="bw-num">{fmtUSD(p.valueUsd)}</td>
                  <td>
                    <span className="bw-share">
                      <span
                        className="bw-bar"
                        role="img"
                        aria-label={`${fmtPct(p.pctOfReported)} of reported value`}
                      >
                        <span className="bw-bar-fill" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="bw-share-num">{fmtPct(p.pctOfReported)}</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bw-totals">
        <span>
          Total reported value <strong className="bw-mono">{fmtUSD(h.totalValueUsd)}</strong>
        </span>
        <span>
          Positions <strong className="bw-mono">{h.positions.length}</strong>
        </span>
        {hidden > 0 && <span>Top {rows.length} shown, the full list is in the filing.</span>}
      </div>
      <p className="bw-fine">
        <i className="bi bi-info-circle" aria-hidden="true" /> For puts and calls, a 13F reports the
        notional value of the underlying shares, not the premium paid, so option rows overstate the
        capital at risk and the percentages are of reported value, not of the fund.
      </p>
    </>
  );
}

function Provenance({ h }) {
  const period = fmtDate(h?.periodOfReport || SCION_FINAL.periodOfReport);
  const filed = fmtDate(h?.filingDate);
  return (
    <p className="bw-provenance">
      <i className="bi bi-file-earmark-text" aria-hidden="true" />
      <span>
        Source: SEC EDGAR, {h?.form || 'Form 13F-HR'}
        {filed ? `, filed ${filed}` : ''}, period ending {period}.
        {h?.accessionNo && (
          <>
            {' '}
            Accession <span className="bw-mono">{h.accessionNo}</span>.
          </>
        )}{' '}
        <a
          href={h?.indexUrl || h?.filerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bw-link"
        >
          {h?.indexUrl ? 'View the filing' : 'View Scion on SEC EDGAR'}
          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
        </a>
      </span>
    </p>
  );
}

function EchoList({ echo }) {
  const status = echo?.status || 'unavailable';
  if (status === 'unavailable') {
    return (
      <SectionEmpty icon="bi-cloud-slash" role="status">
        Ezana Echo coverage could not be loaded just now.
      </SectionEmpty>
    );
  }
  if (!echo.items?.length) {
    return (
      <SectionEmpty icon="bi-journal-text" role="status">
        No Ezana Echo coverage of Burry yet.
      </SectionEmpty>
    );
  }
  return (
    <ul className="bw-list">
      {echo.items.map((a) => (
        <li key={a.slug} className="bw-item">
          <Link href={a.href} className="bw-item-title">
            {a.title}
          </Link>
          <span className="bw-item-meta">
            Ezana Echo
            {fmtDate(a.publishedAt) && <span className="bw-mono"> · {fmtDate(a.publishedAt)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function NewsList({ news }) {
  const status = news?.status || 'unavailable';
  if (status === 'unavailable') {
    return (
      <SectionEmpty icon="bi-cloud-slash" role="status">
        News from major outlets could not be loaded just now.
      </SectionEmpty>
    );
  }
  if (!news.items?.length) {
    return (
      <SectionEmpty icon="bi-newspaper" role="status">
        No major-outlet coverage of Michael Burry in the last 90 days.
      </SectionEmpty>
    );
  }
  return (
    <ul className="bw-list">
      {news.items.map((a) => (
        <li key={a.id} className="bw-item">
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="bw-item-title">
            {a.title}
            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
          </a>
          <span className="bw-item-meta">
            {a.outlet}
            {fmtDate(a.publishedAt) && <span className="bw-mono"> · {fmtDate(a.publishedAt)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function BurryWatcher({ data }) {
  const h = data?.holdings || { status: 'unavailable', positions: [] };
  const period = fmtDate(h.periodOfReport || SCION_FINAL.periodOfReport);
  return (
    <section className="mkt-ds-section" aria-labelledby="bw-title">
      <div className="bw-card">
        <header className="bw-head">
          <div className="bw-head-text">
            <p className="bw-eyebrow">MICHAEL BURRY · SCION ASSET MANAGEMENT</p>
            <h2 id="bw-title" className="bw-title">
              <i className="bi bi-binoculars" aria-hidden="true" /> Burry Watcher
            </h2>
            <p className="bw-sub">
              What Michael Burry last disclosed owning, what Ezana Echo has written about him, and
              what major outlets are reporting.
            </p>
          </div>
        </header>

        <div className="bw-notice" role="note">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <p>
            <strong>Not current positions.</strong> These holdings come from Scion&apos;s final
            public 13F, for the period ending {period}. Scion ended its SEC investment adviser
            registration in November 2025 and no longer files 13Fs, so no newer public filing
            exists. Burry now writes a paid newsletter, which Ezana does not reproduce.
          </p>
        </div>

        <div className="bw-block">
          <h3 className="bw-h3">Final 13F holdings</h3>
          <Holdings h={h} />
          <Provenance h={h} />
        </div>

        <div className="bw-cols">
          <div className="bw-block">
            <h3 className="bw-h3">
              <i className="bi bi-journal-text" aria-hidden="true" /> On Ezana Echo
            </h3>
            <EchoList echo={data?.echo} />
          </div>
          <div className="bw-block">
            <h3 className="bw-h3">
              <i className="bi bi-newspaper" aria-hidden="true" /> In the news
            </h3>
            <NewsList news={data?.news} />
            <p className="bw-fine">Last 90 days, major news outlets only.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
