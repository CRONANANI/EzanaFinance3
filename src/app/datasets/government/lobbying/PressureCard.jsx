'use client';

/**
 * Card 4, Pressure Map: the top 12 issues by the top 10 government bodies
 * contacted. Each cell is the number of filings naming both, never dollars.
 * Row labels are buttons that set the issue filter; cells show a hover
 * tooltip (top three clients); a visually hidden table carries the same
 * counts for screen readers.
 */
import { useState } from 'react';
import { pressureMatrix } from '@/lib/lobbying/page-model';
import { fmtCount } from '@/lib/lobbying/page-format';
import { Card, Skel } from './ui';

const LEGEND = [0.05, 0.25, 0.45, 0.65, 0.88];

export default function PressureCard({ view, selected, onPick, sub, partial, empty }) {
  const m = pressureMatrix(view.data);
  const [tip, setTip] = useState(null);
  const isEmpty = view.status === 'ready' && (!m.rows.length || !m.cols.length);
  return (
    <Card
      id="lbx-pressure"
      title="Pressure map"
      sub={sub}
      right={
        <div className="lbx-legend" aria-hidden="true">
          <span className="lbx-faint">Fewer</span>
          {LEGEND.map((o) => (
            <span key={o} className="lbx-legend-swatch" style={{ '--lbx-heat-o': o }} />
          ))}
          <span className="lbx-faint">More filings</span>
        </div>
      }
      status={view.status}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      partial={partial}
      skeleton={
        <div className="lbx-pm-skel">
          {Array.from({ length: 12 }, (_, i) => (
            <Skel key={i} h={30} />
          ))}
        </div>
      }
      footer={
        <p className="lbx-notes-line">
          Counts are filings naming both the issue and the body, not dollars. A filing that names
          several of either counts in each cell it touches.
        </p>
      }
    >
      <div className="lbx-pm-scroll" onMouseLeave={() => setTip(null)}>
        <div className="lbx-pm" style={{ '--lbx-pm-cols': m.cols.length }}>
          <span className="lbx-pm-corner" aria-hidden="true" />
          {m.cols.map((c) => (
            <span
              key={c.name}
              className="lbx-pm-colhead lbx-mono"
              title={c.name}
              aria-hidden="true"
            >
              {c.label}
            </span>
          ))}
          <span className="lbx-pm-colhead lbx-mono" aria-hidden="true">
            Total
          </span>

          {m.rows.map((r) => {
            const on = selected === r.code;
            return (
              <div key={r.code} className="lbx-pm-row">
                <button
                  type="button"
                  className={`lbx-pm-rowhead${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  title={r.label}
                  onClick={() => onPick(on ? null : r.code)}
                >
                  <span className="lbx-ellipsis">{r.label}</span>
                  <span className="lbx-sr">
                    {on ? ', clear the issue filter' : ', filter the page to this issue'}
                  </span>
                </button>
                {r.cells.map((c, j) => (
                  <span
                    key={c.entity}
                    aria-hidden="true"
                    className={`lbx-pm-cell${c.dark ? ' is-dark' : ''}${on ? ' is-sel' : ''}`}
                    style={{ '--lbx-heat-o': c.heat }}
                    onMouseEnter={(e) => {
                      const box = e.currentTarget.getBoundingClientRect();
                      const host = e.currentTarget
                        .closest('.lbx-pm-scroll')
                        .getBoundingClientRect();
                      setTip({
                        x: box.left - host.left + box.width / 2,
                        y: box.top - host.top,
                        issue: r.label,
                        body: m.cols[j].name,
                        n: c.filings,
                        top: c.topClients,
                      });
                    }}
                  >
                    {c.filings > 500 ? (
                      <span className="lbx-mono">{fmtCount(c.filings)}</span>
                    ) : null}
                  </span>
                ))}
                <span className="lbx-pm-total lbx-mono" aria-hidden="true">
                  {fmtCount(r.filings)}
                </span>
              </div>
            );
          })}

          <span className="lbx-pm-foothead lbx-kicker lbx-kicker--sm" aria-hidden="true">
            Filings
          </span>
          {m.cols.map((c) => (
            <span key={c.name} className="lbx-pm-coltotal lbx-mono" aria-hidden="true">
              {fmtCount(c.filings)}
            </span>
          ))}
          <span className="lbx-pm-coltotal lbx-mono" aria-hidden="true">
            {fmtCount(m.total)}
          </span>
        </div>

        {tip ? (
          <div className="lbx-tip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
            <p className="lbx-tip-title">
              {tip.issue} <span className="lbx-faint">×</span> {tip.body}
            </p>
            <p className="lbx-mono lbx-tip-n">{fmtCount(tip.n)} filings</p>
            {tip.top?.length ? (
              <ol className="lbx-tip-list">
                {tip.top.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}
      </div>

      <table className="lbx-sr">
        <caption>Filings naming each issue and government body</caption>
        <thead>
          <tr>
            <th scope="col">Issue</th>
            {m.cols.map((c) => (
              <th key={c.name} scope="col">
                {c.name}
              </th>
            ))}
            <th scope="col">Filings citing the issue</th>
          </tr>
        </thead>
        <tbody>
          {m.rows.map((r) => (
            <tr key={r.code}>
              <th scope="row">{r.label}</th>
              {r.cells.map((c) => (
                <td key={c.entity}>{c.filings}</td>
              ))}
              <td>{r.filings}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
