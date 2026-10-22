'use client';

/**
 * The two side panels: Manager Fingerprint (?manager=<cik>) and Security
 * X-ray (?security=<ticker or cusip>). Politician Tracker behaviour: one
 * history entry, Escape closes, focus returns, scrim. Spec: 04-SPEC
 * section 5 and the two panel artboards.
 */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { int, pct, quarterShort, shortDate, signedInt, signedPct, usd } from '@/lib/titans/format';
import { filingDay } from '@/lib/titans/institutional-model';
import { ChangeChip, M, Panel, PanelClose, PanelSection, Skel, useJson } from './ui';

const NOT_ADVICE = 'Findings from public filings, not investment advice.';
const SOURCE = 'SEC EDGAR Form 13F-HR. Quarter-end holdings, filed up to 45 days later.';

function SectionError({ retry }) {
  return (
    <p className="inst-empty">
      Could not load this section.{' '}
      <button type="button" className="inst-link" onClick={retry}>
        Retry
      </button>
    </p>
  );
}

/* ── Manager Fingerprint ─────────────────────────────────────────────── */

export function ManagerFingerprint({ cik, effNMedian, allSectorWeights, sampled, onClose }) {
  const { status, data, retry } = useJson(
    `/api/titans/fund?cik=${encodeURIComponent(cik)}&twins=1`,
  );
  const fund = data?.fund;
  const [showAll, setShowAll] = useState(false);
  const [openTwin, setOpenTwin] = useState(null);
  const quarter = quarterShort(fund?.quarter);

  const tilt = useMemo(() => {
    const all = new Map((allSectorWeights || []).map((s) => [s.sector, s.weight]));
    return (fund?.sectorWeights || [])
      .map((s) => ({ sector: s.sector, tilt: (s.weight - (all.get(s.sector) || 0)) * 100 }))
      .sort((a, b) => Math.abs(b.tilt) - Math.abs(a.tilt))
      .slice(0, 8);
  }, [fund, allSectorWeights]);

  const ringPct = fund?.top10Weight != null ? Math.min(1, fund.top10Weight) : null;
  const lagDays = fund?.filedAt && fund?.quarter ? filingDay(fund.quarter, fund.filedAt) : null;
  const turnKeys = ['new', 'doubled', 'added', 'trimmed', 'flat', 'exited'];
  const turnTotal = turnKeys.reduce((s, k) => s + (fund?.turnover?.[k] || 0), 0);
  const holdings = fund?.holdings || [];
  const shown = showAll ? holdings : holdings.slice(0, 10);

  return (
    <Panel label="Manager fingerprint" onClose={onClose}>
      <header className="inst-panel-head">
        <p className="inst-eyebrow">
          <i className="inst-dot inst-dot--titans" aria-hidden="true" /> Manager fingerprint
          {quarter ? ` · ${quarter}` : ''}
          {sampled ? <span className="inst-sample-chip">SAMPLE DATA</span> : null}
        </p>
        <PanelClose onClose={onClose} />
        {status === 'loading' ? (
          <Skel w="70%" h={28} />
        ) : (
          <>
            <h2 className="inst-panel-name" tabIndex={-1}>
              {fund?.filer || `CIK ${cik}`}
            </h2>
            <p className="inst-mono inst-muted">
              CIK {cik} · 13F-HR for {shortDate(fund?.quarter) || M}
            </p>
            <div className="inst-panel-stats">
              <div>
                <p className="inst-eyebrow">Reported value</p>
                <p className="inst-kpi inst-kpi--panel">{usd(fund?.totalValueUsd) ?? M}</p>
              </div>
              <div>
                <p className="inst-eyebrow">Positions</p>
                <p className="inst-kpi inst-kpi--panel">{int(fund?.positions) ?? M}</p>
              </div>
              <div>
                <p className="inst-eyebrow">Filed</p>
                <p className="inst-kpi inst-kpi--panel">
                  {shortDate(fund?.filedAt)?.replace(/, \d{4}$/, '') ?? M}
                </p>
                {lagDays != null ? (
                  <p className="inst-note">{lagDays} days after the quarter end</p>
                ) : null}
              </div>
            </div>
            {fund?.href ? (
              <a className="inst-link" href={fund.href} target="_blank" rel="noopener noreferrer">
                View the filing on sec.gov{' '}
                <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
              </a>
            ) : null}
          </>
        )}
      </header>

      {status === 'error' ? (
        <PanelSection>
          <SectionError retry={retry} />
        </PanelSection>
      ) : null}

      <PanelSection title="Concentration">
        {status === 'loading' ? (
          <Skel h={136} />
        ) : (
          <div className="inst-ring-row">
            <div
              className="inst-ring"
              style={{ '--inst-ring-pct': `${(ringPct || 0) * 100}` }}
              role="img"
              aria-label={`Top 10 holdings are ${pct((ringPct || 0) * 100, 1)} of the book; effective N ${fund?.effN != null ? Math.round(fund.effN) : M}`}
            >
              <span className="inst-ring-centre">
                <span className="inst-kpi inst-kpi--panel inst-mono">
                  {fund?.effN != null ? Math.round(fund.effN) : M}
                </span>
                <span className="inst-eyebrow">Effective N</span>
              </span>
            </div>
            <div className="inst-ring-legend">
              <p>
                <i className="inst-dot inst-dot--titans" aria-hidden="true" /> Top 10 holdings{' '}
                <span className="inst-mono">{ringPct != null ? pct(ringPct * 100, 1) : M}</span>
              </p>
              <p>
                <i className="inst-dot inst-dot--ghost" aria-hidden="true" /> Other{' '}
                <span className="inst-mono">
                  {fund?.positions != null ? int(Math.max(0, fund.positions - 10)) : M}
                </span>{' '}
                <span className="inst-mono">
                  {ringPct != null ? pct((1 - ringPct) * 100, 1) : M}
                </span>
              </p>
              <p className="inst-note">
                Median effective N across all filers:{' '}
                {effNMedian != null ? Math.round(effNMedian) : M}.
              </p>
            </div>
          </div>
        )}
      </PanelSection>

      <PanelSection title="Sector tilt vs all filers">
        {tilt.map((t) => (
          <div key={t.sector} className="inst-tilt-row">
            <span className="inst-ellipsis">{t.sector}</span>
            <span className="inst-diverging" aria-hidden="true">
              <span className="inst-diverging-zero" />
              <span
                className={`inst-diverging-bar${t.tilt >= 0 ? '' : ' is-down'}`}
                style={{
                  width: `${Math.min(50, (Math.abs(t.tilt) / 13) * 50)}%`,
                  [t.tilt >= 0 ? 'left' : 'right']: '50%',
                }}
              />
            </span>
            <span className={`inst-mono ${t.tilt >= 0 ? 'inst-pos' : 'inst-neg'}`}>
              {`${t.tilt > 0 ? '+' : ''}${t.tilt.toFixed(1)}pp`}
            </span>
          </div>
        ))}
        {!tilt.length && status === 'ready' ? (
          <p className="inst-empty">No sector mapping for this book.</p>
        ) : null}
      </PanelSection>

      <PanelSection title="Turnover">
        {turnTotal ? (
          <>
            <div className="inst-turnover" aria-hidden="true">
              {turnKeys.map((k) =>
                fund?.turnover?.[k] ? (
                  <span
                    key={k}
                    className={`inst-turn inst-turn--${k}`}
                    style={{ flexGrow: fund.turnover[k] }}
                  />
                ) : null,
              )}
            </div>
            <p className="inst-legend inst-legend--grid">
              {turnKeys.map((k) => (
                <span key={k}>
                  <i className={`inst-dot inst-turn--${k}`} aria-hidden="true" /> {k}{' '}
                  <span className="inst-mono">{int(fund?.turnover?.[k] || 0)}</span>
                </span>
              ))}
            </p>
          </>
        ) : (
          <p className="inst-empty">Changes appear once the prior quarter is parsed.</p>
        )}
      </PanelSection>

      <PanelSection title="Top moves · value change at constant price">
        <div className="inst-moves-cols">
          <div>
            {(fund?.topAdds || []).map((m) => (
              <p key={`a-${m.ticker}`} className="inst-move-line inst-mono">
                {m.ticker} <ChangeChip change={m.change} />{' '}
                <span className="inst-pos">+{usd(Math.abs(m.flowUsd))}</span>
              </p>
            ))}
          </div>
          <div>
            {(fund?.topCuts || []).map((m) => (
              <p key={`c-${m.ticker}`} className="inst-move-line inst-mono">
                {m.ticker} <ChangeChip change={m.change} />{' '}
                <span className="inst-neg">-{usd(Math.abs(m.flowUsd))}</span>
              </p>
            ))}
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Holdings">
        <table className="inst-table inst-table--panel">
          <thead>
            <tr>
              <th scope="col">Ticker</th>
              <th scope="col" className="inst-num">
                Weight
              </th>
              <th scope="col" className="inst-num">
                Value
              </th>
              <th scope="col" className="inst-num">
                Shares
              </th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((h, i) => (
              <tr key={`${h.cusip || h.issuer}-${h.putCall || ''}-${i}`}>
                <td className="inst-mono">
                  {h.ticker || <span className="inst-muted">{h.issuer}</span>}
                  {h.putCall ? ` ${h.putCall}` : ''}
                </td>
                <td className="inst-mono inst-num">
                  {h.weightPct != null ? pct(h.weightPct, 2) : M}
                </td>
                <td className="inst-mono inst-num">{usd(h.valueUsd) ?? M}</td>
                <td className="inst-mono inst-num">{int(h.shares) ?? M}</td>
                <td>{h.change ? <ChangeChip change={h.change} /> : M}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {holdings.length > 10 && !showAll ? (
          <button type="button" className="inst-link" onClick={() => setShowAll(true)}>
            Show all {int(holdings.length)}
          </button>
        ) : null}
      </PanelSection>

      <PanelSection title="Twin funds · highest weight overlap">
        {(fund?.twins || []).map((t) => (
          <div key={t.cik}>
            <div className="inst-twin-row">
              <button
                type="button"
                className="inst-link inst-ellipsis"
                onClick={() => setOpenTwin(openTwin === t.cik ? null : t.cik)}
              >
                {t.filer || t.cik}
                <span className="inst-mono inst-rowmeta">
                  {int(t.shared)} shared names · {usd(t.valueUsd)}
                </span>
              </button>
              <span className="inst-overlap" aria-hidden="true">
                <span style={{ width: `${Math.min(100, (t.overlap || 0) * 100)}%` }} />
              </span>
              <span className="inst-mono">{pct((t.overlap || 0) * 100, 0)}</span>
            </div>
            {openTwin === t.cik ? (
              <div className="inst-twin-compare inst-mono">
                <p>
                  <span className="inst-eyebrow">Shared</span>{' '}
                  {(t.sharedTickers || []).join(' ') || M}
                </p>
                <p>
                  <span className="inst-eyebrow">Only this fund</span>{' '}
                  {(t.onlyA || []).join(' ') || M}
                </p>
                <p>
                  <span className="inst-eyebrow">Only twin</span> {(t.onlyB || []).join(' ') || M}
                </p>
              </div>
            ) : null}
          </div>
        ))}
        {status === 'ready' && !(fund?.twins || []).length ? (
          <p className="inst-empty">Twin funds appear once the quarter is fully parsed.</p>
        ) : null}
      </PanelSection>

      <footer className="inst-panel-foot">
        <p>{SOURCE}</p>
        <p>Long positions only; no shorts or cash. {NOT_ADVICE}</p>
      </footer>
    </Panel>
  );
}

/* ── Security X-ray ──────────────────────────────────────────────────── */

const CROSS_ROWS = [
  [
    'insider',
    'Insider Trading',
    '/datasets/insider',
    (c) => (c ? `${int(c.buys)} buys${c.latest ? ` · latest ${shortDate(c.latest)}` : ''}` : null),
  ],
  [
    'congress',
    'Politician Tracker',
    '/datasets/politician-tracker',
    (c) => (c ? `${int(c.buys)} buys · ${int(c.sells)} sells` : null),
  ],
  [
    'activist',
    'Activist',
    '/datasets/activist',
    (c) =>
      c ? `${c.form || '13D/G'}${c.pct != null ? ` · ${pct(c.pct, 1)} of class` : ''}` : null,
  ],
  [
    'etf',
    'ETF Holdings',
    '/datasets/etf-holdings',
    (c) => (c ? `${int(c.funds)} funds hold it` : null),
  ],
];

export function SecurityXray({ keyParam, sampled, onClose }) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const { status, data, retry } = useJson(
    `/api/titans/security?key=${encodeURIComponent(keyParam)}${page > 1 ? `&page=${page}` : ''}`,
  );
  const s = data;
  const q = quarterShort(s?.period);
  const qPrior = quarterShort(s?.priorPeriod);
  const days = s?.period ? filingDay(s.period, new Date().toISOString().slice(0, 10)) : null;
  const holdersMax = Math.max(1, s?.holdersNow || 0, s?.holdersPrior || 0);
  const net = (s?.buyers || 0) - (s?.sellers || 0);
  const ladder = expanded ? s?.ladder || [] : (s?.ladder || []).slice(0, 6);

  return (
    <Panel label="Security X-ray" onClose={onClose}>
      <header className="inst-panel-head">
        <p className="inst-eyebrow">
          Security X-ray{q ? ` · ${q} vs ${qPrior}` : ''}
          {sampled ? <span className="inst-sample-chip">SAMPLE DATA</span> : null}
        </p>
        <PanelClose onClose={onClose} />
        {status === 'loading' ? (
          <Skel w="50%" h={30} />
        ) : status === 'error' || !s ? (
          <SectionError retry={retry} />
        ) : (
          <div className="inst-xray-head">
            <div>
              {s.ticker ? (
                <h2 className="inst-panel-name inst-mono" tabIndex={-1}>
                  {s.ticker}
                </h2>
              ) : (
                <h2 className="inst-panel-name" tabIndex={-1}>
                  {s.issuer}
                </h2>
              )}
              {s.ticker && s.issuer ? <p className="inst-xray-issuer">{s.issuer}</p> : null}
              <p className="inst-mono inst-muted">
                {[s.sector, s.cusip ? `CUSIP ${s.cusip}` : null].filter(Boolean).join(' · ') || M}
              </p>
            </div>
            {s.ticker && s.priceChangeSincePeriod != null ? (
              <div className="inst-xray-price">
                <p
                  className={`inst-kpi inst-kpi--panel ${s.priceChangeSincePeriod >= 0 ? 'inst-pos' : 'inst-neg'}`}
                >
                  {signedPct(s.priceChangeSincePeriod * 100, 1)}
                </p>
                <p className="inst-note">
                  price since {shortDate(s.period)?.replace(/, \d{4}$/, '')}
                  {days != null ? ` · ${days} days` : ''}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </header>

      {s ? (
        <>
          <PanelSection title="Ownership">
            <div className="inst-panel-stats">
              <div>
                <p className="inst-eyebrow">Holders</p>
                <p className="inst-kpi inst-kpi--panel">
                  {int(s.holdersNow)}{' '}
                  <span className="inst-mono inst-note">
                    {signedInt((s.holdersNow || 0) - (s.holdersPrior || 0))}
                  </span>
                </p>
              </div>
              <div>
                <p className="inst-eyebrow">Combined value</p>
                <p className="inst-kpi inst-kpi--panel">{usd(s.valueUsd) ?? M}</p>
              </div>
              <div>
                <p className="inst-eyebrow">Combined shares</p>
                <p className="inst-kpi inst-kpi--panel">
                  {int(s.shares) ?? M}{' '}
                  <span className="inst-mono inst-note">
                    {s.sharesPrior != null && s.shares != null
                      ? signedInt(s.shares - s.sharesPrior)
                      : ''}
                  </span>
                </p>
              </div>
            </div>
            <div className="inst-xray-bars" aria-hidden="true">
              <p>
                <span className="inst-mono inst-muted">{qPrior}</span>
                <span
                  className="inst-bar inst-bar--sell"
                  style={{ width: `${((s.holdersPrior || 0) / holdersMax) * 100}%` }}
                />
                <span className="inst-mono">{int(s.holdersPrior)}</span>
              </p>
              <p>
                <span className="inst-mono inst-muted">{q}</span>
                <span
                  className="inst-bar inst-bar--buy"
                  style={{ width: `${((s.holdersNow || 0) / holdersMax) * 100}%` }}
                />
                <span className="inst-mono">{int(s.holdersNow)}</span>
              </p>
            </div>
            <p className="inst-note inst-mono">
              {int(s.buyers)} buying · {int(s.sellers)} selling · net breadth {signedInt(net)}
            </p>
          </PanelSection>

          <PanelSection title="Holder ladder · largest first">
            <table className="inst-table inst-table--panel">
              <thead>
                <tr>
                  <th scope="col">Manager</th>
                  <th scope="col" className="inst-num">
                    Value
                  </th>
                  <th scope="col">Weight</th>
                  <th scope="col">Change</th>
                </tr>
              </thead>
              <tbody>
                {ladder.map((r) => (
                  <tr key={r.cik}>
                    <td className="inst-ellipsis">{r.filer || r.cik}</td>
                    <td className="inst-mono inst-num">{usd(r.valueUsd) ?? M}</td>
                    <td>
                      <span className="inst-weightbar" aria-hidden="true">
                        <span
                          style={{ width: `${Math.min(100, ((r.weight || 0) / 0.1) * 100)}%` }}
                        />
                      </span>
                      <span className="inst-mono">
                        {r.weight != null ? pct(r.weight * 100, 2) : M}
                      </span>
                    </td>
                    <td>{r.change ? <ChangeChip change={r.change} /> : M}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!expanded && (s.ladderTotal || 0) > 6 ? (
              <button type="button" className="inst-link" onClick={() => setExpanded(true)}>
                All {int(s.ladderTotal)}
              </button>
            ) : null}
            {expanded && (s.ladderTotal || 0) > 25 ? (
              <p className="inst-pager inst-mono">
                Page {page}
                <button
                  type="button"
                  className="inst-link"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="inst-link"
                  disabled={page * 25 >= (s.ladderTotal || 0)}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </p>
            ) : null}
          </PanelSection>

          <PanelSection title="Who is new · who left">
            <div className="inst-moves-cols">
              <div>
                <p className="inst-eyebrow">New · {int(s.newCount)}</p>
                {(s.joined || []).map((r) => (
                  <p key={r.cik} className="inst-move-line">
                    <span className="inst-ellipsis">{r.filer}</span>{' '}
                    <span className="inst-mono">{usd(r.valueUsd)}</span>
                  </p>
                ))}
              </div>
              <div>
                <p className="inst-eyebrow">Exited · {int(s.exited)}</p>
                {(s.left || []).map((r) => (
                  <p key={r.cik} className="inst-move-line">
                    <span className="inst-ellipsis">{r.filer}</span>{' '}
                    <span className="inst-mono inst-muted">{usd(r.valuePrior)}</span>
                  </p>
                ))}
              </div>
            </div>
            <p className="inst-note">
              Exited values are the prior-quarter position. {int(s.newCount)} new minus{' '}
              {int(s.exited)} exited = {signedInt((s.newCount || 0) - (s.exited || 0))} holders.
            </p>
          </PanelSection>

          <PanelSection title="Cross-signals">
            {s.ticker ? (
              CROSS_ROWS.map(([k, name, href, text]) => {
                const block = s.cross?.[k] || null;
                return (
                  <Link key={k} className="inst-cross-row" href={href}>
                    <i
                      className={`inst-dot${block ? ` inst-dot--${k}` : ' inst-dot--hollow'}`}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{name}</strong>
                      <span className="inst-muted"> {text(block) || 'None this quarter'}</span>
                    </span>
                    <i className="bi bi-arrow-up-right" aria-hidden="true" />
                  </Link>
                );
              })
            ) : (
              <p className="inst-empty">No ticker mapped, so other datasets cannot be joined.</p>
            )}
          </PanelSection>
        </>
      ) : null}

      <footer className="inst-panel-foot">
        <p>{SOURCE}</p>
        <p>Buyer and seller counts are built from share-count changes. {NOT_ADVICE}</p>
      </footer>
    </Panel>
  );
}
