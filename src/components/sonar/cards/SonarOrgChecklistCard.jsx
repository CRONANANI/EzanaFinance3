'use client';

/**
 * SonarOrgChecklistCard (Nov 28 2026): the council card for structured, sectioned answers
 * in the Sonar library: the thesis checklist, investment committee questions, recorded IPS
 * observations, a meeting briefing, valuation assumptions, thesis monitors, hindsight and
 * team research activity (registry entries with org: true).
 *
 * Every item states its status in words beside its icon (never colour alone) and, where the
 * council layer recorded it, the motive: the assumption, finding, risk, rule or missing
 * evidence that produced the item. An empty section says so, instead of being padded.
 *
 * payload.data: { sections: [{ key, label, items: [{ text, status?, detail?, motive?,
 *                 ref? }] }] }
 */
import '../charts/sonar-research-library.css';

const STATUS = {
  met: { icon: 'bi-check-circle', label: 'Met', tone: 'pos' },
  ok: { icon: 'bi-check-circle', label: 'Recorded', tone: 'pos' },
  partial: { icon: 'bi-circle-half', label: 'Partial', tone: 'warn' },
  missing: { icon: 'bi-dash-circle', label: 'Missing', tone: 'muted' },
  concern: { icon: 'bi-exclamation-triangle', label: 'Potential policy concern', tone: 'warn' },
  info: { icon: 'bi-info-circle', label: 'Not read from holdings', tone: 'muted' },
  confirmed: { icon: 'bi-check-circle', label: 'Confirmed', tone: 'pos' },
  contradicted: { icon: 'bi-x-circle', label: 'Contradicted', tone: 'neg' },
  untested: { icon: 'bi-question-circle', label: 'Untested', tone: 'muted' },
};
const TONE = {
  pos: 'var(--srl-pos)',
  neg: 'var(--srl-neg)',
  warn: 'var(--warning)',
  muted: 'var(--srl-faint)',
};
const MOTIVE = {
  assumption: 'Assumption',
  finding: 'Finding',
  missing: 'Missing evidence',
  risk: 'Recorded risk',
  policy: 'Recorded rule',
  limitation: 'Research gap',
};

export function SonarOrgChecklistCard({ payload }) {
  const sections = payload?.data?.sections || [];
  return (
    <div className="srl-org">
      {sections.map((s) => (
        <section key={s.key} aria-label={s.label} style={{ marginBottom: 14 }}>
          <h4
            className="srl-metric-label"
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: 11,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {s.label}
          </h4>
          {s.items?.length ? (
            <ul className="srl-feed">
              {s.items.map((it, i) => {
                const st = it.status ? STATUS[it.status] || STATUS.info : null;
                return (
                  <li
                    key={`${s.key}-${i}`}
                    style={{ gridTemplateColumns: st ? '22px minmax(0, 1fr)' : 'minmax(0, 1fr)' }}
                  >
                    {st ? (
                      <i
                        className={`bi ${st.icon}`}
                        aria-hidden="true"
                        style={{ color: TONE[st.tone], marginTop: 2 }}
                      />
                    ) : null}
                    <span>
                      <span style={{ color: 'var(--srl-text)', fontWeight: 500 }}>{it.text}</span>
                      {st ? (
                        <span
                          className="srl-labels"
                          style={{ display: 'inline-flex', marginLeft: 8 }}
                        >
                          {st.label}
                        </span>
                      ) : null}
                      {it.detail ? (
                        <span style={{ display: 'block', marginTop: 2 }}>{it.detail}</span>
                      ) : null}
                      {it.motive?.text ? (
                        <span className="srl-labels" style={{ display: 'flex', marginTop: 4 }}>
                          <span>
                            {MOTIVE[it.motive.kind] || 'Basis'}: {it.motive.text}
                          </span>
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="srl-state">Nothing recorded.</p>
          )}
        </section>
      ))}
    </div>
  );
}

export default SonarOrgChecklistCard;
