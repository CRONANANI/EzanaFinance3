'use client';

/**
 * Fastest-rising countries (Option A, Oct 15). Was "Sanctions momentum vs
 * currency": the currency line is gone, because a sanctions series drawn
 * beside an exchange rate invites a causal reading the data cannot support.
 *
 * The countries adding OFAC listings fastest by address country: the last 12
 * months against the 12 before, by OFAC's listing date, minimum ten recent
 * listings. Each row shows 24 monthly bars. Selecting a country sets the
 * page's country filter.
 */
import { StateNote, fmt, monthLabel } from './ui';

function Row({ row, selected, onPick }) {
  const W = 240;
  const H = 46;
  const maxBar = Math.max(1, ...row.added);
  const bw = W / row.added.length;
  const label = `${row.country}: ${fmt(row.recent)} new listings in the last 12 months against ${fmt(row.prior)} in the 12 before.`;
  return (
    <li>
      <button
        type="button"
        className={`snx-mo-row${selected ? ' is-on' : ''}`}
        onClick={() => onPick(row.country)}
        aria-label={label}
        aria-pressed={selected}
      >
        <span className="snx-mo-head">
          <span className="snx-mo-name">{row.country}</span>
          <span className="snx-mo-stat snx-mono">
            +{fmt(row.recent)}
            {row.change != null ? (
              <em className={row.change >= 0 ? 'is-up' : 'is-down'}>
                {row.change >= 0 ? '+' : ''}
                {fmt(row.change)}%
              </em>
            ) : (
              <em className="is-up">new</em>
            )}
          </span>
        </span>
        <svg
          className="snx-mo-chart"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {row.added.map((n, i) => (
            <rect
              key={row.months[i]}
              className={`snx-mo-bar${i >= 12 ? ' is-recent' : ''}`}
              x={i * bw + 1}
              width={Math.max(1, bw - 2)}
              y={H - (n / maxBar) * (H - 4)}
              height={(n / maxBar) * (H - 4)}
            />
          ))}
        </svg>
        <span className="snx-mo-foot">
          <span>{monthLabel(row.months[0])}</span>
          <span>{fmt(row.prior)} the year before</span>
          <span>{monthLabel(row.months[row.months.length - 1])}</span>
        </span>
      </button>
    </li>
  );
}

export default function RisingCountries({ trends, selected, onPick }) {
  const rows = trends?.rows || [];
  return (
    <section className="snx-card" aria-labelledby="snx-rising">
      <div className="snx-card-head">
        <div>
          <h2 id="snx-rising" className="snx-card-title">
            Fastest-rising countries
          </h2>
          <p className="snx-card-sub">
            Address countries adding OFAC listings fastest: the last 12 months against the 12
            before.
          </p>
        </div>
      </div>
      {rows.length ? (
        <>
          <ol className="snx-mo">
            {rows.map((r) => (
              <Row key={r.country} row={r} selected={selected === r.country} onPick={onPick} />
            ))}
          </ol>
          <span className="snx-strip-legend">
            <span>
              <i className="snx-mo-key-bar" aria-hidden="true" />
              New listings a month (last 12 bright)
            </span>
          </span>
          <p className="snx-fine">
            By OFAC&apos;s listing date and the address countries OFAC publishes; a country needs
            ten or more recent listings to rank. Counts measure listing activity, not the effect of
            sanctions.
          </p>
        </>
      ) : (
        <StateNote kind={trends?.ready ? 'empty' : 'unavailable'}>
          {trends?.ready
            ? 'No country has added ten or more listings in the past year.'
            : 'OFAC listing dates are not loaded yet; this card fills in after the first import.'}
        </StateNote>
      )}
    </section>
  );
}
