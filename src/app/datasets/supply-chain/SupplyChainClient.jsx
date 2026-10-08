'use client';

/**
 * Supply Chain Monitoring: chokepoint transits and port calls (IMF PortWatch),
 * the NY Fed Global Supply Chain Pressure Index and the Cass Freight Index.
 * Every figure comes from the loaded data; nothing is filled in.
 */
import { useMemo, useState } from 'react';
import HubQueryLink from '@/components/datasets/HubQueryLink';
import { usePublishTicker } from '@/components/datasets/ticker-slot';
import {
  DASH,
  SeriesChart,
  fmtCompact,
  fmtDate,
  fmtMonth,
  fmtNum,
  fmtSigned,
  movingAverage,
  pctChange,
  tone,
  useEyesDetail,
} from '@/components/datasets/eyes/eyes-bits';
import './supply-chain.css';

const CASS_SHIP = 'FRGSHPUSM649NCIS';
const CASS_EXP = 'FRGEXPUSM649NCIS';

/** Latest value against the same month a year earlier, as a percent. */
function yoy(points) {
  const last = points?.[points.length - 1];
  if (!last) return null;
  const prior = points.find(
    (p) => p.date === `${Number(last.date.slice(0, 4)) - 1}${last.date.slice(4)}`,
  );
  return { date: last.date, value: last.value, change: pctChange(last.value, prior?.value) };
}

function Change({ v }) {
  if (v == null) return <span className="scm-muted">{DASH}</span>;
  return <span className={`scm-mono scm-${tone(v)}`}>{fmtSigned(v)}</span>;
}

function DailyDetail({ kind, item, unit }) {
  const state = useEyesDetail(kind, item?.id);
  const rows = useMemo(
    () => (state.data ? movingAverage(state.data, 'total', 7, 'ma7') : []),
    [state.data],
  );
  if (!item) return null;
  return (
    <figure className="scm-card" style={{ margin: '0 0 16px' }} aria-live="polite">
      <figcaption className="scm-card-title">
        {item.name}: daily {unit}, last 365 days
      </figcaption>
      {state.status === 'loading' ? (
        <div aria-busy="true">
          <div className="scm-skel" />
          <div className="scm-skel" />
          <div className="scm-skel" />
        </div>
      ) : state.status === 'error' ? (
        <p className="scm-empty">This series could not be loaded. Try again shortly.</p>
      ) : rows.length < 2 ? (
        <p className="scm-empty">No daily history is loaded for {item.name} yet.</p>
      ) : (
        <SeriesChart
          data={rows}
          lines={[
            { key: 'total', label: `Daily ${unit}`, stroke: 'var(--text-faint)', width: 1 },
            { key: 'ma7', label: '7-day average', stroke: 'var(--cyan)', width: 2 },
          ]}
          yFmt={(v) => fmtNum(v, 0)}
          label={`${item.name} daily ${unit} with a 7-day moving average`}
        />
      )}
    </figure>
  );
}

export default function SupplyChainClient({ data, error }) {
  const chokepoints = useMemo(() => data?.chokepoints || [], [data]);
  const ports = useMemo(() => data?.ports || [], [data]);
  const series = data?.series || [];
  const gscpi = series.find((s) => s.id === 'GSCPI');
  const ship = series.find((s) => s.id === CASS_SHIP);
  const exp = series.find((s) => s.id === CASS_EXP);
  const gLast = gscpi?.points?.[gscpi.points.length - 1];
  const shipYoy = yoy(ship?.points);
  const mover = chokepoints.find((c) => c.change != null);

  const [chokeSel, setChokeSel] = useState(null);
  const [portSel, setPortSel] = useState(null);
  const [q, setQ] = useState('');
  const activeChoke = chokeSel || chokepoints[0] || null;

  const portView = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t
      ? ports.filter(
          (p) =>
            (p.name || '').toLowerCase().includes(t) || (p.country || '').toLowerCase().includes(t),
        )
      : ports;
  }, [ports, q]);

  const tickerItems = useMemo(
    () =>
      chokepoints
        .filter((c) => c.change != null)
        .slice(0, 12)
        .map((c) => ({
          id: c.id,
          lead: '7-day transits vs 1 year',
          main: c.name,
          value: fmtSigned(c.change),
        })),
    [chokepoints],
  );
  usePublishTicker({ items: tickerItems, ariaLabel: 'Chokepoints moving off normal' });

  const nothing = !chokepoints.length && !ports.length && !series.length;

  return (
    <div className="scm-page">
      <header className="scm-header">
        <p className="scm-eyebrow">DATASETS · EYES ABOVE</p>
        <h1 className="scm-title">Supply Chain Monitoring</h1>
        <p className="scm-sub">
          Ship traffic through the world&apos;s maritime chokepoints and busiest ports, measured
          against the year before, with the pressure and freight indexes that frame it.
        </p>
        {data?.through ? (
          <p className="scm-through">
            Data through <strong>{fmtDate(data.through)}</strong>
          </p>
        ) : null}
        <dl className="scm-tiles">
          <div className="scm-tile">
            <dt>Supply chain pressure (GSCPI)</dt>
            <dd>
              {gLast ? fmtSigned(gLast.value, 2, '') : DASH}
              <span className="scm-tile-meta">
                {gLast
                  ? `${fmtMonth(gLast.date)}, ${gLast.value >= 0 ? 'above' : 'below'} average`
                  : 'Not loaded yet'}
              </span>
            </dd>
          </div>
          <div className="scm-tile">
            <dt>Cass shipments, year over year</dt>
            <dd>
              {shipYoy?.change != null ? fmtSigned(shipYoy.change) : DASH}
              <span className="scm-tile-meta">
                {shipYoy ? fmtMonth(shipYoy.date) : 'Not loaded yet'}
              </span>
            </dd>
          </div>
          <div className="scm-tile">
            <dt>Biggest chokepoint move, 7 days</dt>
            <dd>
              {mover ? fmtSigned(mover.change) : DASH}
              <span className="scm-tile-meta">
                {mover ? `${mover.name}, against its 1-year average` : 'Not loaded yet'}
              </span>
            </dd>
          </div>
          <div className="scm-tile">
            <dt>Data through</dt>
            <dd>
              {data?.through ? fmtDate(data.through) : DASH}
              <span className="scm-tile-meta">Latest date in the loaded data</span>
            </dd>
          </div>
        </dl>
      </header>

      <HubQueryLink dimension="eyes" />

      {error ? (
        <p className="scm-empty" role="alert">
          Supply chain data could not be loaded right now. Please try again shortly.
        </p>
      ) : nothing ? (
        <p className="scm-empty">
          No supply chain data is loaded yet. Port and chokepoint activity loads daily from IMF
          PortWatch, and the pressure and freight indexes monthly.
        </p>
      ) : null}

      {!error ? (
        <>
          <section className="scm-section" aria-labelledby="scm-choke-h">
            <h2 id="scm-choke-h" className="scm-section-title">
              Chokepoints
            </h2>
            <p className="scm-note">
              Average daily transits over the last 7 days of data against the 365 days before
              {data?.chokeThrough ? `, through ${fmtDate(data.chokeThrough)}` : ''}. Select a
              chokepoint for its daily history.
            </p>
            {!chokepoints.length ? (
              <p className="scm-empty">Chokepoint transits are not loaded yet.</p>
            ) : (
              <>
                <DailyDetail kind="chokepoint" item={activeChoke} unit="transits" />
                <div className="scm-table-wrap">
                  <table className="scm-table">
                    <thead>
                      <tr>
                        <th scope="col">Chokepoint</th>
                        <th scope="col" className="r">
                          7-day avg
                        </th>
                        <th scope="col" className="r">
                          1-year avg
                        </th>
                        <th scope="col" className="r">
                          Change
                        </th>
                        <th scope="col" className="r">
                          Tankers
                        </th>
                        <th scope="col" className="r">
                          Containers
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {chokepoints.map((c) => (
                        <tr
                          key={c.id}
                          className={activeChoke?.id === c.id ? 'is-selected' : undefined}
                        >
                          <td>
                            <button
                              type="button"
                              className="scm-row-btn"
                              onClick={() => setChokeSel(c)}
                              aria-pressed={activeChoke?.id === c.id}
                            >
                              {c.name}
                            </button>
                          </td>
                          <td className="scm-mono r">{fmtNum(c.recent) ?? DASH}</td>
                          <td className="scm-mono r">{fmtNum(c.base) ?? DASH}</td>
                          <td className="r">
                            <Change v={c.change} />
                          </td>
                          <td className="scm-mono r">{fmtNum(c.tankers) ?? DASH}</td>
                          <td className="scm-mono r">{fmtNum(c.containers) ?? DASH}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="scm-section" aria-labelledby="scm-ports-h">
            <h2 id="scm-ports-h" className="scm-section-title">
              Ports
            </h2>
            <p className="scm-note">
              The 100 busiest ports by calls over the last 12 months. Calls, imports and exports are
              daily averages over the last 28 days of data
              {data?.portsThrough ? ` (through ${fmtDate(data.portsThrough)})` : ''}, with the
              change in calls against the year before.
            </p>
            {!ports.length ? (
              <p className="scm-empty">Port activity is not loaded yet.</p>
            ) : (
              <>
                <div className="scm-controls" role="search">
                  <input
                    className="scm-input"
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by port or country"
                    aria-label="Search by port or country"
                  />
                </div>
                <DailyDetail kind="port" item={portSel} unit="port calls" />
                {!portView.length ? (
                  <p className="scm-empty">No port matches that search.</p>
                ) : (
                  <div className="scm-table-wrap">
                    <table className="scm-table">
                      <thead>
                        <tr>
                          <th scope="col">Port</th>
                          <th scope="col">Country</th>
                          <th scope="col" className="r">
                            Calls / day
                          </th>
                          <th scope="col" className="r">
                            Year before
                          </th>
                          <th scope="col" className="r">
                            Change
                          </th>
                          <th scope="col" className="r">
                            Imports t / day
                          </th>
                          <th scope="col" className="r">
                            Exports t / day
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {portView.map((p) => (
                          <tr
                            key={p.id}
                            className={portSel?.id === p.id ? 'is-selected' : undefined}
                          >
                            <td>
                              <button
                                type="button"
                                className="scm-row-btn"
                                onClick={() => setPortSel(portSel?.id === p.id ? null : p)}
                                aria-pressed={portSel?.id === p.id}
                              >
                                {p.name}
                              </button>
                            </td>
                            <td>{p.country || DASH}</td>
                            <td className="scm-mono r">{fmtNum(p.recent) ?? DASH}</td>
                            <td className="scm-mono r">{fmtNum(p.base) ?? DASH}</td>
                            <td className="r">
                              <Change v={p.change} />
                            </td>
                            <td className="scm-mono r">{fmtCompact(p.imports, 0) ?? DASH}</td>
                            <td className="scm-mono r">{fmtCompact(p.exports, 0) ?? DASH}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="scm-section" aria-labelledby="scm-gscpi-h">
            <h2 id="scm-gscpi-h" className="scm-section-title">
              Global Supply Chain Pressure Index
            </h2>
            <p className="scm-note">
              Measured in standard deviations from the index&apos;s average: zero is normal, above
              zero is more pressure than usual.
              {gscpi?.lastDate ? ` Monthly, through ${fmtMonth(gscpi.lastDate)}.` : ''}
            </p>
            {gscpi?.points?.length > 1 ? (
              <div className="scm-card">
                <SeriesChart
                  data={gscpi.points}
                  lines={[{ key: 'value', label: 'GSCPI', stroke: 'var(--cyan)' }]}
                  yFmt={(v) => fmtNum(v, 1)}
                  xFmt={(d) => String(d).slice(0, 4)}
                  tipLabel={fmtMonth}
                  zeroLine
                  label="Global Supply Chain Pressure Index, monthly"
                />
              </div>
            ) : (
              <p className="scm-empty">The pressure index is not loaded yet. It updates monthly.</p>
            )}
          </section>

          <section className="scm-section" aria-labelledby="scm-freight-h">
            <h2 id="scm-freight-h" className="scm-section-title">
              Freight
            </h2>
            <p className="scm-note">
              Cass Freight Index, North American shipments and expenditures, monthly (index, January
              1990 = 1).
            </p>
            {ship?.points?.length > 1 || exp?.points?.length > 1 ? (
              <div className="scm-grid">
                {[
                  [ship, 'Shipments'],
                  [exp, 'Expenditures'],
                ].map(([s, name]) =>
                  s?.points?.length > 1 ? (
                    <figure key={name} className="scm-card" style={{ margin: 0 }}>
                      <figcaption className="scm-card-title">
                        {name}
                        {s.lastDate ? (
                          <span className="scm-muted scm-mono"> · {fmtMonth(s.lastDate)}</span>
                        ) : null}
                      </figcaption>
                      <SeriesChart
                        data={s.points}
                        lines={[{ key: 'value', label: name }]}
                        yFmt={(v) => fmtNum(v, 2)}
                        tipLabel={fmtMonth}
                        height={220}
                        label={`Cass Freight Index ${name.toLowerCase()}, monthly`}
                      />
                    </figure>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="scm-empty">
                The freight indexes are not loaded yet. They update monthly.
              </p>
            )}
          </section>
        </>
      ) : null}

      <footer className="scm-foot">
        <p>
          Port calls and transits are estimated from ship position (AIS) data by the IMF and
          published with a lag of several weeks.
        </p>
        <p>
          Sources: IMF PortWatch (portwatch.imf.org); Federal Reserve Bank of New York, Global
          Supply Chain Pressure Index; Cass Information Systems, Cass Freight Index, via FRED.
        </p>
      </footer>
    </div>
  );
}
