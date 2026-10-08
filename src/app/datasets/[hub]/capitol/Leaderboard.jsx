'use client';

/**
 * Who reads contract awards best: the award-leaders linkage as a ranked
 * table. Quick Step badges sit next to qualifying traders; the locked badge
 * is the legend; the gold explainer says how it is earned.
 */
import QuickStepBadge from '@/components/datasets/hub/QuickStepBadge';
import { useCwh } from './CwhProvider';
import { PartyTag, SourceFoot, TypeTag } from './bits';
import { DASH, count, pct0, signed } from './cwh-format';

const cell = (r, label) => r.cells?.find((c) => c.label === label)?.value ?? null;
const memberFromHref = (href) => {
  const m = /[?&]member=([A-Za-z]\d{6})/.exec(href || '');
  return m ? m[1].toUpperCase() : null;
};

export default function Leaderboard({ rows = [], error = false }) {
  const { openMember, openCompany } = useCwh();
  return (
    <section className="cwh-card cwh-lead" aria-labelledby="cwh-lead-h">
      <div className="cwh-mod-head">
        <div>
          <h2 className="cwh-h4" id="cwh-lead-h">
            Who reads contract awards best
          </h2>
          <p className="cwh-caption">
            Insight score = average 30-day return × hit rate, scaled down for small samples.
          </p>
        </div>
        <QuickStepBadge kind="actor" earned={false} compact />
      </div>
      {error ? (
        <p className="cwh-empty">
          This signal could not be loaded just now. It refreshes on its own; reload in a minute.
        </p>
      ) : !rows.length ? (
        <p className="cwh-empty">
          Fills once traders have measured trades near contract awards: 30 days of price history
          after each trade.
        </p>
      ) : (
        <div className="cwh-scroll">
          <table className="cwh-table cwh-table--lead">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">TRADER</th>
                <th scope="col" className="is-num">
                  SCORE
                </th>
                <th scope="col" className="is-num">
                  N
                </th>
                <th scope="col" className="is-num">
                  AVG 30D
                </th>
                <th scope="col" className="is-num">
                  HIT
                </th>
                <th scope="col">BEST</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const id = memberFromHref(r.href);
                const avg = cell(r, 'Avg 30-day return');
                const best = cell(r, 'Best');
                return (
                  <tr key={r.key}>
                    <td className={`cwh-mono cwh-rank${i === 0 ? ' is-first' : ''}`}>{i + 1}</td>
                    <td>
                      <div className="cwh-who">
                        {id ? (
                          <button
                            type="button"
                            className="cwh-who-name"
                            onClick={() => openMember(id)}
                          >
                            {r.title}
                          </button>
                        ) : r.href ? (
                          <a className="cwh-who-name" href={r.href}>
                            {r.title}
                          </a>
                        ) : (
                          <span className="cwh-who-name">{r.title}</span>
                        )}
                        <span className="cwh-who-tags">
                          <TypeTag type={r.tag} />
                          <PartyTag party={r.party} />
                          {r.badge ? <QuickStepBadge kind="actor" compact /> : null}
                        </span>
                      </div>
                    </td>
                    <td className="cwh-mono is-num cwh-strong">
                      {cell(r, 'Insight score') == null
                        ? DASH
                        : Number(cell(r, 'Insight score')).toFixed(1)}
                    </td>
                    <td className="cwh-mono is-num">{count(cell(r, 'Trades'))}</td>
                    <td
                      className={`cwh-mono is-num${avg == null ? '' : avg >= 0 ? ' is-pos' : ' is-neg'}`}
                    >
                      {signed(avg)}
                    </td>
                    <td className="cwh-mono is-num">{pct0(cell(r, 'Hit rate'))}</td>
                    <td>
                      {best ? (
                        <button
                          type="button"
                          className="cwh-tk"
                          onClick={() => openCompany({ ticker: best })}
                        >
                          {best}
                        </button>
                      ) : (
                        DASH
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="cwh-gold-note">
        <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
        <p>
          <b>Quick Step</b> is earned with 3 or more measured trades near awards, 60% or more ahead
          30 days later, averaging +5% or better. Linked brokerage accounts can track their own
          progress.
        </p>
      </div>
      <SourceFoot
        window="Trades and awards in the last 2 years"
        sources="House Clerk, Senate eFD, SEC Forms 4, 13F and 13D/G, USAspending.gov"
      />
    </section>
  );
}
