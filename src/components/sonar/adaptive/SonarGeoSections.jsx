'use client';

/**
 * Sonar adaptive research: the geo-economic impact sections (Nov 2026).
 *
 * Renders what lib/sonar/adaptive/geo-economic.js built and the report schema checked: every
 * figure here arrives with its unit, its basis, its date and at least one source. Flat and
 * transparent on the Sonar canvas: hairlines and whitespace, no cards, no shadows.
 *
 *   kpi_strip              the sourced headline figures, each with its kind (Observed,
 *                          Historical baseline, Forecast, Estimate) and basis
 *   market_comparison      the oil chart at full width, and a same-day benchmark comparison
 *   hormuz_flows           origins, the chokepoint and destinations; one-scope exporter ranking
 *   economic_transmission  the causal chain from the event to the economy
 *   us_impact, gold_markets  side by side when adjacent (GeoPair)
 *   scenario_table         conditions and directional channels, no probabilities
 *   event_timeline         dated, sourced events
 *
 * Branding guide: tokens only, page-scoped under .sgeo-, Bootstrap Icons, no em dashes.
 */
import SonarSeriesChart from './SonarSeriesChart';

const TONE_LABEL = {
  lower: 'Lower disruption',
  persistent: 'Persistent friction',
  severe: 'Severe downside',
};
const DIRECTION_LABEL = { supports: 'Supports gold', weighs: 'Weighs on gold', mixed: 'Mixed' };

function Head({ title, note, right = null }) {
  return (
    <div className="sxb-section-top">
      <div>
        <h2 className="sxb-section-title">{title}</h2>
        {note ? <p className="sxb-section-note">{note}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function KpiStrip({ s, Cites, sources }) {
  return (
    <dl className="sgeo-kpis" aria-label="Key figures">
      {s.items.map((k) => (
        <div key={`${k.label}-${k.value}`} className="sgeo-kpi">
          <dt>{k.label}</dt>
          <dd className="sgeo-kpi-value">{k.value}</dd>
          <dd className="sgeo-kpi-meta">
            {k.kind ? <span className="sgeo-kind">{k.kind}</span> : null}
            {k.note}
            <Cites ids={k.cites} sources={sources} />
          </dd>
          {k.scope ? <dd className="sgeo-kpi-scope">{k.scope}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

export function MarketComparison({ s, Cites, sources }) {
  const cmp = s.comparison;
  const top = cmp ? Math.max(...cmp.rows.map((r) => r.value)) : 0;
  return (
    <>
      <Head title={s.title} note={s.chart?.note || null} />
      <div className={`sgeo-market${cmp && s.chart ? '' : ' sgeo-market--single'}`}>
        {s.chart ? (
          <div className="sgeo-market-chart">
            <SonarSeriesChart section={s.chart} />
            <p className="sgeo-foot">
              Source
              <Cites ids={s.chart.cites} sources={sources} />
            </p>
          </div>
        ) : null}
        {cmp ? (
          <aside className="sgeo-market-side" aria-label="Same-day benchmark comparison">
            <p className="sgeo-label">Same-day benchmark comparison</p>
            <p className="sgeo-date">Daily settlements, {cmp.date}</p>
            <ul className="sgeo-bench">
              {cmp.rows.map((r) => (
                <li key={r.label}>
                  <span className="sgeo-bench-name">{r.label}</span>
                  <span className="sgeo-bench-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((r.value / top) * 100)}%` }} />
                  </span>
                  <span className="sgeo-bench-value">
                    ${r.value.toFixed(2)}
                    {typeof r.changePct === 'number' ? (
                      <span className={r.changePct < 0 ? 'is-down' : 'is-up'}>
                        {r.changePct > 0 ? '+' : ''}
                        {r.changePct.toFixed(1)}%
                      </span>
                    ) : null}
                    <Cites ids={r.cites} sources={sources} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="sgeo-foot">
              Brent premium over WTI: ${cmp.spread.toFixed(2)} per barrel (computed from the two
              settlements above).
            </p>
          </aside>
        ) : null}
      </div>
    </>
  );
}

export function HormuzFlows({ s, Cites, sources }) {
  const top = Math.max(1, ...s.exporters.map((e) => e.value));
  return (
    <>
      <Head title={s.title} />
      {s.exporters.length || s.destinations.length ? (
        <div className="sgeo-schematic" aria-label="Where the flows start, pass and end">
          <div>
            <p className="sgeo-label">Origins</p>
            <p className="sgeo-schematic-names">
              {s.exporters.map((e) => e.label).join(', ') || 'Not established'}
            </p>
          </div>
          <i className="bi bi-arrow-right" aria-hidden="true" />
          <div className="sgeo-schematic-mid">
            <p className="sgeo-schematic-names">{s.name || 'Chokepoint'}</p>
          </div>
          <i className="bi bi-arrow-right" aria-hidden="true" />
          <div>
            <p className="sgeo-label">Destinations named by sources</p>
            <p className="sgeo-schematic-names">
              {s.destinations.map((d) => d.label).join(', ') || 'Not established'}
              <Cites ids={[...new Set(s.destinations.flatMap((d) => d.cites))]} sources={sources} />
            </p>
          </div>
        </div>
      ) : null}
      <div className="sgeo-two">
        {s.exporters.length ? (
          <div>
            <p className="sgeo-label">Exporters through the chokepoint</p>
            <ul className="sgeo-rank">
              {s.exporters.map((e) => (
                <li key={e.label}>
                  <span>{e.label}</span>
                  <span className="sgeo-rank-bar" aria-hidden="true">
                    <span style={{ width: `${Math.round((e.value / top) * 100)}%` }} />
                  </span>
                  <span className="sgeo-rank-value">
                    {e.value}
                    <Cites ids={e.cites} sources={sources} />
                  </span>
                </li>
              ))}
            </ul>
            {s.exportersNote ? <p className="sgeo-foot">{s.exportersNote}</p> : null}
          </div>
        ) : null}
        {s.facts.length ? (
          <div>
            <p className="sgeo-label">Dependence and constraints</p>
            <ul className="sgeo-facts">
              {s.facts.map((f) => (
                <li key={f.label}>
                  <span className="sgeo-fact-value">{f.value}</span>
                  <span>
                    {f.label}
                    {f.period ? ` (${f.period})` : ''}
                    <Cites ids={f.cites} sources={sources} />
                  </span>
                </li>
              ))}
            </ul>
            <p className="sgeo-foot">
              Baseline figures describe the period stated; they are not current flows.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

export function Transmission({ s, Cites, sources }) {
  return (
    <>
      <Head title={s.title} note="The channels, in causal order, as sources describe them." />
      <ol className="sgeo-chain">
        {s.steps.map((st) => (
          <li key={st.n}>
            <span className="sgeo-label">
              {String(st.n).padStart(2, '0')}
              {st.analysis ? ' · Analysis' : ''}
            </span>
            <h3>{st.title}</h3>
            <p>
              {st.text}
              <Cites ids={st.cites} sources={sources} />
            </p>
          </li>
        ))}
      </ol>
    </>
  );
}

export function UsImpact({ s, Cites, sources }) {
  return (
    <div className="sgeo-col">
      <p className="sxb-kicker">{s.kicker}</p>
      <p className="sgeo-big">
        {s.value}
        {s.kind ? <span className="sgeo-kind">{s.kind}</span> : null}
      </p>
      <p className="sar-prose">
        {s.text}
        <Cites ids={s.cites} sources={sources} />
      </p>
      {s.rows.length ? (
        <ul className="sgeo-rows">
          {s.rows.map((r) => (
            <li key={r.label}>
              <span>
                {r.label}
                {r.kind ? <span className="sgeo-kind">{r.kind}</span> : null}
              </span>
              <span className="sgeo-row-value">
                {r.value}
                <Cites ids={r.cites} sources={sources} />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="sgeo-foot">{s.note}</p>
    </div>
  );
}

export function GoldMarkets({ s, Cites, sources }) {
  return (
    <div className="sgeo-col">
      <p className="sxb-kicker">{s.kicker}</p>
      {s.value ? (
        <p className="sgeo-big">
          {s.value}
          {s.basis ? <span className="sgeo-kind">{s.basis}</span> : null}
        </p>
      ) : null}
      {s.text ? (
        <p className="sar-prose">
          {s.text}
          <Cites ids={s.cites} sources={sources} />
        </p>
      ) : null}
      {s.drivers.length ? (
        <ul className="sgeo-drivers">
          {s.drivers.map((d) => (
            <li key={d.title}>
              <h3>{d.title}</h3>
              <p className={`sgeo-direction is-${d.direction}`}>{DIRECTION_LABEL[d.direction]}</p>
              <p>
                {d.text}
                {d.cites.length ? <Cites ids={d.cites} sources={sources} /> : ' (analysis)'}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* The economy and gold sit side by side when the report puts them next to each other. */
export function GeoPair({ children }) {
  return <div className="sgeo-pair">{children}</div>;
}

export function ScenarioTable({ s }) {
  return (
    <>
      <Head title={s.title} note={s.note} />
      <div className="sgeo-table-wrap">
        <table className="sgeo-table">
          <thead>
            <tr>
              <th scope="col">Scenario</th>
              <th scope="col">What would need to happen</th>
              <th scope="col">Likely transmission, direction only</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.name}>
                <th scope="row">
                  {r.name}
                  <span className={`sgeo-tone is-${r.tone}`}>{TONE_LABEL[r.tone]}</span>
                </th>
                <td>{r.conditions}</td>
                <td>{r.effects}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const longDay = (iso) =>
  `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`;

export function EventTimeline({ s, Cites, sources }) {
  return (
    <>
      <Head title={s.title} note={s.note} />
      <ol className="sgeo-timeline">
        {s.items.map((t) => (
          <li key={`${t.date}-${t.title}`}>
            <time dateTime={t.date}>{longDay(t.date)}</time>
            <h3>{t.title}</h3>
            <p>
              {t.text}
              <Cites ids={t.cites} sources={sources} />
            </p>
          </li>
        ))}
      </ol>
    </>
  );
}
