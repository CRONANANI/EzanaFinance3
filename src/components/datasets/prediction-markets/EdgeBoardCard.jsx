'use client';

/**
 * Card 4, Edge Board: where a price disagrees with a reference, net of half
 * the spread. Informational only: every figure here is a gap between two
 * probabilities, never an instruction. Gaps under 1 point never render
 * (edgeRows drops them; computeEdge withholds them upstream).
 *
 * Tab A: market-implied probability vs the Ezana structural estimate, from
 *   /api/congress/legislation-markets.
 * Tab B: the same event on Polymarket and Kalshi. The cross-venue matcher is
 *   not built yet (06-DATA.md 2.4), so the tab ships with its empty state.
 */
import { useMemo, useState } from 'react';
import { edgeRows } from '@/lib/prediction-markets/page-model';
import {
  Card,
  CardHead,
  ConfChip,
  EDU_LINE,
  Gate,
  Seg,
  SkelRows,
  StateBox,
  Tabs,
  VenueChip,
  cx,
} from './parts';
import { pct, ptsRaw, usd } from './format';

const SORT = [
  { value: 'gap', label: 'Gap' },
  { value: 'confidence', label: 'Confidence' },
];
const METHOD = {
  a: 'Market-implied probability vs the Ezana model estimate. Today: legislation, from the bill-passage model. EV% = (model - implied) / (1 - implied).',
  b: "The same event priced on Polymarket and Kalshi. Net gap subtracts half of each venue's bid-ask spread.",
};

function billLabel(p) {
  const t = String(p.type || '').toLowerCase();
  const map = {
    hr: 'H.R.',
    s: 'S.',
    hjres: 'H.J.Res.',
    sjres: 'S.J.Res.',
    hres: 'H.Res.',
    sres: 'S.Res.',
  };
  return `${map[t] || t.toUpperCase()} ${p.number ?? ''}`.trim();
}

function Dumbbell({ implied, model }) {
  const a = Math.min(implied, model) * 100;
  const b = Math.max(implied, model) * 100;
  const up = model > implied;
  return (
    <span
      className="pmk-dumbbell"
      role="img"
      aria-label={`Market-implied ${pct(implied)}, structural estimate ${pct(model)}`}
    >
      <span className="pmk-db-track" />
      <span className="pmk-db-mid" />
      <span
        className={cx('pmk-db-bar', up ? 'is-up' : 'is-down')}
        style={{ left: `${a}%`, width: `${b - a}%` }}
      />
      <span className="pmk-db-dot pmk-db-dot--market" style={{ left: `${implied * 100}%` }} />
      <span className="pmk-db-dot pmk-db-dot--model" style={{ left: `${model * 100}%` }} />
    </span>
  );
}

function MathPanel({ row, liq, onChart, signedIn }) {
  const half = row.halfSpread * 100;
  const implied = row.implied * 100;
  const model = row.model * 100;
  const deep = liq != null && liq >= 250000;
  const lines = [
    ['Implied', pct(row.implied), 'Market YES price'],
    ['Reference', pct(row.model), 'Structural estimate, stage base rate'],
    [
      'Half spread',
      ptsRaw(half).replace(/^\+/, ''),
      row.spread != null ? `Spread ${(row.spread * 100).toFixed(1)} pts / 2` : 'No quoted spread',
    ],
    [
      'Net gap',
      ptsRaw(row.netGap * 100).replace(/^\+/, ''),
      `|${model.toFixed(1)} - ${implied.toFixed(1)}| - ${half.toFixed(1)}`,
    ],
    [
      'EV%',
      row.evPct != null ? `${row.evPct > 0 ? '+' : ''}${row.evPct.toFixed(1)}%` : 'n/a',
      `(${model.toFixed(1)} - ${implied.toFixed(1)}) / (100 - ${implied.toFixed(1)})`,
    ],
  ];
  return (
    <div className="pmk-expand pmk-gate">
      <div className="pmk-expand-grid" aria-hidden={!signedIn || undefined}>
        <div className="pmk-math">
          <p className="pmk-eyebrow">The math</p>
          {lines.map(([k, v, w]) => (
            <p key={k} className="pmk-math-line pmk-num">
              <span className="pmk-math-k">{k}</span>
              <span className="pmk-math-v">{v}</span>
              <span className="pmk-math-w">{w}</span>
            </p>
          ))}
        </div>
        <div className="pmk-liq">
          <p className="pmk-eyebrow">Liquidity</p>
          <p className="pmk-liq-v pmk-num">
            {liq != null ? usd(liq) : 'n/a'} <span className="pmk-faint">on the book</span>
          </p>
          <span className="pmk-liq-bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, ((liq || 0) / 1000000) * 100)}%` }} />
          </span>
          <p className="pmk-liq-read">
            {liq == null
              ? 'This market reports no liquidity, so weigh the price with care.'
              : deep
                ? 'Deep enough that the price carries weight.'
                : 'Thin: a single trade can move this price.'}
          </p>
          <p className="pmk-liq-links">
            {onChart ? (
              <button type="button" className="pmk-link" onClick={onChart}>
                Chart this market
              </button>
            ) : null}
            <a className="pmk-link" href="#pmk-method">
              How we calculate this
            </a>
          </p>
        </div>
      </div>
      {!signedIn ? (
        <Gate
          title="Sign up free to open the math"
          line="See the implied price, reference, spread and liquidity behind every gap."
        />
      ) : null}
    </div>
  );
}

function EmptyEdge({ tab }) {
  return (
    <div className="pmk-edge-empty">
      <span className="pmk-db-illus" aria-hidden="true">
        <span className="pmk-db-track" />
        <span className="pmk-db-dot pmk-db-dot--market" style={{ left: '50%' }} />
        <span className="pmk-db-dot pmk-db-dot--model" style={{ left: '50%' }} />
      </span>
      {tab === 'a' ? (
        <>
          <p className="pmk-state-title">No gaps above 1 point right now.</p>
          <p className="pmk-state-msg">
            Markets are pricing in line with our references. The board refreshes with every price
            update.
          </p>
        </>
      ) : (
        <>
          <p className="pmk-state-title">No matched cross-venue events yet.</p>
          <p className="pmk-state-msg">
            Ezana compares prices only once the same event, date and outcome are confirmed on both
            venues. Matched pairs appear here as they are confirmed.
          </p>
        </>
      )}
    </div>
  );
}

export function EdgeBoardCard({
  className,
  legislation,
  filters,
  signedIn,
  rows,
  onLoadByQuestion,
}) {
  const [tab, setTab] = useState('a');
  const [sort, setSort] = useState('gap');
  const [highOnly, setHighOnly] = useState(false);
  const [open, setOpen] = useState(null);

  /* Legislation pairs are Polymarket politics markets: they sit under All,
     Politics and Elections, and never under Kalshi. */
  const inScope =
    filters.venue !== 'kalshi' &&
    ['all', 'politics', 'elections'].includes(filters.category || 'all');
  const tabA = useMemo(
    () => (inScope ? edgeRows(legislation.data?.pairs, { sort, highOnly, q: filters.q }) : []),
    [inScope, legislation.data, sort, highOnly, filters.q],
  );
  const liqByQuestion = useMemo(() => {
    const m = new Map();
    for (const r of rows || []) if (r.venue === 'polymarket') m.set(r.question, r.liq);
    return m;
  }, [rows]);

  const list = tab === 'a' ? tabA : [];
  const state =
    tab === 'a'
      ? legislation.error
        ? 'error'
        : legislation.loading && !legislation.data
          ? 'loading'
          : 'ready'
      : 'ready';

  return (
    <Card className={cx('pmk-card--edge', className)} label="Edge board">
      <CardHead
        title="Edge board"
        sub="Price vs reference · net of half the spread"
        right={
          <div className="pmk-head-controls">
            <Seg label="Sort gaps" value={sort} options={SORT} onChange={setSort} />
            <button
              type="button"
              className={cx('pmk-chip pmk-toggle', highOnly && 'is-on')}
              aria-pressed={highOnly}
              onClick={() => setHighOnly((v) => !v)}
            >
              <span className="pmk-switch" aria-hidden="true" />
              High only
            </button>
          </div>
        }
      />
      <Tabs
        label="Edge board view"
        idBase="pmk-edge"
        value={tab}
        onChange={(v) => {
          setTab(v);
          setOpen(null);
        }}
        tabs={[
          { value: 'a', label: 'Ezana model vs market', count: tabA.length },
          { value: 'b', label: 'Cross-venue gaps', count: 0 },
        ]}
      />
      <p className="pmk-method">{METHOD[tab]}</p>

      <div id="pmk-edge-panel" role="tabpanel" className="pmk-card-body">
        {state === 'loading' ? (
          <SkelRows n={4} height={64} label="Loading the edge board" />
        ) : state === 'error' ? (
          <StateBox kind="error" onRetry={legislation.retry} minHeight={240} />
        ) : !list.length ? (
          <EmptyEdge tab={tab} />
        ) : (
          <>
            <div className="pmk-edge-head" aria-hidden="true">
              <span className="pmk-c-rank">#</span>
              <span className="pmk-c-q">Market</span>
              <span className="pmk-c-num">Implied</span>
              <span className="pmk-c-num">Model</span>
              <span className="pmk-c-track">
                <span>0</span>
                <span>50</span>
                <span>100%</span>
              </span>
              <span className="pmk-c-gap">Net gap</span>
              <span className="pmk-c-ev">EV%</span>
              <span className="pmk-c-conf">Confidence</span>
              <span className="pmk-c-exp" />
            </div>
            <ol className="pmk-edge-list">
              {list.map((r, i) => {
                const isOpen = open === r.billId;
                const signed = (r.model - r.implied) * 100;
                const liq = liqByQuestion.get(r.market?.question) ?? null;
                const chartable = liqByQuestion.has(r.market?.question);
                return (
                  <li key={r.billId} className="pmk-edge-item">
                    <div className="pmk-edge-row">
                      <span className="pmk-c-rank pmk-num">{i + 1}</span>
                      <span className="pmk-c-q">
                        <span className="pmk-edge-q pmk-clamp2">{r.market?.question}</span>
                        <span className="pmk-edge-meta">
                          <VenueChip venue="polymarket" small />
                          <span className="pmk-num">{billLabel(r)}</span>
                          <span>Structural estimate</span>
                        </span>
                      </span>
                      <span className="pmk-c-num pmk-num">
                        <span className="pmk-inline-k">Implied</span>
                        {pct(r.implied)}
                      </span>
                      <span className="pmk-c-num pmk-num pmk-strong">
                        <span className="pmk-inline-k">Model</span>
                        {pct(r.model)}
                      </span>
                      <span className="pmk-c-track">
                        <Dumbbell implied={r.implied} model={r.model} />
                      </span>
                      <span className={cx('pmk-c-gap pmk-num', signed > 0 ? 'is-up' : 'is-down')}>
                        {ptsRaw(signed)}
                      </span>
                      <span className="pmk-c-ev pmk-num">
                        {r.evPct != null
                          ? `${r.evPct > 0 ? '+' : ''}${r.evPct.toFixed(1)}%`
                          : 'n/a'}
                      </span>
                      <span className="pmk-c-conf">
                        <ConfChip confidence={r.confidence} />
                      </span>
                      <span className="pmk-c-exp">
                        <button
                          type="button"
                          className={cx('pmk-icon-btn pmk-expander', isOpen && 'is-open')}
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? 'Hide' : 'Show'} the math for ${r.market?.question}`}
                          onClick={() => setOpen(isOpen ? null : r.billId)}
                        >
                          <i className="bi bi-chevron-down" aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                    {isOpen ? (
                      <MathPanel
                        row={r}
                        liq={liq}
                        signedIn={signedIn}
                        onChart={chartable ? () => onLoadByQuestion(r.market?.question) : null}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </>
        )}
        <p className="pmk-edge-legend">
          <span>
            <span className="pmk-db-dot pmk-db-dot--market pmk-db-dot--inline" aria-hidden="true" />{' '}
            Market-implied
          </span>
          <span>
            <span className="pmk-db-dot pmk-db-dot--model pmk-db-dot--inline" aria-hidden="true" />{' '}
            Structural estimate
          </span>
          <span className="pmk-num">
            High 4+ pts · Medium 2 to 4 · Low 1 to 2 · under 1 pt not shown
          </span>
        </p>
      </div>
      <footer className="pmk-foot pmk-foot--edu">
        <p className="pmk-legal">{EDU_LINE}</p>
        <a className="pmk-link" href="#pmk-method">
          How we calculate this
        </a>
      </footer>
    </Card>
  );
}
