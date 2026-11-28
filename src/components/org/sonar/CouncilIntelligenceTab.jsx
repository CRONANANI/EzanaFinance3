'use client';

/**
 * Council intelligence (Sonar for organizations, Nov 28 2026): council research on the
 * fund's own records, inside the standard Sonar answer shell (the persistent research menu,
 * the composer, the Desk Summary first, charts and data, evidence and limitations).
 *
 * The reader asks in words ("Which holdings drive our concentration?") or picks a council
 * capability. The context indicators show which council records the answer reads; optional
 * ones can be removed. Answers are deterministic and read-only: a proposal (a research
 * update, a thesis section) is listed as a proposal and is never carried out from here.
 * Pitch stages, votes, approvals and trades stay in the Pitch Pipeline and the committee.
 */
import { useCallback, useState } from 'react';
import { orgRequest } from '@/lib/org-request';
import { ORG_ANALYSES } from '@/lib/sonar/composer/org-capabilities';
import { planPresentation } from '@/lib/sonar/presentation/planner';
import { sectionId } from '@/lib/sonar/answer-sections';
import { SonarAnswerFrame } from '@/components/sonar/SonarAnswerFrame';
import { SonarDeskSummary } from '@/components/sonar/SonarDeskSummary';
import { researchMenu } from '@/components/sonar/workspace-rail-helpers';
import { SonarAdaptiveVisual } from '@/components/sonar/layout/SonarAdaptiveVisual';
import { SonarSelectionProvider } from '@/components/sonar/layout/SonarSelectionContext';
import '@/components/sonar/charts/sonar-research-library.css';

export function CouncilIntelligenceTab() {
  const [question, setQuestion] = useState('');
  const [capability, setCapability] = useState(null);
  const [removed, setRemoved] = useState([]);
  const [state, setState] = useState({ status: 'idle', data: null, error: null });

  const run = useCallback(
    async (nextRemoved = removed) => {
      if (!question.trim() && !capability) return;
      setState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const data = await orgRequest('/api/org/sonar/intelligence', {
          method: 'POST',
          json: { question: question.trim(), capability, removed: nextRemoved },
        });
        setState({ status: 'done', data, error: null });
      } catch (e) {
        setState({ status: 'error', data: null, error: e.message });
      }
    },
    [question, capability, removed],
  );

  const data = state.data;
  const result = data?.result || null;
  const plan = result ? planPresentation(result.visuals || [], { depth: 'deep' }) : null;
  const present = result
    ? [
        'answer',
        plan?.items.length && 'charts',
        result.evidence?.length && 'sources',
        'methodology',
      ].filter(Boolean)
    : ['answer'];

  const queryBar = (
    <form
      className="srl-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        run();
      }}
      style={{ flex: 1 }}
    >
      <i className="bi bi-search" aria-hidden="true" />
      <input
        id="osp-ci-q"
        aria-label="Ask about the council"
        type="search"
        value={question}
        placeholder="Ask about our fund, pitches, coverage or the next committee meeting"
        onChange={(e) => setQuestion(e.target.value)}
        style={{
          minHeight: 40,
          border: 0,
          outline: 0,
          background: 'transparent',
          color: 'inherit',
          width: '100%',
          font: 'inherit',
        }}
      />
    </form>
  );

  const followUps = (
    <div className="srl" style={{ background: 'transparent', padding: 0, gap: 8 }}>
      <ul className="srl-views" aria-label="Council capabilities" style={{ flexWrap: 'wrap' }}>
        {ORG_ANALYSES.map((c) => (
          <li key={c.key}>
            <button
              type="button"
              className="srl-view"
              aria-pressed={capability === c.key}
              title={c.summary}
              onClick={() => {
                setCapability(capability === c.key ? null : c.key);
                if (!question.trim()) setQuestion(c.example);
              }}
            >
              <i className={`bi ${c.icon}`} aria-hidden="true" /> {c.label}
            </button>
          </li>
        ))}
      </ul>
      {data?.context?.indicators?.length ? (
        <p className="srl-labels" aria-label="Council context used">
          <span>Using:</span>
          {data.context.indicators.map((i) => (
            <span key={i.key} className="srl-key">
              {i.label}
              {i.removable ? (
                <button
                  type="button"
                  className="srl-btn"
                  aria-label={`Remove ${i.label} from the context`}
                  onClick={() => {
                    const next = [...removed, i.key];
                    setRemoved(next);
                    run(next);
                  }}
                >
                  <i className="bi bi-x" aria-hidden="true" />
                </button>
              ) : null}
            </span>
          ))}
          {removed.length ? (
            <button
              type="button"
              className="srl-btn"
              onClick={() => {
                setRemoved([]);
                run([]);
              }}
            >
              Restore context
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );

  return (
    <SonarAnswerFrame
      present={present}
      research={researchMenu({ signedIn: true })}
      queryBar={queryBar}
      followUps={followUps}
    >
      <div id={sectionId('answer')} className="srr-anchor">
        {state.status === 'error' ? (
          <p className="srl-state" role="alert">
            <i className="bi bi-exclamation-triangle" aria-hidden="true" /> {state.error}
          </p>
        ) : null}
        {data && data.orgScoped === false ? (
          <SonarDeskSummary
            mode="standard"
            headline="This question is not about the council"
            summary={[
              'Ask it in Sonar Research for ordinary market research, or refer to the council (our fund, our pitch, the committee) to use council records.',
            ]}
          />
        ) : null}
        {result?.desk ? (
          <SonarDeskSummary
            mode="standard"
            notice={
              result.hypothetical || result.desk.qualification ? (
                <p className="sds-notice">
                  <i className="bi bi-info-circle" aria-hidden="true" />{' '}
                  {[
                    result.hypothetical ? 'Hypothetical, no trade executed' : null,
                    result.desk.qualification,
                  ]
                    .filter(Boolean)
                    .join('. ')}
                </p>
              ) : null
            }
            headline={result.desk.headline}
            question={question}
            summary={result.desk.paragraphs || []}
          />
        ) : null}
        {state.status === 'idle' ? (
          <SonarDeskSummary
            mode="standard"
            headline="Council research on the fund's own records"
            summary={[
              'Ask about holdings, concentration, recorded policy rules, coverage, a pitch or the next committee meeting. Answers use only records you are allowed to see.',
            ]}
          />
        ) : null}
        {state.status === 'loading' ? (
          <p className="srl-state" role="status">
            Reading council records.
          </p>
        ) : null}
      </div>

      {plan?.items.length ? (
        <SonarSelectionProvider>
          <div id={sectionId('charts')} className="srl-grid" style={{ marginTop: 16 }}>
            {plan.items.map((item) => (
              <div
                key={item.id}
                className="srl-cell"
                style={{
                  '--srl-span': item.span?.wide || 6,
                  '--srl-span-mid': item.span?.mid || 6,
                }}
              >
                <SonarAdaptiveVisual item={item} />
              </div>
            ))}
          </div>
        </SonarSelectionProvider>
      ) : null}

      {result?.proposals?.length ? (
        <section className="srl" aria-label="Proposed next steps" style={{ marginTop: 16 }}>
          <h3 className="srl-title">Proposed, not done</h3>
          <ul className="srl-feed">
            {result.proposals.map((p, i) => (
              <li key={i} style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <span style={{ color: 'var(--srl-text)' }}>{p.label}</span>
                {p.detail ? <span> ({p.detail})</span> : null}
              </li>
            ))}
          </ul>
          <p className="srl-labels">
            A proposal changes nothing until a member creates it from the assignment or pitch page.
          </p>
        </section>
      ) : null}

      {result?.evidence?.length ? (
        <section
          id={sectionId('sources')}
          className="srl"
          aria-label="Evidence and sources"
          style={{ marginTop: 16 }}
        >
          <h3 className="srl-title">Evidence and sources</h3>
          <ul className="srl-feed">
            {result.evidence.map((e) => (
              <li key={e.id} style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
                {e.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {result ? (
        <section
          id={sectionId('methodology')}
          className="srl"
          aria-label="Methodology and limitations"
          style={{ marginTop: 16 }}
        >
          <h3 className="srl-title">Methodology and limitations</h3>
          <p className="srl-takeaway">
            Calculated from the council position book and recorded rules with the same formulas as
            Fund Analytics and Compliance. No model wrote these figures. Positions without a stored
            price are carried at cost.
          </p>
          {result.limitations?.length ? (
            <ul className="srl-feed">
              {result.limitations.map((l) => (
                <li
                  key={l.measure}
                  style={{ gridTemplateColumns: 'minmax(140px, 30%) minmax(0, 1fr)' }}
                >
                  <span style={{ color: 'var(--srl-text)' }}>{l.measure}</span>
                  <span>{l.reason}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </SonarAnswerFrame>
  );
}

export default CouncilIntelligenceTab;
