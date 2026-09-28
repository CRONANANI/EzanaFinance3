'use client';

/**
 * One member's profile, rendered in two modes from one component.
 *
 * `panel` slides in over the page and owns a URL, so it is shareable and the
 * back button closes it. `page` is that same URL loaded directly. The handoff
 * is explicit that these are the same thing seen two ways, which is why this
 * replaces the two-deep modal stack the Contracts page uses: there is never a
 * second layer here, and clicking another member swaps the content in place.
 *
 * Contents and order come from 04-SPEC section 6.
 */
import { useCallback, useEffect, useRef } from 'react';

const LAG_LIMIT = 45;
const NONE = '·';

function initials(name) {
  const parts = String(name || '')
    .replace(/[[\]]/g, '')
    .trim()
    .split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase() || '?';
}

/** The 45-day line with one dot per trade. A plot, not a chart: no axes to read. */
function LagPlot({ trades }) {
  const pts = trades.filter((t) => typeof t.lag === 'number').slice(0, 40);
  if (!pts.length) return null;
  const max = Math.max(LAG_LIMIT + 10, ...pts.map((t) => t.lag));
  const late = pts.filter((t) => t.lag > LAG_LIMIT).length;
  const y = (lag) => 56 - (lag / max) * 52;
  return (
    <div className="dsc-p-block">
      <div className="dsc-p-block-head">
        <span className="dsc-label">Disclosure lag, last 12 months</span>
        <span className="dsc-p-lagcount dsc-mn">
          {late} of {pts.length} past 45 days
        </span>
      </div>
      <svg
        className="dsc-lagplot"
        viewBox={`0 0 240 60`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Disclosure lag for the last ${pts.length} trades; ${late} past the 45 day limit`}
      >
        <line
          x1="0"
          x2="240"
          y1={y(LAG_LIMIT)}
          y2={y(LAG_LIMIT)}
          className="dsc-lagplot-line"
          strokeDasharray="3 3"
        />
        {pts.map((t, i) => (
          <circle
            key={t.id ?? i}
            cx={6 + (i * 228) / Math.max(1, pts.length - 1)}
            cy={y(t.lag)}
            r="2.5"
            className={t.lag > LAG_LIMIT ? 'dsc-lagdot dsc-lagdot--late' : 'dsc-lagdot'}
          />
        ))}
      </svg>
      <span className="dsc-p-45">45D LINE</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="dsc-p-stat">
      <span className="dsc-label">{label}</span>
      <p className="dsc-p-fig">{value}</p>
    </div>
  );
}

export default function MemberProfile({ member, config, mode = 'panel', onClose, onTicker }) {
  const headRef = useRef(null);
  const panelRef = useRef(null);

  /* Focus moves to the heading on open and the trap keeps Tab inside, both
     because it is a dialog and because the page behind it stays scrolled
     where it was. */
  useEffect(() => {
    if (mode !== 'panel') return undefined;
    headRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const f = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!f || !f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, onClose, member?.slug]);

  /* Locked behind the panel on desktop so the page does not scroll under it;
     on a phone the panel is the whole screen, so there is nothing to lock. */
  useEffect(() => {
    if (mode !== 'panel') return undefined;
    const wide = typeof window !== 'undefined' && window.innerWidth > 760;
    if (!wide) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mode]);

  const pickTicker = useCallback(
    (t) => {
      onTicker?.(t);
      if (mode === 'panel') onClose?.();
    },
    [onTicker, onClose, mode],
  );

  if (!member) return null;

  const route = `${config.routes.member}/${member.slug}`;
  const where = config.hasDistrict
    ? [
        member.party,
        member.state && member.district ? `${member.state}-${member.district}` : member.state,
      ]
    : [member.party, member.state];
  const identity = [...where.filter(Boolean), member.since ? `MEMBER SINCE ${member.since}` : null]
    .filter(Boolean)
    .join(' · ');

  const body = (
    <>
      <div className="dsc-p-id">
        <span className="dsc-p-mark" aria-hidden="true">
          {initials(member.name)}
        </span>
        <div>
          <h2 className="dsc-p-name" ref={headRef} tabIndex={-1} id={`dsc-p-${member.slug}`}>
            {member.name}
          </h2>
          <p className="dsc-p-meta dsc-mn">{identity || NONE}</p>
        </div>
      </div>

      <div className="dsc-p-stats">
        <Stat label="Filings" value={member.filings ?? NONE} />
        <Stat label="PTRs" value={member.ptrs ?? NONE} />
        <Stat label="Txns" value={member.txns ?? NONE} />
        <Stat label="Median lag" value={member.medianLag != null ? `${member.medianLag}d` : NONE} />
      </div>

      {member.topTickers?.length ? (
        <div className="dsc-p-block">
          <span className="dsc-label">Most traded</span>
          <div className="dsc-p-chips">
            {member.topTickers.map((t) => (
              <button
                type="button"
                key={t.ticker}
                className="dsc-p-chip"
                onClick={() => pickTicker(t.ticker)}
              >
                {t.ticker}
                <span className="dsc-p-chip-n">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <LagPlot trades={member.trades || []} />

      <div className="dsc-p-block">
        <span className="dsc-label">Filings and trades</span>
        <table className="dsc-p-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Type</th>
              <th className="dsc-th--n">Amount disclosed</th>
              <th>Filed</th>
            </tr>
          </thead>
          <tbody>
            {(member.rows || []).map((r) => (
              <tr key={r.id}>
                <td>
                  {r.ticker ? (
                    <button type="button" className="dsc-tk" onClick={() => pickTicker(r.ticker)}>
                      {r.ticker}
                    </button>
                  ) : (
                    <span className="dsc-none">{NONE}</span>
                  )}
                </td>
                <td>
                  {r.pending ? (
                    /* Worded, never an empty row: a scanned filing has trades,
                       they have simply not been extracted yet. */
                    <span className="dsc-pending">
                      <i className="bi bi-hourglass-split" aria-hidden="true" />
                      Scanned filing, trades pending extraction
                    </span>
                  ) : (
                    <span className="dsc-mn dsc-p-type">{r.type || NONE}</span>
                  )}
                </td>
                <td className="dsc-td--n">
                  <span className="dsc-bracket">{r.bracket || NONE}</span>
                </td>
                <td>
                  {r.url ? (
                    <a
                      className="dsc-date dsc-p-link"
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.filed || NONE}
                    </a>
                  ) : (
                    <span className="dsc-date">{r.filed || NONE}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dsc-p-actions">
        <button type="button" className="dsc-btn dsc-btn--solid">
          Set an alert
        </button>
        {/* routes.page carries ?chamber= now, so the separator depends on
            whether the route already has a query string. */}
        <a
          className="dsc-btn dsc-btn--ghost"
          href={`${config.routes.page}${config.routes.page.includes('?') ? '&' : '?'}member=${member.slug}`}
        >
          All filings, {config.coverage.firstYear} on
        </a>
      </div>
      <p className="dsc-p-note">Alerts need a free account. Everything else here is open.</p>
    </>
  );

  if (mode === 'page') {
    return <div className="dsc-profile-page">{body}</div>;
  }

  return (
    <div
      className="dsc-panel"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`dsc-p-${member.slug}`}
    >
      <div className="dsc-p-head">
        <span className="dsc-label">Member</span>
        <span className="dsc-p-route dsc-mn">{route}</span>
        <a className="dsc-p-open" href={route}>
          Open page
          <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
        </a>
        <button type="button" className="dsc-p-x" aria-label="Close" onClick={onClose}>
          <i className="bi bi-x-lg" aria-hidden="true" />
        </button>
      </div>
      <div className="dsc-p-body">{body}</div>
    </div>
  );
}
