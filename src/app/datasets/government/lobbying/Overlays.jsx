'use client';

/**
 * The three overlays: the filing modal (content as before, restyled), the
 * client or firm drawer, and the company modal (replaces CompanyCard.jsx:
 * emerald only, Bootstrap Icons). The drawer and the company modal
 * read /api/lobbying/page?view=entity.
 */
import { useMemo } from 'react';
import { niceCeiling, quarterAxis } from '@/lib/lobbying/page-model';
import {
  fmtAxisMoney,
  fmtCount,
  fmtDate,
  fmtQuarter,
  fmtSignedPct,
  fmtSpend,
} from '@/lib/lobbying/page-format';
import { CloseButton, ERROR_COPY, Overlay, Skel, SkelRows, Tick, useJson, useView } from './ui';

/* ── filing modal ──────────────────────────────────────────────────────── */

function hasAmount(f) {
  return !f?.isRegistration && f?.amount != null && Number(f.amount) > 0;
}

export function FilingModal({ uuid, onClose }) {
  const { status, data, retry } = useJson(`/api/lobbying/filing/${encodeURIComponent(uuid)}`);
  const f = data?.filing;
  return (
    <Overlay
      kind="modal"
      wide
      label={f?.client ? `Filing: ${f.client}` : 'Filing detail'}
      onClose={onClose}
    >
      <div className="lbx-modal-head">
        <div>
          {f?.period ? <span className="lbx-note lbx-note--q lbx-mono">{f.period}</span> : null}
          <h2 className="lbx-modal-title">{f?.client || 'Filing detail'}</h2>
          {f?.registrant ? <p className="lbx-modal-via">via {f.registrant}</p> : null}
        </div>
        <CloseButton onClose={onClose} />
      </div>
      {status === 'loading' ? (
        <SkelRows n={6} h={30} />
      ) : status === 'error' || !f ? (
        <div className="lbx-statebox">
          <p className="lbx-state">{ERROR_COPY}</p>
          <button type="button" className="lbx-btn lbx-btn--ghost lbx-btn--sm" onClick={retry}>
            <i className="bi bi-arrow-repeat" aria-hidden="true" /> Retry
          </button>
        </div>
      ) : (
        <div className="lbx-modal-grid">
          <div>
            <dl className="lbx-kv">
              <div>
                <dt>Amount</dt>
                <dd className="lbx-mono">
                  {hasAmount(f) ? fmtSpend(f.amount) : f.isRegistration ? 'Registration' : '·'}
                </dd>
              </div>
              <div>
                <dt>Date filed</dt>
                <dd className="lbx-mono">{fmtDate(f.posted)}</dd>
              </div>
              <div>
                <dt>Filing type</dt>
                <dd>{f.type || '·'}</dd>
              </div>
              <div>
                <dt>Lobbyists</dt>
                <dd className="lbx-mono">{fmtCount(f.lobbyistCount || 0)}</dd>
              </div>
            </dl>
            {f.lobbyists?.length ? (
              <>
                <p className="lbx-kicker lbx-kicker--sm">Named lobbyists</p>
                <ul className="lbx-modal-lobs">
                  {f.lobbyists.map((l, i) => (
                    <li key={l.id || i}>
                      <span>{l.name || 'Name not filed'}</span>
                      {l.revolvingDoor ? (
                        <span
                          className="lbx-revolve"
                          title={l.coveredPosition || 'Covered government position'}
                        >
                          <i className="bi bi-arrow-left-right" aria-hidden="true" /> former
                          official
                          {l.coveredPosition ? (
                            <span className="lbx-revolve-pos">{l.coveredPosition}</span>
                          ) : null}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <div>
            <p className="lbx-kicker lbx-kicker--sm">
              Government entities contacted{' '}
              <span className="lbx-mono">{f.entities?.length || 0}</span>
            </p>
            {f.entities?.length ? (
              <div className="lbx-chips">
                {f.entities.map((e) => (
                  <span key={e} className="lbx-ichip">
                    {e}
                  </span>
                ))}
              </div>
            ) : (
              <p className="lbx-state">Not specified.</p>
            )}
            <p className="lbx-kicker lbx-kicker--sm">
              Issues lobbied <span className="lbx-mono">{f.issues?.length || 0}</span>
            </p>
            {f.issues?.length ? (
              <div className="lbx-chips">
                {f.issues.map((is) => (
                  <span key={is.display || is.code} className="lbx-ichip">
                    {is.display || is.code}
                  </span>
                ))}
              </div>
            ) : (
              <p className="lbx-state">Not specified.</p>
            )}
            {f.activities?.length ? (
              <div className="lbx-modal-desc">
                {f.activities
                  .map((a) => a.description)
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((d, i) => (
                    <p key={i}>{d}</p>
                  ))}
              </div>
            ) : null}
            <p className="lbx-notes-line">
              The disclosed amount covers every entity and issue on this filing; the LDA does not
              itemise dollars per target.
            </p>
          </div>
        </div>
      )}
      <div className="lbx-modal-foot">
        <span className="lbx-legal">Source: Senate LDA (lda.gov)</span>
        {f?.url ? (
          <a className="lbx-btn lbx-btn--sm" href={f.url} target="_blank" rel="noopener noreferrer">
            View official filing <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </Overlay>
  );
}

/* ── shared entity detail ──────────────────────────────────────────────── */

function SpendBars({ series, nowMs, height = 90 }) {
  const axis = quarterAxis(nowMs);
  const by = new Map((series || []).map((s) => [`${s.year}${s.quarter}`, s]));
  const max = niceCeiling(Math.max(...(series || []).map((s) => Number(s.spend) || 0), 1));
  const w = 100 / axis.length;
  return (
    <div className="lbx-ent-bars" role="img" aria-label="Disclosed spend by quarter since 2024">
      <div className="lbx-ent-bars-plot" style={{ height }}>
        {axis.map((q) => {
          const s = by.get(`${q.year}${q.quarter}`);
          const v = Number(s?.spend) || 0;
          return (
            <span
              key={`${q.year}${q.quarter}`}
              className="lbx-ent-bar"
              style={{ width: `${w}%`, height: `${(v / max) * 100}%` }}
              title={`${fmtQuarter(q.year, q.quarter)}: ${fmtSpend(v)}`}
            />
          );
        })}
      </div>
      <div className="lbx-ent-bars-axis lbx-mono" aria-hidden="true">
        <span>{fmtQuarter(axis[0].year, axis[0].quarter)}</span>
        <span>{fmtAxisMoney(max)} max</span>
        <span>{fmtQuarter(axis[axis.length - 1].year, axis[axis.length - 1].quarter)}</span>
      </div>
    </div>
  );
}

function EntityBody({ view, counterLabel, nowMs, onOpenFiling, extraTop }) {
  const d = view.data || {};
  if (view.status === 'loading') return <SkelRows n={8} h={32} />;
  if (view.status === 'error')
    return (
      <div className="lbx-statebox">
        <p className="lbx-state">{ERROR_COPY}</p>
        <button type="button" className="lbx-btn lbx-btn--ghost lbx-btn--sm" onClick={view.retry}>
          <i className="bi bi-arrow-repeat" aria-hidden="true" /> Retry
        </button>
      </div>
    );
  return (
    <div className="lbx-ent">
      {extraTop}
      <dl className="lbx-kv lbx-kv--row">
        <div>
          <dt>Disclosed spend, this view</dt>
          <dd className="lbx-mono">{fmtSpend(d.spend)}</dd>
        </div>
        <div>
          <dt>Filings, this view</dt>
          <dd className="lbx-mono">{fmtCount(d.filings)}</dd>
        </div>
      </dl>
      <p className="lbx-kicker lbx-kicker--sm">Disclosed spend by quarter</p>
      <SpendBars series={d.series} nowMs={nowMs} />
      <div className="lbx-ent-cols">
        <div>
          <p className="lbx-kicker lbx-kicker--sm">Issues cited</p>
          <ul className="lbx-ent-list">
            {(d.issues || []).map((i) => (
              <li key={i.label}>
                <span className="lbx-ellipsis">{i.label}</span>
                <span className="lbx-mono">{fmtCount(i.filings)}</span>
              </li>
            ))}
            {!d.issues?.length ? <li className="lbx-state">None in this view.</li> : null}
          </ul>
        </div>
        <div>
          <p className="lbx-kicker lbx-kicker--sm">{counterLabel}</p>
          <ul className="lbx-ent-list">
            {(d.counterparties || []).map((c) => (
              <li key={c.name}>
                <span className="lbx-ellipsis" title={c.name}>
                  {c.name}
                </span>
                <span className="lbx-mono">{fmtSpend(c.spend)}</span>
              </li>
            ))}
            {!d.counterparties?.length ? <li className="lbx-state">None in this view.</li> : null}
          </ul>
        </div>
      </div>
      <p className="lbx-kicker lbx-kicker--sm">Largest filings</p>
      <ul className="lbx-ent-filings">
        {(d.largest || []).map((f) => (
          <li key={f.uuid}>
            <button
              type="button"
              className="lbx-row lbx-ent-filing"
              onClick={() => onOpenFiling(f.uuid)}
            >
              <span className="lbx-mono lbx-faint">{fmtQuarter(f.year, f.quarter)}</span>
              <span className="lbx-ellipsis">{counterLabel === 'Clients' ? f.client : f.firm}</span>
              <span className="lbx-mono">{fmtSpend(f.amount)}</span>
            </button>
          </li>
        ))}
        {!d.largest?.length ? (
          <li className="lbx-state">No filing with a reported amount in this view.</li>
        ) : null}
      </ul>
    </div>
  );
}

/* ── client / firm drawer ──────────────────────────────────────────────── */

export function ClientDrawer({ entity, query, nowMs, onClose, onOpenFiling }) {
  const view = useView(
    `view=entity&kind=${entity.kind}&value=${encodeURIComponent(entity.value)}${query ? `&${query}` : ''}`,
  );
  return (
    <Overlay kind="drawer" label={entity.name} onClose={onClose}>
      <div className="lbx-modal-head">
        <div>
          <p className="lbx-kicker lbx-kicker--sm">
            {entity.kind === 'firm' ? 'Lobbying firm' : 'Client'}
          </p>
          <h2 className="lbx-modal-title">{view.data?.name || entity.name}</h2>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <EntityBody
        view={view}
        nowMs={nowMs}
        counterLabel={entity.kind === 'firm' ? 'Clients' : 'Firms hired'}
        onOpenFiling={onOpenFiling}
      />
    </Overlay>
  );
}

/* ── company modal ─────────────────────────────────────────────────────── */

/**
 * Price with quarterly lobbying spend overlaid: the close line spans the
 * chart, spend bars sit along the base, each scaled to its own axis.
 */
function PriceWithSpend({ closes, times, series, nowMs }) {
  const W = 560;
  const H = 150;
  const axis = quarterAxis(nowMs);
  const t0 = Date.UTC(axis[0].year, 0, 1) / 1000;
  const t1 = Date.now() / 1000;
  const by = new Map((series || []).map((s) => [`${s.year}${s.quarter}`, Number(s.spend) || 0]));
  const max = Math.max(...by.values(), 1);
  const pts = (closes || []).map((c, i) => ({ c, t: times[i] })).filter((p) => p.t >= t0);
  const lo = Math.min(...pts.map((p) => p.c));
  const hi = Math.max(...pts.map((p) => p.c));
  const px = (t) => ((t - t0) / (t1 - t0)) * W;
  const py = (c) => 8 + (H - 50) * (1 - (c - lo) / (hi - lo || 1));
  const line = pts
    .map((p, i) => `${i ? 'L' : 'M'}${px(p.t).toFixed(1)} ${py(p.c).toFixed(1)}`)
    .join('');
  return (
    <svg
      className="lbx-svg lbx-price"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Share price since 2024 with quarterly lobbying spend"
    >
      {axis.map((q) => {
        const qs = Date.UTC(q.year, ['q1', 'q2', 'q3', 'q4'].indexOf(q.quarter) * 3, 1) / 1000;
        const v = by.get(`${q.year}${q.quarter}`) || 0;
        const h = (v / max) * 36;
        const x = px(qs);
        const bw = (W / axis.length) * 0.7;
        return v > 0 ? (
          <rect
            key={`${q.year}${q.quarter}`}
            className="lbx-ent-bar-svg"
            x={x + 2}
            y={H - 4 - h}
            width={bw}
            height={h}
            rx="2"
          >
            <title>{`${fmtQuarter(q.year, q.quarter)}: ${fmtSpend(v)} lobbying`}</title>
          </rect>
        ) : null;
      })}
      {line ? <path className="lbx-price-line" d={line} /> : null}
    </svg>
  );
}

export function CompanyModal({ ticker, query, nowMs, onClose, onOpenFiling }) {
  const view = useView(
    `view=entity&kind=ticker&value=${encodeURIComponent(ticker)}${query ? `&${query}` : ''}`,
  );
  const quote = useJson(`/api/market-data/quotes?symbols=${encodeURIComponent(ticker)}`);
  const candles = useJson(
    `/api/market-data/stock-candles?symbol=${encodeURIComponent(ticker)}&range=3Y`,
  );
  const q = quote.data?.quotes?.[ticker] || null;
  const { closes, times } = useMemo(() => {
    const list = candles.data?.candles || [];
    return { closes: list.map((c) => Number(c.close)), times: list.map((c) => Number(c.t)) };
  }, [candles.data]);
  const verified = view.data?.verified;
  return (
    <Overlay kind="modal" wide label={`${ticker} lobbying`} onClose={onClose}>
      <div className="lbx-modal-head">
        <div>
          <span className="lbx-modal-tick">
            <Tick
              ticker={ticker}
              verified={verified === true}
              showBadge={view.status === 'ready'}
            />
          </span>
          <h2 className="lbx-modal-title">{view.data?.name || ticker}</h2>
          <p className="lbx-modal-via lbx-mono">
            {q?.price != null ? `$${q.price}` : '·'}{' '}
            {q?.change != null ? (
              <span className={`lbx-pill ${q.change >= 0 ? 'lbx-pill--pos' : 'lbx-pill--neg'}`}>
                {fmtSignedPct(q.change)}
              </span>
            ) : null}
          </p>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      <p className="lbx-kicker lbx-kicker--sm">Share price and quarterly lobbying spend</p>
      {candles.status === 'loading' ? (
        <Skel h={150} />
      ) : closes.length > 1 ? (
        <PriceWithSpend closes={closes} times={times} series={view.data?.series} nowMs={nowMs} />
      ) : (
        <p className="lbx-state">No price history is available for {ticker}.</p>
      )}
      <EntityBody
        view={view}
        nowMs={nowMs}
        counterLabel="Firms hired"
        onOpenFiling={onOpenFiling}
      />
      <div className="lbx-modal-foot">
        <span className="lbx-legal">Source: Senate LDA (lda.gov). Quotes delayed.</span>
      </div>
    </Overlay>
  );
}
