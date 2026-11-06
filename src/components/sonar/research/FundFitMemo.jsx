'use client';

/**
 * FundFitMemo: "Should our fund invest?" (Sonar for organizations, Nov 2026).
 *
 * Top to bottom: Sonar's stance for the fund (invest, watch, pass) and why;
 * the fund's own mandate and IPS checks, computed by Ezana before any
 * writing (a blocking check makes the stance pass); the fit with the
 * fund's written thesis, criterion by criterion; the catalysts and the
 * headwinds, each dated and cited; and the questions the committee should
 * ask. The financial dashboard, scenarios and evidence follow from the
 * investment memo (InvestmentMemo, hideView).
 *
 * Sonar's stance is an assessment for the committee; it never sizes a
 * position or sets a price target, and the copy says the committee decides.
 * Tokens only (EZANA_BRANDING_GUIDE), page prefix `sff-`.
 */
import { Cites, Claim } from './InvestmentMemo';
import './fund-fit-memo.css';

const STANCE = {
  invest: { label: 'Invest', icon: 'bi-arrow-up-right-circle' },
  watch: { label: 'Watch', icon: 'bi-eye' },
  pass: { label: 'Pass', icon: 'bi-dash-circle' },
};
const FIT = {
  fits: 'Inside the mandate',
  partial: 'Partly inside the mandate',
  outside: 'Outside the mandate',
};
const CHECK = {
  pass: { icon: 'bi-check-circle', label: 'Pass' },
  warn: { icon: 'bi-exclamation-triangle', label: 'Check' },
  fail: { icon: 'bi-x-circle', label: 'Fails' },
  unknown: { icon: 'bi-question-circle', label: 'Unknown' },
  info: { icon: 'bi-info-circle', label: 'Note' },
};
const CRITERION = { met: 'Met', not_met: 'Not met', unclear: 'Unclear' };
const PRIORITY = { high: 'High', medium: 'Medium', low: 'Lower' };

export default function FundFitMemo({ report, panels = {}, onCite }) {
  if (!report) return null;
  const v = report.verdict;
  const fitPanel = panels.fundFit || null;
  const fit = report.thesisFit?.fit || fitPanel?.fit || null;
  const fundName = fitPanel?.fund?.name || 'your fund';

  return (
    <div className="sff">
      <section className="sff-verdict" aria-labelledby="sff-verdict-h">
        <p className="sff-eyebrow">Should {fundName} invest?</p>
        <div className="sff-verdict-row">
          {v?.stance ? (
            <span className={`sff-stance is-${v.stance}`}>
              <i className={`bi ${STANCE[v.stance].icon}`} aria-hidden="true" />
              {STANCE[v.stance].label}
            </span>
          ) : (
            <span className="sff-stance is-none">No stance</span>
          )}
          {fit ? <span className={`sff-fit is-${fit}`}>{FIT[fit]}</span> : null}
        </div>
        <h2 id="sff-verdict-h" className="sff-h2">
          {report.centralQuestion || 'Sonar view for the committee'}
        </h2>
        {report.executiveConclusion ? (
          <p className="sff-lead">
            {report.executiveConclusion.text}{' '}
            <Cites markers={report.executiveConclusion.markers} onCite={onCite} />
          </p>
        ) : null}
        {v?.text ? (
          <p className="sff-why">
            {v.text} <Cites markers={v.markers} onCite={onCite} />
          </p>
        ) : null}
        {v?.overriddenBy?.length ? (
          <p className="sff-note is-block">
            <i className="bi bi-shield-exclamation" aria-hidden="true" /> The fund&rsquo;s own rules
            decide this one: a blocking IPS or mandate check failed.
          </p>
        ) : null}
        <p className="sff-note">
          Sonar&rsquo;s assessment for your investment committee, from the records cited. The
          committee decides. Sonar never sizes a position or sets a price target.
        </p>
      </section>

      {fitPanel?.checks?.length ? (
        <section className="sff-section" aria-labelledby="sff-checks-h">
          <h2 id="sff-checks-h" className="srr-h2">
            Mandate and IPS checks
          </h2>
          <p className="sff-sub">
            Checked by Ezana against {fundName}&rsquo;s rules before the assessment was written.
          </p>
          <ul className="sff-checks">
            {fitPanel.checks.map((c) => (
              <li key={c.id} className={`sff-check is-${c.status}`}>
                <i className={`bi ${CHECK[c.status]?.icon || 'bi-dot'}`} aria-hidden="true" />
                <div>
                  <p className="sff-check-label">
                    {c.label}{' '}
                    <span className="sff-check-status">{CHECK[c.status]?.label || c.status}</span>
                  </p>
                  <p className="sff-check-detail">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          {fitPanel.company?.marketCap || fitPanel.company?.sector ? (
            <p className="sff-sub">
              {fitPanel.company.name || fitPanel.company.ticker}
              {fitPanel.company.sector ? `, ${fitPanel.company.sector}` : ''}
              {fitPanel.company.industry ? `, ${fitPanel.company.industry}` : ''}.
            </p>
          ) : null}
        </section>
      ) : fitPanel ? (
        <section className="sff-section" aria-labelledby="sff-checks-h">
          <h2 id="sff-checks-h" className="srr-h2">
            Mandate and IPS checks
          </h2>
          <p className="sff-sub">
            {fundName} has no IPS rules or mandate limits set yet. Executives can add them in the
            fund settings and the Compliance page.
          </p>
        </section>
      ) : null}

      {report.thesisFit?.claim || report.thesisFit?.criteria?.length ? (
        <section className="sff-section" aria-labelledby="sff-thesis-h">
          <h2 id="sff-thesis-h" className="srr-h2">
            Fit with the fund&rsquo;s thesis
          </h2>
          {fitPanel?.fund?.thesis ? (
            <blockquote className="sff-thesis">{fitPanel.fund.thesis}</blockquote>
          ) : null}
          <Claim c={report.thesisFit.claim} onCite={onCite} />
          {report.thesisFit.criteria?.length ? (
            <div className="sff-table-wrap">
              <table className="sff-table">
                <thead>
                  <tr>
                    <th scope="col">Criterion</th>
                    <th scope="col">Status</th>
                    <th scope="col">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {report.thesisFit.criteria.map((c) => (
                    <tr key={c.id}>
                      <td>{c.criterion}</td>
                      <td>
                        <span className={`sff-crit is-${c.status}`}>{CRITERION[c.status]}</span>
                      </td>
                      <td>
                        {c.claim?.text} <Cites markers={c.claim?.markers} onCite={onCite} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {report.catalysts?.length || report.headwinds?.length ? (
        <section
          id="sff-cat-h"
          className="sff-section sff-two"
          aria-label="Catalysts and headwinds"
        >
          <div id="catalysts">
            <h2 className="srr-h2">
              <i className="bi bi-arrow-up-right" aria-hidden="true" /> Catalysts
            </h2>
            {report.catalysts?.length ? (
              <ol className="sff-list">
                {report.catalysts.map((c) => (
                  <li key={c.id} id={c.id} className="sff-item is-catalyst">
                    <p className="sff-item-title">
                      {c.title}
                      {c.timing ? <span className="sff-timing"> {c.timing}</span> : null}
                    </p>
                    <Claim c={c.claim} onCite={onCite} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="sff-sub">The records support no dated catalyst yet.</p>
            )}
          </div>
          <div id="headwinds">
            <h2 className="srr-h2">
              <i className="bi bi-arrow-down-right" aria-hidden="true" /> Headwinds
            </h2>
            {report.headwinds?.length ? (
              <ol className="sff-list">
                {report.headwinds.map((h) => (
                  <li key={h.id} id={h.id} className={`sff-item is-headwind is-${h.priority}`}>
                    <p className="sff-item-title">
                      {h.title} <span className="sff-priority">{PRIORITY[h.priority]}</span>
                    </p>
                    <Claim c={h.claim} onCite={onCite} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="sff-sub">The records support no material headwind.</p>
            )}
          </div>
        </section>
      ) : null}

      {report.committeeQuestions?.length ? (
        <section className="sff-section" aria-labelledby="sff-q-h">
          <h2 id="sff-q-h" className="srr-h2">
            Questions for the committee
          </h2>
          <ul className="srr-list">
            {report.committeeQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
