'use client';

/**
 * Who reads contract awards best: every politician, insider, institution and
 * whale with a trade within 30 days of a federal award to the same company,
 * how many of those trades came ahead of the award and by how many days, and
 * an insight score over the trades whose 30-day return can be measured.
 * Companies is the sixth view: the companies whose stock moves after their
 * awards. Shared by tab B of the signals panel and the leaderboard card.
 *
 * Unmeasured traders (no 30-day price history yet) show a dash for score and
 * average return, with a title saying why, and a note under the table.
 */
import { useMemo, useState } from 'react';
import QuickStepBadge from '@/components/datasets/hub/QuickStepBadge';
import { useCwh } from './CwhProvider';
import { PartyTag, TypeTag } from './bits';
import { DASH, count, money, pct0, signed } from './cwh-format';

const TYPES = [
  { id: 'all', label: 'All traders' },
  { id: 'Politician', label: 'Politicians' },
  { id: 'Insider', label: 'Insiders' },
  { id: 'Institution', label: 'Institutions' },
  { id: 'Whale', label: 'Whales' },
  { id: 'companies', label: 'Companies' },
];

const HREF = {
  Insider: '/datasets/insider',
  Institution: '/datasets/institutional',
  Whale: '/datasets/whale-moves',
};

const UNMEASURED = 'No 30-day price history yet for these trades, so no return or score.';
const isParty = (v) => v === 'D' || v === 'R' || v === 'I';

function Trader({ r }) {
  const { openMember } = useCwh();
  const party = isParty(r.detail) ? r.detail : null;
  return (
    <div className="cwh-who">
      {r.type === 'Politician' ? (
        <button
          type="button"
          className="cwh-who-name"
          data-member={r.id}
          data-member-name={r.name}
          data-member-party={party || undefined}
          onClick={() => openMember(r.id, { name: r.name, party })}
        >
          {r.name}
        </button>
      ) : (
        <a className="cwh-who-name" href={HREF[r.type] || '/datasets/whale-moves'}>
          {r.name}
        </a>
      )}
      <span className="cwh-who-tags">
        <TypeTag type={r.type} />
        <PartyTag party={party} />
        {r.quickStep ? <QuickStepBadge kind="actor" compact /> : null}
      </span>
    </div>
  );
}

function TickerBtn({ ticker }) {
  const { openCompany } = useCwh();
  if (!ticker) return <span className="cwh-faint">{DASH}</span>;
  return (
    <button
      type="button"
      className="cwh-tk"
      data-ticker={ticker}
      onClick={() => openCompany({ ticker })}
    >
      {ticker}
    </button>
  );
}

function Companies({ companies }) {
  if (!companies.length) {
    return (
      <p className="cwh-empty">
        Fills once companies have measured award dates with price history.
      </p>
    );
  }
  return (
    <div className="cwh-scroll">
      <table className="cwh-table">
        <thead>
          <tr>
            <th scope="col">TICKER</th>
            <th scope="col" className="is-num">
              AWARD DATES
            </th>
            <th scope="col" className="is-num">
              AWARD VALUE
            </th>
            <th scope="col" className="is-num">
              AVG MOVE, 30D
            </th>
            <th scope="col" className="is-num">
              ROSE
            </th>
            <th scope="col">TOP AGENCY</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <tr key={c.ticker}>
              <td data-label="Ticker">
                <TickerBtn ticker={c.ticker} />
                {c.badge ? <QuickStepBadge kind="company" compact /> : null}
              </td>
              <td data-label="Award dates" className="cwh-mono is-num">
                {count(c.awardDates)}
              </td>
              <td data-label="Award value" className="cwh-mono is-num">
                {money(c.awardValue)}
              </td>
              <td
                data-label="Avg move"
                className={`cwh-mono is-num${c.avgMovePct == null ? '' : c.avgMovePct >= 0 ? ' is-pos' : ' is-neg'}`}
              >
                {signed(c.avgMovePct)}
              </td>
              <td data-label="Rose" className="cwh-mono is-num">
                {c.hitRate == null ? DASH : pct0(c.hitRate * 100)}
              </td>
              <td data-label="Agency" className="cwh-mute">
                {c.agency || DASH}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AwardReaders({
  readers,
  companies = [],
  compact = false,
  idPrefix = 'ar',
}) {
  const [type, setType] = useState('all');
  const all = useMemo(() => readers?.rows || [], [readers]);
  const counts = useMemo(() => {
    const c = { all: all.length, companies: companies.length };
    for (const r of all) c[r.type] = (c[r.type] || 0) + 1;
    return c;
  }, [all, companies.length]);
  const rows = type === 'all' ? all : all.filter((r) => r.type === type);
  const anyUnmeasured = rows.some((r) => !r.measured);

  return (
    <>
      <div className="cwh-pills cwh-pills--sm cwh-ar-pills" role="group" aria-label="Trader type">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`cwh-pill${type === t.id ? ' is-active' : ''}`}
            aria-pressed={type === t.id}
            aria-controls={`${idPrefix}-body`}
            onClick={() => setType(t.id)}
          >
            {t.label} <span className="cwh-mono">{count(counts[t.id] || 0)}</span>
          </button>
        ))}
      </div>
      <div id={`${idPrefix}-body`}>
        {type === 'companies' ? (
          <Companies companies={companies} />
        ) : readers?.error ? (
          <p className="cwh-empty">
            This signal could not be loaded just now. It refreshes on its own; reload in a minute.
          </p>
        ) : !rows.length ? (
          <p className="cwh-empty">
            {type === 'all'
              ? 'Fills once traders have trades within 30 days of a contract award to the same company.'
              : `No ${TYPES.find((t) => t.id === type)?.label.toLowerCase()} have traded within 30 days of an award yet.`}
          </p>
        ) : (
          <div className="cwh-scroll">
            <table className={`cwh-table cwh-table--lead${compact ? ' is-compact' : ''}`}>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">TRADER</th>
                  <th scope="col" className="is-num">
                    SCORE
                  </th>
                  <th scope="col" className="is-num" title="Trades within 30 days of an award">
                    TRADES
                  </th>
                  <th scope="col" className="is-num" title="Trades made before the award date">
                    AHEAD
                  </th>
                  {compact ? null : (
                    <th scope="col" className="is-num" title="Average days ahead of the award">
                      AVG LEAD
                    </th>
                  )}
                  <th scope="col" className="is-num">
                    AVG 30D
                  </th>
                  {compact ? null : (
                    <th scope="col" className="is-num">
                      HIT
                    </th>
                  )}
                  <th scope="col">BEST</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.type}-${r.id}`}>
                    <td className={`cwh-mono cwh-rank${i === 0 ? ' is-first' : ''}`}>{i + 1}</td>
                    <td>
                      <Trader r={r} />
                    </td>
                    <td
                      className="cwh-mono is-num cwh-strong"
                      title={r.score == null ? UNMEASURED : `${r.measured} measured trades`}
                    >
                      {r.score == null ? DASH : r.score.toFixed(1)}
                    </td>
                    <td className="cwh-mono is-num">{count(r.trades)}</td>
                    <td className="cwh-mono is-num">{count(r.beforeAward)}</td>
                    {compact ? null : (
                      <td className="cwh-mono is-num">
                        {r.avgLeadDays == null ? DASH : `${Math.round(r.avgLeadDays)}d`}
                      </td>
                    )}
                    <td
                      className={`cwh-mono is-num${r.avgRetPct == null ? '' : r.avgRetPct >= 0 ? ' is-pos' : ' is-neg'}`}
                      title={r.avgRetPct == null ? UNMEASURED : undefined}
                    >
                      {r.avgRetPct == null ? DASH : signed(r.avgRetPct)}
                    </td>
                    {compact ? null : (
                      <td className="cwh-mono is-num">
                        {r.hitRate == null ? DASH : pct0(r.hitRate * 100)}
                      </td>
                    )}
                    <td>
                      <TickerBtn ticker={r.bestTicker} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {type !== 'companies' && anyUnmeasured ? (
          <p className="cwh-caption cwh-ar-note">
            A dash under score or return means none of that trader&apos;s trades near an award has
            30 days of price history yet. They are listed by how many trades came ahead of the
            award.
          </p>
        ) : null}
      </div>
    </>
  );
}
