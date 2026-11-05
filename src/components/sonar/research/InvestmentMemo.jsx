'use client';

/**
 * InvestmentMemo: deep research's investment risk assessment (Nov 2026).
 *
 * Laid out the way an analyst briefs a managing director: the central
 * question and the answer; a financial dashboard from the company's own
 * filings; the material risks ranked, each with its question, assessment,
 * dated evidence, implication and what would change the view; institutional
 * positioning; listed peers side by side; bull, base and bear cases framed as
 * assumptions; the risk transmission chain with each link marked supported
 * or not yet supported; and the data an analyst would still want.
 *
 * Every claim carries its classification and citations; every table names
 * its period. Tokens only (EZANA_BRANDING_GUIDE), page prefix `srm-`.
 */
import './investment-memo.css';

const CLASS_LABEL = {
  verified_fact: 'Verified',
  calculated_result: 'Calculated',
  analytical_interpretation: 'Interpretation',
  hypothesis: 'Hypothesis',
  unknown: 'Unknown',
};
const PRIORITY_LABEL = { high: 'High priority', medium: 'Medium priority', low: 'Lower priority' };
const CASE_LABEL = { bull: 'Bull case', base: 'Base case', bear: 'Bear case' };

const usd = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '–';
  const a = Math.abs(n);
  if (a >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${Math.round(n).toLocaleString('en-US')}`;
};
const pct = (r) => (r == null || !Number.isFinite(Number(r)) ? '–' : `${(r * 100).toFixed(1)}%`);
const sharesFmt = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '–';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return Math.round(n).toLocaleString('en-US');
};

function Cites({ markers, onCite }) {
  if (!markers?.length) return null;
  return (
    <span className="srr-cites">
      {markers.map((m) => (
        <button key={m} type="button" className="srr-cite" onClick={() => onCite?.(m)}>
          {m}
        </button>
      ))}
    </span>
  );
}

function Claim({ c, onCite, lead = null }) {
  if (!c?.text) return null;
  return (
    <p className="srm-claim">
      {lead ? <span className="srm-claim-lead">{lead}</span> : null}
      <span className={`srr-badge is-${c.classification}`}>
        {CLASS_LABEL[c.classification] || c.classification}
      </span>{' '}
      {c.text}
      {c.period ? <span className="srm-period"> {c.period}</span> : null}{' '}
      <Cites markers={c.markers} onCite={onCite} />
    </p>
  );
}

function Dashboard({ financials, segments }) {
  const q = financials?.quarters || [];
  const y = financials?.years || [];
  if (!q.length && !y.length && !segments?.segments?.length) return null;
  const rows = [
    ...q.map((p) => ({ ...p, kind: 'Quarter' })),
    ...y.map((p) => ({ ...p, kind: 'Fiscal year' })),
  ];
  return (
    <section className="srm-section" aria-labelledby="srm-dash-h">
      <h2 id="srm-dash-h" className="srr-h2">
        Financial dashboard
      </h2>
      <p className="srm-sub">
        {financials?.name ? `${financials.name}, ` : ''}as reported in SEC filings. Periods end on
        the company&rsquo;s fiscal calendar.
      </p>
      {rows.length ? (
        <div className="srm-table-wrap">
          <table className="srm-table">
            <thead>
              <tr>
                <th scope="col">Period ended</th>
                <th scope="col">Revenue</th>
                <th scope="col">Gross margin</th>
                <th scope="col">Operating margin</th>
                <th scope="col">Operating cash flow</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={`${p.kind}:${p.periodEnd}`}>
                  <td>
                    <span className="srr-mono">{p.periodEnd}</span>{' '}
                    <span className="srm-dim">{p.kind}</span>
                  </td>
                  <td className="srr-mono">{usd(p.revenue)}</td>
                  <td className="srr-mono">{pct(p.grossMargin)}</td>
                  <td className="srr-mono">{pct(p.operatingMargin)}</td>
                  <td className="srr-mono">{usd(p.operating_cash_flow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {segments?.segments?.length ? (
        <div className="srm-segments" aria-label="Revenue by segment">
          <p className="srm-sub">
            Revenue by reported segment, quarter ended{' '}
            <span className="srr-mono">{segments.date}</span>
          </p>
          {segments.segments.slice(0, 6).map((s) => (
            <div key={s.segment} className="srm-seg">
              <span className="srm-seg-label">{s.segment}</span>
              <span className="srm-seg-track" aria-hidden="true">
                <span className="srm-seg-fill" style={{ width: `${Math.round(s.share * 100)}%` }} />
              </span>
              <span className="srr-mono">
                {usd(s.value)} · {pct(s.share)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Risk({ r, onCite }) {
  return (
    <article className={`srm-risk is-${r.priority}`}>
      <header className="srm-risk-head">
        <span className="srm-risk-rank srr-mono">{r.rank}</span>
        <div>
          <span className={`srm-priority is-${r.priority}`}>{PRIORITY_LABEL[r.priority]}</span>
          <h3 className="srm-risk-title">{r.title}</h3>
        </div>
      </header>
      {r.question ? (
        <p className="srm-question">
          <span className="srm-claim-lead">The investment question</span>
          {r.question}
        </p>
      ) : null}
      <Claim c={r.assessment} onCite={onCite} lead="Assessment" />
      {r.evidence?.length ? (
        <div className="srm-evidence">
          <span className="srm-claim-lead">Evidence</span>
          <ul>
            {r.evidence.map((e) => (
              <li key={e.id}>
                <Claim c={e} onCite={onCite} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Claim c={r.implication} onCite={onCite} lead="What it means" />
      {r.watch?.length ? (
        <div className="srm-watch">
          <span className="srm-claim-lead">What would change the view</span>
          <ul>
            {r.watch.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function Positioning({ p }) {
  if (!p?.top?.length) return null;
  return (
    <section className="srm-section" aria-labelledby="srm-own-h">
      <h2 id="srm-own-h" className="srr-h2">
        Institutional positioning
      </h2>
      <p className="srm-sub">
        13F filings for the quarter ending <span className="srr-mono">{p.period}</span>:{' '}
        <span className="srr-mono">{Number(p.holders).toLocaleString('en-US')}</span> of{' '}
        <span className="srr-mono">{Number(p.filers_in_period).toLocaleString('en-US')}</span>{' '}
        managers in Ezana&rsquo;s dataset reported a position. The ten largest held{' '}
        <span className="srr-mono">{pct(p.top10_share)}</span> of the reported value. 13F data is
        delayed and long-only, so it is a positioning indicator, not a valuation signal.
      </p>
      <div className="srm-table-wrap">
        <table className="srm-table">
          <thead>
            <tr>
              <th scope="col">Holder</th>
              <th scope="col">Shares</th>
              <th scope="col">Reported value</th>
              <th scope="col">Share of reported value</th>
            </tr>
          </thead>
          <tbody>
            {p.top.slice(0, 10).map((h) => (
              <tr key={h.filer}>
                <td>{h.filer}</td>
                <td className="srr-mono">{sharesFmt(h.shares)}</td>
                <td className="srr-mono">{usd(h.value_usd)}</td>
                <td className="srr-mono">{pct(h.share_of_reported)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {p.previous_period && Number(p.compared_filers) > 0 ? (
        <p className="srm-sub">
          Among the <span className="srr-mono">{p.compared_filers}</span> managers that filed for
          both <span className="srr-mono">{p.previous_period}</span> and{' '}
          <span className="srr-mono">{p.period}</span>: <span className="srr-mono">{p.added}</span>{' '}
          added, <span className="srr-mono">{p.reduced}</span> reduced,{' '}
          <span className="srr-mono">{p.new_positions}</span> opened and{' '}
          <span className="srr-mono">{p.exits}</span> exited.
        </p>
      ) : null}
    </section>
  );
}

function Peers({ peers }) {
  const rows = peers?.rows || [];
  if (rows.length < 2) return null;
  return (
    <section className="srm-section" aria-labelledby="srm-peer-h">
      <h2 id="srm-peer-h" className="srr-h2">
        Listed peers, reported results
      </h2>
      <p className="srm-sub">
        Each company&rsquo;s own latest periods from SEC filings. Fiscal calendars differ, so
        periods are shown per row.
      </p>
      <div className="srm-table-wrap">
        <table className="srm-table">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Quarter ended</th>
              <th scope="col">Revenue</th>
              <th scope="col">Gross margin</th>
              <th scope="col">Operating margin</th>
              <th scope="col">Fiscal year growth</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ticker} className={r.subject ? 'is-subject' : undefined}>
                <td>
                  <span className="srr-mono">{r.ticker}</span>{' '}
                  <span className="srm-dim">{r.name}</span>
                </td>
                <td className="srr-mono">{r.quarterEnd || '–'}</td>
                <td className="srr-mono">{usd(r.revenue)}</td>
                <td className="srr-mono">{pct(r.grossMargin)}</td>
                <td className="srr-mono">{pct(r.operatingMargin)}</td>
                <td className="srr-mono">
                  {r.annualGrowth == null
                    ? '–'
                    : `${r.annualGrowth >= 0 ? '+' : ''}${(r.annualGrowth * 100).toFixed(1)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Scenarios({ scenarios, onCite }) {
  if (!scenarios?.length) return null;
  return (
    <section className="srm-section" aria-labelledby="srm-scn-h">
      <h2 id="srm-scn-h" className="srr-h2">
        Scenarios
      </h2>
      <p className="srm-sub">
        Illustrative assumptions for testing the thesis. They are not forecasts, guidance or price
        targets.
      </p>
      <div className="srm-scenarios">
        {scenarios.map((s) => (
          <article key={s.case} className={`srm-scenario is-${s.case}`}>
            <h3 className="srm-scenario-title">{CASE_LABEL[s.case]}</h3>
            {s.assumptions?.length ? (
              <ul>
                {s.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : null}
            {s.outcome ? <Claim c={s.outcome} onCite={onCite} /> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function Chain({ chain, onCite }) {
  if (!chain?.length) return null;
  return (
    <section className="srm-section" aria-labelledby="srm-chain-h">
      <h2 id="srm-chain-h" className="srr-h2">
        How the risk would reach the results
      </h2>
      <p className="srm-sub">
        Each link is marked supported only where a cited record supports it. The chain does not
        establish that the risk has occurred.
      </p>
      <ol className="srm-chain">
        {chain.map((l, i) => (
          <li key={`${l.from}:${l.to}:${i}`} className={`srm-link is-${l.status}`}>
            <span className="srm-link-ends">
              {l.from}
              <i className="bi bi-arrow-right" aria-hidden="true" />
              {l.to}
            </span>
            {l.mechanism ? <span className="srm-link-mech">{l.mechanism}</span> : null}
            <span className="srm-link-status">
              {l.status === 'supported' ? 'Supported' : 'Needs evidence'}{' '}
              <Cites markers={l.markers} onCite={onCite} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function InvestmentMemo({ report, panels = {}, onCite }) {
  if (!report) return null;
  return (
    <div className="srm">
      <section className="srr-conclusion" aria-labelledby="srm-concl-h">
        <h2 id="srm-concl-h" className="srr-h2">
          Investment view
        </h2>
        {report.centralQuestion ? <p className="srm-central">{report.centralQuestion}</p> : null}
        {report.executiveConclusion ? (
          <p className="srr-conclusion-text">
            {report.executiveConclusion.text}{' '}
            <Cites markers={report.executiveConclusion.markers} onCite={onCite} />
          </p>
        ) : null}
        {report.risks?.length ? (
          <ol className="srm-risk-index">
            {report.risks.map((r) => (
              <li key={r.id}>
                <a href={`#${r.id}`}>{r.title}</a>{' '}
                <span className={`srm-priority is-${r.priority}`}>{r.priority}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {report.deterministic ? (
          <p className="srr-note">
            The written assessment did not complete, so the records are grouped and quoted without a
            ranking.
          </p>
        ) : null}
      </section>

      <Dashboard financials={panels.financials} segments={panels.segments} />

      {report.risks?.length ? (
        <section className="srm-section" aria-labelledby="srm-risks-h">
          <h2 id="srm-risks-h" className="srr-h2">
            Material risks, ranked
          </h2>
          {report.risks.map((r) => (
            <div key={r.id} id={r.id}>
              <Risk r={r} onCite={onCite} />
            </div>
          ))}
        </section>
      ) : null}

      <Positioning p={panels.positioning} />
      <Peers peers={panels.peers} />
      <Scenarios scenarios={report.scenarios} onCite={onCite} />
      <Chain chain={report.chain} onCite={onCite} />

      {report.dataGaps?.length ? (
        <section className="srm-section" aria-labelledby="srm-gaps-h">
          <h2 id="srm-gaps-h" className="srr-h2">
            What an analyst would still want
          </h2>
          <ul className="srr-list">
            {report.dataGaps.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
