'use client';

/**
 * ResearchTeamPanel (Nov 2026): who researched this question, and how the
 * work was checked. Shown on every standard and deep report.
 *
 * From `selectTeam(state)`: the final report.team once the run is done, the
 * live routing decision and analyst statuses while it runs. Top to bottom:
 * the lead and supporting analysts by title with the reason each was chosen,
 * each specialist's conclusion and confidence (a disclosure opens its
 * findings with citations), the methodology checks (expandable), and in deep
 * research the red team's challenges and how each was resolved.
 *
 * Titles only: no ids, prompt text, model names or costs. Status is always
 * written out, never colour alone. Tokens and ds components only.
 */
import { useId, useState } from 'react';
import { Badge, Button } from '@/components/ds';
import { RefCites } from './Cites';
import './research-team.css';

const ROLE_LABEL = { lead: 'Lead analyst', supporting: 'Supporting analyst' };

const CONFIDENCE = {
  high: ['brand', 'High confidence'],
  moderate: ['info', 'Moderate confidence'],
  low: ['warning', 'Low confidence'],
};

const LIVE_STATUS = {
  waiting: ['neutral', 'Waiting'],
  working: ['neutral', 'Working'],
  done: ['brand', 'Finished'],
  missing: ['warning', 'Did not report'],
};

/* The specialist claim labels, in the report's own claim vocabulary. */
const LABEL = {
  fact: ['verified_fact', 'Fact'],
  calculation: ['calculated_result', 'Calculation'],
  interpretation: ['analytical_interpretation', 'Interpretation'],
  hypothesis: ['hypothesis', 'Hypothesis'],
};

const VERDICT = {
  holds: 'The conclusion holds after challenge.',
  weakened: 'The conclusion is weaker after challenge, and the report says so.',
  refuted: 'The challenge overturned the first draft, and the report was revised.',
  unclear: 'The challenge was inconclusive; the open questions are listed as limitations.',
};

const POINT_KIND = {
  alternative: 'Alternative explanation',
  missing_evidence: 'Missing evidence',
  base_rate: 'Base rate',
  fragility: 'Scenario fragility',
  falsifier: 'What would prove it wrong',
  downgrade: 'Confidence downgrade',
};

const RESOLUTION = {
  rebutted: ['brand', 'Rebutted with evidence'],
  incorporated: ['info', 'Incorporated'],
  limitation: ['warning', 'Listed as a limitation'],
};

function Disclosure({ label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="srr-team-toggle"
        icon={open ? 'bi-chevron-up' : 'bi-chevron-down'}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </Button>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </>
  );
}

function Specialist({ sp, live, onCite, calcs }) {
  const findings = sp.findings || [];
  const [tone, text] =
    sp.status === 'missing'
      ? LIVE_STATUS.missing
      : live
        ? LIVE_STATUS[sp.status] || LIVE_STATUS.waiting
        : CONFIDENCE[sp.confidence] || [null, null];
  return (
    <li className="srr-analyst">
      <div className="srr-analyst-head">
        <div className="srr-analyst-name">
          <p className="srr-analyst-role">{ROLE_LABEL[sp.role] || 'Analyst'}</p>
          <h3 className="srr-analyst-title">{sp.title}</h3>
        </div>
        {text ? (
          <Badge tone={tone} className="srr-analyst-badge">
            {text}
          </Badge>
        ) : null}
      </div>
      {sp.reason ? <p className="srr-analyst-reason">{sp.reason}</p> : null}
      {sp.conclusion ? <p className="srr-analyst-conclusion">{sp.conclusion}</p> : null}
      {!live && sp.status === 'missing' ? (
        <p className="srr-analyst-reason">
          This analyst did not report in time. The report was written without this view.
        </p>
      ) : null}
      {findings.length ? (
        <Disclosure
          label={
            <>
              <span className="srr-mono">{findings.length}</span>{' '}
              {findings.length === 1 ? 'finding' : 'findings'}, with sources
            </>
          }
        >
          <ul className="srr-team-findings">
            {findings.map((f, i) => {
              const [cls, lab] = LABEL[f.label] || LABEL.hypothesis;
              return (
                <li key={`${i}-${f.claim}`} className="srr-team-finding">
                  <span className={`srr-badge is-${cls}`}>{lab}</span>
                  <span className="srr-team-claim">
                    {f.claim}{' '}
                    {f.period ? <span className="srr-team-period srr-mono">{f.period}</span> : null}{' '}
                    <RefCites refs={f.refs} onCite={onCite} calcs={calcs} />
                  </span>
                </li>
              );
            })}
          </ul>
        </Disclosure>
      ) : null}
    </li>
  );
}

export function AuditChecks({ checks }) {
  if (!checks?.length) return null;
  return (
    <ul className="srr-team-checks">
      {checks.map((c) => (
        <li key={c.id || c.label} className={`srr-team-check${c.pass ? '' : ' is-fail'}`}>
          <i
            className={`bi ${c.pass ? 'bi-check-circle' : 'bi-exclamation-circle'}`}
            aria-hidden="true"
          />
          <span className="srr-team-check-body">
            <span className="srr-team-check-label">{c.label}</span>
            <span className="srr-team-check-state">{c.pass ? 'Passed' : 'Did not pass'}</span>
            {c.detail ? <span className="srr-team-check-detail">{c.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RedTeam({ redTeam, onCite, calcs }) {
  const points = redTeam.points || [];
  return (
    <div className="srr-team-block">
      <h3 className="srr-h3">Challenged by the red team</h3>
      {VERDICT[redTeam.verdict] ? (
        <p className="srr-team-verdict">{VERDICT[redTeam.verdict]}</p>
      ) : null}
      {points.length ? (
        <ul className="srr-team-points">
          {points.map((p, i) => {
            const [tone, res] = RESOLUTION[p.resolution] || [null, null];
            return (
              <li key={`${i}-${p.kind}`} className="srr-team-point">
                <div className="srr-team-point-head">
                  <span className="srr-analyst-role">{POINT_KIND[p.kind] || 'Challenge'}</span>
                  {res ? <Badge tone={tone}>{res}</Badge> : null}
                </div>
                <p className="srr-team-point-text">
                  {p.text} <RefCites refs={p.refs} onCite={onCite} calcs={calcs} />
                </p>
                {p.note ? <p className="srr-team-point-note">{p.note}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default function ResearchTeamPanel({ team, onCite, calcs }) {
  if (!team?.specialists?.length) return null;
  const audit = team.audit;
  const total = Number(audit?.total) || audit?.checks?.length || 0;
  const passed = Number(audit?.passed) || 0;
  return (
    <section className="srr-section srr-team" aria-labelledby="srr-team-h">
      <h2 id="srr-team-h" className="srr-h2">
        Research team
      </h2>
      <p className="srr-team-lede">
        {team.live
          ? 'The specialists chosen for this question. Their conclusions appear when they finish.'
          : 'The specialists who researched this question, why each was chosen, and what each concluded.'}
      </p>
      <ul className="srr-team-list">
        {team.specialists.map((sp) => (
          <Specialist key={sp.id} sp={sp} live={team.live} onCite={onCite} calcs={calcs} />
        ))}
      </ul>
      {audit && total ? (
        <div className="srr-team-block">
          <Disclosure
            label={
              <>
                Methodology checks: <span className="srr-mono">{passed}</span> of{' '}
                <span className="srr-mono">{total}</span> passed
              </>
            }
          >
            <AuditChecks checks={audit.checks} />
          </Disclosure>
        </div>
      ) : null}
      {team.redTeam ? <RedTeam redTeam={team.redTeam} onCite={onCite} calcs={calcs} /> : null}
    </section>
  );
}
