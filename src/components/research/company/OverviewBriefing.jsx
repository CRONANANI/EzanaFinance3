'use client';

/**
 * Overview tab (Nov 19th, 2026 redesign): an executive briefing built only
 * from data the page already has.
 *   - Investment snapshot: analyst consensus plus rule-based reads of the
 *     reported numbers (each states its rule; none is a recommendation).
 *   - Valuation snapshot: each estimate on its own line (latest completed DCF
 *     run, comparable-company estimate, analyst target). They are never
 *     averaged into one fair-value range.
 *   - Key metrics, ownership (13F), catalysts and filings, news, and the
 *     status of every model. A model that has not run says "Not run".
 * The Company Profile lives above the tabs and is not repeated here.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  analystUpsidePct,
  fmtMoney,
  fmtMultiple,
  fmtPct,
  fmtSignedPct,
  isNum,
  largestRemainderPercents,
  peerRating,
  signOf,
  valuationGapPct,
  TOOL_LABELS,
} from '@/lib/research/company-research';
import { MODEL_RUN_EVENT, readModelRuns } from '@/lib/research/model-runs';
import { useResearchPart } from '@/hooks/useResearchPart';
import { UxCard, UxState, fmtBig, fmtCount, fmtDay } from './ux-shared';

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

function useModelRuns(symbol) {
  const [runs, setRuns] = useState({});
  useEffect(() => {
    setRuns(readModelRuns(symbol));
    const on = (e) => {
      if (!e?.detail?.symbol || e.detail.symbol === String(symbol).toUpperCase()) {
        setRuns(readModelRuns(symbol));
      }
    };
    window.addEventListener(MODEL_RUN_EVENT, on);
    return () => window.removeEventListener(MODEL_RUN_EVENT, on);
  }, [symbol]);
  return runs;
}

/* Rule-based reads of the reported numbers. Each item names its rule. */
function dataSignals(research) {
  const { metrics, peers, analyst, quote } = research;
  const self = peers.rows.find((r) => r.isSelf) || null;
  const up = [];
  const watch = [];
  const g = metrics.revGrowthYoY;
  if (isNum(g)) {
    (g >= 0 ? up : watch).push(
      `Revenue ${g >= 0 ? 'grew' : 'fell'} ${fmtPct(Math.abs(g))} over the last twelve months versus the prior year.`,
    );
  }
  const eg = metrics.epsGrowthYoY;
  if (isNum(eg)) {
    (eg >= 0 ? up : watch).push(
      `EPS ${eg >= 0 ? 'rose' : 'fell'} ${fmtPct(Math.abs(eg))} year on year.`,
    );
  }
  const om = metrics.opMargin;
  if (isNum(om)) {
    if (om >= 15) up.push(`Operating margin of ${fmtPct(om)} (rule: 15% or more reads as strong).`);
    else if (om < 5)
      watch.push(
        `Operating margin of ${fmtPct(om)} (rule: under 5% leaves little room for error).`,
      );
  }
  const rating = peerRating(self?.pe, peers.medianPe);
  if (rating === 'discount') {
    up.push(
      `P/E of ${fmtMultiple(self.pe)} is more than 15% below the peer median of ${fmtMultiple(peers.medianPe)}.`,
    );
  } else if (rating === 'premium') {
    watch.push(
      `P/E of ${fmtMultiple(self.pe)} is more than 15% above the peer median of ${fmtMultiple(peers.medianPe)}.`,
    );
  }
  const au = analystUpsidePct(analyst.avgTarget, quote.price);
  if (isNum(au)) {
    if (au >= 10) up.push(`Consensus target implies ${fmtSignedPct(au)} from the current price.`);
    else if (au <= -5)
      watch.push(`Consensus target implies ${fmtSignedPct(au)} from the current price.`);
  }
  if (isNum(metrics.fcfPerShare) && metrics.fcfPerShare < 0) {
    watch.push('Free cash flow per share is negative over the last twelve months.');
  }
  return { up, watch };
}

function InvestmentSnapshot({ research, onSonar }) {
  const { analyst, quote } = research;
  const { up, watch } = useMemo(() => dataSignals(research), [research]);
  const c = analyst.counts;
  const pct = c ? largestRemainderPercents([c.buy, c.hold, c.sell]) : null;
  const upside = analystUpsidePct(analyst.avgTarget, quote.price);
  return (
    <UxCard
      id="ux-ov-invest"
      title="Investment snapshot"
      icon="bi-clipboard-data"
      className="ux-ov-invest"
    >
      <div className="ux-invest">
        <div className="ux-invest__cases">
          <div className="ux-case ux-case--up">
            <span className="ux-case__label">Supportive in the data</span>
            {up.length ? (
              <ul>
                {up.slice(0, 3).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="ux-muted">No supportive signal met its rule.</p>
            )}
          </div>
          <div className="ux-case ux-case--watch">
            <span className="ux-case__label">Watch in the data</span>
            {watch.length ? (
              <ul>
                {watch.slice(0, 3).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="ux-muted">No watch signal met its rule.</p>
            )}
          </div>
        </div>
        <div className="ux-invest__consensus">
          <span className="ux-kicker">Analyst consensus</span>
          {analyst.status === 'loading' ? (
            <UxState status="loading" rows={2} />
          ) : c || isNum(analyst.avgTarget) ? (
            <>
              {c ? (
                <p className="ux-consensus__split rc-num">
                  Buy {pct[0]}% · Hold {pct[1]}% · Sell {pct[2]}%
                  <span className="ux-muted"> ({c.buy + c.hold + c.sell} analysts)</span>
                </p>
              ) : null}
              {isNum(analyst.avgTarget) ? (
                <p className="ux-consensus__target">
                  <span className="ux-muted">12-month mean target</span>
                  <span className="rc-num ux-big">{fmtMoney(analyst.avgTarget)}</span>
                  {isNum(upside) ? (
                    <span className={`rc-num rc-tone--${signOf(upside)}`}>
                      {fmtSignedPct(upside)} implied
                    </span>
                  ) : null}
                </p>
              ) : null}
            </>
          ) : (
            <p className="ux-muted">No analyst coverage on file.</p>
          )}
        </div>
      </div>
      <p className="ux-foot">
        Rule-based reads of reported figures, not a recommendation.{' '}
        <button type="button" className="rc-link-btn" onClick={onSonar}>
          Build a bull and bear case in Sonar
        </button>
      </p>
    </UxCard>
  );
}

function ValuationSnapshot({ research, runs, onOpenTool }) {
  const price = research.quote.price;
  const self = research.peers.rows.find((r) => r.isSelf) || null;
  const eps = research.metrics.eps;
  const compsQuick =
    isNum(research.peers.medianPe) && isNum(eps) && eps > 0 ? research.peers.medianPe * eps : null;
  const rows = [
    {
      key: 'dcf',
      label: 'DCF fair value',
      value: runs.dcf?.value ?? null,
      note: runs.dcf ? `Last run ${timeFmt.format(new Date(runs.dcf.at))}` : 'Not run',
      action: 'dcf',
    },
    runs.comps?.value != null
      ? {
          key: 'comps',
          label: 'Comparable companies',
          value: runs.comps.value,
          note: 'Average implied price, peer-median multiples',
          action: 'comps',
        }
      : {
          key: 'comps',
          label: 'Comparable companies',
          value: compsQuick,
          note:
            compsQuick != null ? 'Peer-median P/E x EPS (TTM)' : 'Needs positive EPS and peer P/E',
          action: 'comps',
        },
    {
      key: 'target',
      label: 'Analyst mean target',
      value: research.analyst.avgTarget,
      note: research.analyst.analysts ? `${research.analyst.analysts} analysts` : 'Consensus',
      action: null,
    },
  ];
  const vals = rows.map((r) => r.value).filter((v) => isNum(v) && v > 0);
  const disagree = vals.length >= 2 && Math.max(...vals) / Math.min(...vals) > 1.3;
  return (
    <UxCard id="ux-ov-val" title="Valuation snapshot" icon="bi-bullseye">
      <p className="ux-val__price">
        <span className="ux-muted">Current price</span>
        <span className="rc-num ux-big">{isNum(price) ? fmtMoney(price) : 'N/A'}</span>
        {self && isNum(self.pe) ? (
          <span className="ux-muted rc-num">
            P/E {fmtMultiple(self.pe)} vs peer median {fmtMultiple(research.peers.medianPe)}
          </span>
        ) : null}
      </p>
      <ul className="ux-val__list">
        {rows.map((r) => {
          const gap = valuationGapPct(r.value, price);
          return (
            <li key={r.key} className="ux-val__row">
              <div className="ux-val__name">
                <span>{r.label}</span>
                <span className="ux-muted ux-val__note">{r.note}</span>
              </div>
              <div className="ux-val__nums">
                {isNum(r.value) ? (
                  <>
                    <span className="rc-num">{fmtMoney(r.value)}</span>
                    {isNum(gap) ? (
                      <span className={`rc-num rc-tone--${signOf(gap)}`}>{fmtSignedPct(gap)}</span>
                    ) : null}
                  </>
                ) : r.action ? (
                  <button
                    type="button"
                    className="rc-link-btn"
                    onClick={() => onOpenTool(r.action)}
                  >
                    Run {TOOL_LABELS[r.action]}
                  </button>
                ) : (
                  <span className="ux-muted">N/A</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {disagree ? (
        <p className="ux-foot">
          <i className="bi bi-info-circle" aria-hidden="true" /> These estimates differ by more than
          30%. Each rests on different assumptions, so they are shown separately, not averaged.
        </p>
      ) : (
        <p className="ux-foot">Each estimate is shown on its own basis; none is averaged.</p>
      )}
    </UxCard>
  );
}

function KeyMetrics({ research }) {
  const m = research.metrics;
  const q = research.quote;
  const self = research.peers.rows.find((r) => r.isSelf) || null;
  const groups = [
    {
      name: 'Size and valuation',
      items: [
        ['Market cap', q.display.marketCap],
        ['P/E (TTM)', q.display.pe],
        ['EV/EBITDA', self && isNum(self.evEbitda) ? fmtMultiple(self.evEbitda) : 'N/A'],
      ],
    },
    {
      name: 'Growth (TTM vs prior year)',
      items: [
        ['Revenue growth', fmtSignedPct(m.revGrowthYoY)],
        ['EPS growth', fmtSignedPct(m.epsGrowthYoY)],
      ],
    },
    {
      name: 'Profitability (TTM)',
      items: [
        ['Gross margin', fmtPct(m.grossMargin)],
        ['Operating margin', fmtPct(m.opMargin)],
      ],
    },
    {
      name: 'Per share (TTM)',
      items: [
        ['EPS', isNum(m.eps) ? fmtMoney(m.eps) : 'N/A'],
        ['FCF per share', isNum(m.fcfPerShare) ? fmtMoney(m.fcfPerShare) : 'N/A'],
        ['Dividend yield', q.display.dividendYield],
      ],
    },
  ];
  return (
    <UxCard
      id="ux-ov-metrics"
      title="Key metrics"
      icon="bi-speedometer2"
      info="TTM, Finnhub and FMP"
    >
      {m.status === 'loading' ? (
        <UxState status="loading" rows={5} />
      ) : (
        <div className="ux-metrics">
          {groups.map((g) => (
            <div key={g.name} className="ux-metrics__group">
              <span className="ux-kicker">{g.name}</span>
              <dl>
                {g.items.map(([k, v]) => (
                  <div key={k} className="ux-metrics__row">
                    <dt>{k}</dt>
                    <dd className="rc-num">{v === '--' ? 'N/A' : v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </UxCard>
  );
}

function OwnershipSnapshot({ symbol, research, onOpen }) {
  const own = useResearchPart(symbol, 'ownership');
  const inst = own.data?.institutional;
  const sharesOut =
    isNum(research.quote.marketCap) && isNum(research.quote.price) && research.quote.price > 0
      ? research.quote.marketCap / research.quote.price
      : null;
  const pctHeld = inst && sharesOut ? (inst.totalShares / sharesOut) * 100 : null;
  const qoq =
    inst && isNum(inst.previousShares) && inst.previousShares > 0
      ? (inst.totalShares / inst.previousShares - 1) * 100
      : null;
  return (
    <UxCard
      id="ux-ov-own"
      title="Ownership and flows"
      icon="bi-people"
      action={
        <button type="button" className="rc-link-btn" onClick={onOpen}>
          View all <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      }
    >
      {own.status !== 'ready' ? (
        <UxState status={own.status} error={own.error} onRetry={own.retry} rows={4} />
      ) : !inst ? (
        <p className="ux-state">No Form 13F holdings are on file for this ticker.</p>
      ) : (
        <>
          <dl className="ux-kv">
            <div>
              <dt>13F holders ({fmtDay(inst.period)})</dt>
              <dd className="rc-num">{inst.holders.toLocaleString('en-US')}</dd>
            </div>
            <div>
              <dt>Shares held by 13F filers</dt>
              <dd className="rc-num">
                {fmtCount(inst.totalShares)}
                {isNum(pctHeld) ? (
                  <span className="ux-muted"> ≈{pctHeld.toFixed(1)}% of shares</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Change vs prior quarter</dt>
              <dd className={`rc-num rc-tone--${signOf(qoq)}`}>
                {isNum(qoq) ? fmtSignedPct(qoq) : 'N/A'}
              </dd>
            </div>
          </dl>
          <ol className="ux-mini-list">
            {inst.top.slice(0, 3).map((h) => (
              <li key={h.cik}>
                <span>{h.name}</span>
                <span className="rc-num">{fmtBig(h.value)}</span>
              </li>
            ))}
          </ol>
          <p className="ux-foot">
            13F shows quarter-end holdings filed up to 45 days later, not trade timing.
            {isNum(pctHeld) ? ' Percent of shares uses market cap divided by price.' : ''}
          </p>
        </>
      )}
    </UxCard>
  );
}

function Catalysts({ symbol, onOpen }) {
  const f = useResearchPart(symbol, 'filings');
  const items = [];
  if (f.data) {
    for (const e of f.data.upcoming.slice(0, 2)) {
      items.push({
        key: `e${e.date}`,
        title: `${e.quarter ? `Q${e.quarter} ${e.year} ` : ''}earnings`,
        date: e.date,
        tag: 'Expected',
        sub: e.hour === 'amc' ? 'After close' : e.hour === 'bmo' ? 'Before open' : null,
      });
    }
    for (const s of f.data.sec.filter((x) => /^(8-K|10-Q|10-K)/.test(x.form)).slice(0, 3)) {
      items.push({
        key: `${s.form}${s.filedAt}`,
        title: `Form ${s.form} filed`,
        date: s.filedAt,
        tag: 'Filed',
        url: s.url,
      });
    }
  }
  return (
    <UxCard
      id="ux-ov-cat"
      title="Catalysts and events"
      icon="bi-calendar-event"
      action={
        <button type="button" className="rc-link-btn" onClick={onOpen}>
          View all <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      }
    >
      {f.status !== 'ready' ? (
        <UxState status={f.status} error={f.error} onRetry={f.retry} rows={3} />
      ) : !items.length ? (
        <p className="ux-state">No scheduled earnings or recent filings were returned.</p>
      ) : (
        <ul className="ux-timeline">
          {items.map((it) => (
            <li key={it.key} className="ux-timeline__item">
              <span
                className={`ux-timeline__dot${it.tag === 'Expected' ? ' is-future' : ''}`}
                aria-hidden="true"
              />
              <div className="ux-timeline__text">
                {it.url ? (
                  <a href={it.url} target="_blank" rel="noopener noreferrer">
                    {it.title}
                  </a>
                ) : (
                  <span>{it.title}</span>
                )}
                <span className="ux-muted rc-num">
                  {fmtDay(it.date)}
                  {it.sub ? ` · ${it.sub}` : ''}
                </span>
              </div>
              <span className="ux-tag">{it.tag}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="ux-foot">Expected dates come from the earnings calendar and can move.</p>
    </UxCard>
  );
}

const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function NewsPreview({ news, onOpen }) {
  return (
    <UxCard
      id="ux-ov-news"
      title="News and sentiment"
      icon="bi-newspaper"
      action={
        <button type="button" className="rc-link-btn" onClick={onOpen}>
          View all <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      }
    >
      {news.status === 'loading' ? (
        <UxState status="loading" rows={3} />
      ) : !news.items.length ? (
        <p className="ux-state">No recent company news.</p>
      ) : (
        <ul className="ux-news">
          {news.items.slice(0, 4).map((n) => (
            <li key={n.url} className="ux-news__item">
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="ux-news__title">
                {n.title}
              </a>
              <span className="ux-muted ux-news__meta">
                {n.source || 'Source'}
                {n.date ? ` · ${shortDate.format(n.date)}` : ''}
              </span>
              {n.sentiment ? (
                <span className={`ux-sent ux-sent--${n.sentiment.toLowerCase()}`}>
                  {n.sentiment}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </UxCard>
  );
}

const MODEL_ICONS = {
  dcf: 'bi-calculator',
  threestatement: 'bi-diagram-3',
  comps: 'bi-people',
  grpv: 'bi-gem',
  earnings: 'bi-mic',
};

function ModelOutputs({ runs, onOpenTool }) {
  return (
    <UxCard
      id="ux-ov-models"
      title="Model outputs"
      icon="bi-boxes"
      info="This session, this ticker"
    >
      <ul className="ux-models">
        {Object.keys(TOOL_LABELS).map((id) => {
          const r = runs[id];
          const value =
            r && isNum(r.value)
              ? id === 'earnings'
                ? r.value.toFixed(1)
                : fmtMoney(r.value)
              : null;
          return (
            <li key={id}>
              <button type="button" className="ux-model" onClick={() => onOpenTool(id)}>
                <i className={`bi ${MODEL_ICONS[id]} ux-model__icon`} aria-hidden="true" />
                <span className="ux-model__name">{TOOL_LABELS[id]}</span>
                <span className="ux-model__value rc-num">
                  {value || (r ? 'Completed' : 'Not run')}
                </span>
                <span className="ux-muted ux-model__note">
                  {r
                    ? `${r.label || r.note || ''}${r.label || r.note ? ' · ' : ''}${timeFmt.format(new Date(r.at))}`
                    : 'Open to run'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </UxCard>
  );
}

export function OverviewBriefing({ symbol, research, onOpenTool, onOpenSection }) {
  const runs = useModelRuns(symbol);
  return (
    <div className="ux-overview">
      <div className="ux-grid ux-grid--3">
        <InvestmentSnapshot
          research={research}
          onSonar={() => onOpenSection('sonar', 'Sonar Research')}
        />
        <ValuationSnapshot research={research} runs={runs} onOpenTool={onOpenTool} />
        <KeyMetrics research={research} />
      </div>
      <div className="ux-grid ux-grid--3">
        <OwnershipSnapshot
          symbol={symbol}
          research={research}
          onOpen={() => onOpenSection('ownership', 'Ownership & Flows')}
        />
        <Catalysts symbol={symbol} onOpen={() => onOpenSection('filings', 'Filings & Events')} />
        <NewsPreview
          news={research.news}
          onOpen={() => onOpenSection('news', 'News & Sentiment')}
        />
      </div>
      <ModelOutputs runs={runs} onOpenTool={onOpenTool} />
    </div>
  );
}

export default OverviewBriefing;
