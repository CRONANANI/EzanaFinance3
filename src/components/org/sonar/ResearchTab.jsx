'use client';

/**
 * Research: start deep research for the fund. "Fund fit" asks whether the
 * fund should invest in a company (checked against the mandate and policy);
 * "Open question" takes any research question. Each run is an ordinary Sonar
 * deep research run (POST /api/sonar/research), so the server applies the
 * same quotas, tier gates and the fund's pooled budget as everywhere else.
 *
 * The finished answer is the shared Sonar answer, rendered unchanged; "Save
 * to your fund" under it saves the run as a draft report.
 */
import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ds';
import { DeepResearchRun } from '@/components/sonar/DeepResearch';
import { SONAR_QUERY_MAX } from '@/lib/sonar/limits';
import { Section, SectionError, TextToggle } from '@/components/org/command-center/parts';
import { fundQuery, resetDay, runAllowance } from '@/lib/org-sonar-research-model';
import { OrgSonarSaveDefaults } from './save-defaults';

const MODES = [
  { id: 'fund_fit', label: 'Fund fit' },
  { id: 'open', label: 'Open question' },
];

function budgetLine(budget, allowance) {
  if (!budget)
    return 'Each run uses one deep run from the fund budget. Cancel and errors spend nothing.';
  if (allowance.reason === 'pool')
    return `The fund has used this month's ${budget.pool} deep runs. They reset on ${resetDay(budget)}. An executive can raise the budget.`;
  if (allowance.reason === 'allocation')
    return `You have used your ${budget.me.allocation} deep runs for this month. They reset on ${resetDay(budget)}. An executive can raise your allocation.`;
  return `Uses one of the fund's ${budget.remaining} deep runs left this month (resets ${resetDay(budget)}). About 1 to 4 minutes. Cancel and errors spend nothing.`;
}

/** Quick answers run on the main Sonar page; the member is told before leaving. */
export function QuickAnswerDialog({ query, onClose }) {
  return (
    <Modal
      open={Boolean(query)}
      onClose={onClose}
      title="Quick answers run on the main Sonar page"
      size={480}
      className="osp-dialog"
      footer={
        <div className="osp-dialog__footer">
          <button type="button" className="tcc-textbtn" onClick={onClose}>
            Stay here
          </button>
          <button
            type="button"
            className="tcc-btn"
            onClick={() => window.location.assign(`/sonar?q=${encodeURIComponent(query || '')}`)}
          >
            Open main Sonar
          </button>
        </div>
      }
    >
      <p className="osp-dialog__lead">
        This page runs deep research for the fund only. Your question opens on the main Sonar page,
        where quick answers and standard research run. You will leave Sonar Research, and a quick
        answer cannot be saved to the fund.
      </p>
    </Modal>
  );
}

export function ResearchTab({
  budgetState,
  pitchesState,
  onRetryBudget,
  prefill,
  sampleActive,
  running,
  setRunning,
}) {
  const [mode, setMode] = useState(prefill?.mode || 'fund_fit');
  const [company, setCompany] = useState(prefill?.company || '');
  const [notes, setNotes] = useState('');
  const [question, setQuestion] = useState(prefill?.question || '');
  const [pitchId, setPitchId] = useState(prefill?.pitchId || '');
  const [quick, setQuick] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const budget = budgetState.status === 'ready' ? budgetState.data : null;
  const allowance = runAllowance(budget);
  const pitches = useMemo(() => pitchesState.data?.pitches || [], [pitchesState.data]);
  const pitch = pitches.find((p) => p.id === pitchId) || null;
  /* Opened from a pitch: its ticker fills the fund fit company once pitches arrive. */
  const prefillPitch = prefill?.pitchId || '';
  const prefillTicker = pitches.find((p) => p.id === prefillPitch)?.ticker || '';
  useEffect(() => {
    if (prefillTicker) setCompany((c) => c || prefillTicker);
  }, [prefillTicker]);

  if (running) {
    return (
      <div className="osp-run">
        {running.pitch ? (
          <p className="osp-runnote">
            <i className="bi bi-link-45deg" aria-hidden="true" />
            Started for the pitch on{' '}
            <span className="tcc-ticker tcc-mono">{running.pitch.ticker}</span>. It is chosen for
            you in Save to your fund.
          </p>
        ) : null}
        {running.saveTo ? (
          <p className="osp-runnote">
            <i className="bi bi-layers" aria-hidden="true" />
            Save to your fund offers this run as a new version of the report you came from.
          </p>
        ) : null}
        <OrgSonarSaveDefaults.Provider
          value={{ pitchId: running.pitch?.id || null, reportId: running.saveTo || null }}
        >
          <DeepResearchRun
            query={running.query}
            extra={running.extra}
            saveLabel={running.extra?.fundFit ? 'Save the fund fit report' : null}
            onBack={() => setRunning(null)}
            onQuick={() => setQuick(running.query)}
          />
        </OrgSonarSaveDefaults.Provider>
        <QuickAnswerDialog query={quick} onClose={() => setQuick(null)} />
      </div>
    );
  }

  const ready = mode === 'fund_fit' ? company.trim().length >= 1 : question.trim().length >= 2;
  const canRun = ready && allowance.ok;

  const submit = (e) => {
    e.preventDefault();
    if (!canRun) return;
    if (sampleActive) {
      setBlocked(true);
      return;
    }
    const base = {
      pitch: pitch ? { id: pitch.id, ticker: pitch.ticker } : null,
      saveTo: prefill?.saveTo || null,
    };
    if (mode === 'fund_fit')
      setRunning({
        ...base,
        query: fundQuery(company, notes, SONAR_QUERY_MAX),
        extra: { fundFit: true },
      });
    else setRunning({ ...base, query: question.trim().slice(0, SONAR_QUERY_MAX), extra: null });
  };

  const choosePitch = (id) => {
    setPitchId(id);
    const p = pitches.find((x) => x.id === id);
    if (p?.ticker && mode === 'fund_fit' && !company.trim()) setCompany(p.ticker);
  };

  return (
    <div className="osp-body osp-body--research">
      <div className="osp-main">
        <Section id="osp-start" title="Start deep research">
          <form className="osp-form" onSubmit={submit}>
            <div className="tcc-toggles osp-modes" role="group" aria-label="Kind of research">
              {MODES.map((m) => (
                <TextToggle key={m.id} pressed={mode === m.id} onClick={() => setMode(m.id)}>
                  {m.label}
                </TextToggle>
              ))}
            </div>
            <p className="osp-hint">
              {mode === 'fund_fit'
                ? 'Sonar checks the company against the fund mandate and policy statement, and describes what it finds for the committee.'
                : 'Any research question. The report can be saved to the fund, reviewed and attached to a pitch.'}
            </p>
            {mode === 'fund_fit' ? (
              <>
                <label className="osp-line">
                  <i className="bi bi-search" aria-hidden="true" />
                  <span className="tcc-sr">Company or ticker</span>
                  <input
                    value={company}
                    maxLength={80}
                    placeholder="Company or ticker, for example NVDA"
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </label>
                <label className="osp-line">
                  <i className="bi bi-file-text" aria-hidden="true" />
                  <span className="tcc-sr">Anything the committee wants covered (optional)</span>
                  <input
                    value={notes}
                    maxLength={400}
                    placeholder="Anything the committee wants covered (optional)"
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="osp-line osp-line--area">
                <i className="bi bi-chat-left-text" aria-hidden="true" />
                <span className="tcc-sr">Research question</span>
                <textarea
                  value={question}
                  rows={3}
                  maxLength={SONAR_QUERY_MAX}
                  placeholder="Your research question"
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </label>
            )}
            <label className="osp-line">
              <i className="bi bi-link-45deg" aria-hidden="true" />
              <span className="tcc-sr">Supports a pitch (optional)</span>
              <select value={pitchId} onChange={(e) => choosePitch(e.target.value)}>
                <option value="">Supports a pitch (optional)</option>
                {pitches.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ticker ? `${p.ticker}, ` : ''}
                    {p.company_name || 'Pitch'}
                  </option>
                ))}
              </select>
            </label>
            {pitchesState.status === 'error' ? (
              <p className="osp-hint">
                Pitches could not be loaded; you can link one after saving.
              </p>
            ) : null}
            {budgetState.status === 'error' ? (
              <SectionError message="Could not load the fund budget." onRetry={onRetryBudget} />
            ) : (
              <p className={`osp-hint${allowance.ok ? '' : ' osp-hint--warn'}`} role="status">
                {!allowance.ok ? (
                  <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                ) : null}
                {budgetLine(budget, allowance)}
              </p>
            )}
            {!allowance.ok ? (
              <p className="osp-hint">
                Standard research does not use the budget. It runs on the main Sonar page and cannot
                be saved to the fund.{' '}
                <a className="tcc-link" href="/sonar">
                  Open main Sonar
                </a>
              </p>
            ) : null}
            {blocked ? (
              <p className="osp-hint osp-hint--warn" role="alert">
                <i className="bi bi-info-circle" aria-hidden="true" />
                Sample content is showing, so research runs are off. Choose Show council data to run
                research for your fund.
              </p>
            ) : null}
            <div className="osp-formactions">
              <button type="submit" className="tcc-btn" disabled={!canRun}>
                <i className="bi bi-broadcast" aria-hidden="true" />
                Run deep research
              </button>
            </div>
          </form>
        </Section>
      </div>
      <span className="tcc-vrule osp-vrule" aria-hidden="true" />
      <aside className="osp-side" aria-label="How research is saved">
        <Section id="osp-howto" title="From run to report">
          <ol className="osp-steps">
            <li>Run deep research. The answer appears here when it is ready.</li>
            <li>
              Choose Save to your fund under the answer. It is saved as a draft only you can see,
              unless you share it.
            </li>
            <li>
              Submit it for review. A portfolio manager or executive other than you approves it or
              returns it with a note.
            </li>
            <li>An approved report can back a pitch and be challenged by any reader.</li>
          </ol>
        </Section>
      </aside>
    </div>
  );
}
