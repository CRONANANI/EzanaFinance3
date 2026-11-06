'use client';

/**
 * SonarWorkspace: Sonar for organizations (/org-team-hub/sonar).
 *
 *   Reports    the org research reports the viewer can read
 *   Research   "Should our fund invest?" (fund fit, against the fund's
 *              mandate and IPS) or any research question, run as deep
 *              research; the run can be saved to the fund as a report
 *   Budget     the fund's pooled monthly deep research budget, who is
 *              using it, and (executives) the pool and allocations
 *   Analytics  research activity and quality per member, and the fund's
 *              coverage by sector and ticker
 *
 * Every run here is an ordinary Sonar research run (POST
 * /api/sonar/research), so quotas, entitlements and validation are the same
 * as anywhere else in Sonar.
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DeepResearchRun } from '@/components/sonar/DeepResearch';
import { SONAR_QUERY_MAX } from '@/lib/sonar/limits';
import SonarReportsList from './SonarReportsList';
import SonarBudget from './SonarBudget';
import SonarAnalytics from './SonarAnalytics';
import './org-sonar.css';

export const WORKSPACE_TABS = [
  { id: 'reports', label: 'Reports', icon: 'bi-journal-text' },
  { id: 'research', label: 'Research', icon: 'bi-search' },
  { id: 'budget', label: 'Budget', icon: 'bi-speedometer' },
  { id: 'analytics', label: 'Analytics', icon: 'bi-bar-chart-line' },
];

export default function SonarWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = WORKSPACE_TABS.some((t) => t.id === params.get('tab'))
    ? params.get('tab')
    : 'reports';
  const setTab = (id) => {
    const sp = new URLSearchParams(params.toString());
    sp.set('tab', id);
    router.replace(`/org-team-hub/sonar?${sp}`, { scroll: false });
  };

  return (
    <div className="osr-page">
      <header className="osr-hero">
        <p className="osr-eyebrow">
          <i className="bi bi-broadcast" aria-hidden="true" /> Sonar for your fund
        </p>
        <h1 className="osr-h1">Sonar Research</h1>
        <p className="osr-lead">
          Research your fund keeps: saved Sonar runs, versioned, shared by desk, reviewed and
          approved, and attached to pitches.
        </p>
      </header>
      <div className="osr-tabs" role="tablist" aria-label="Sonar Research">
        {WORKSPACE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`osr-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`bi ${t.icon}`} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'reports' ? <SonarReportsList /> : null}
      {tab === 'research' ? <ResearchTab /> : null}
      {tab === 'budget' ? <SonarBudget /> : null}
      {tab === 'analytics' ? <SonarAnalytics /> : null}
    </div>
  );
}

/* The two ways to research for the fund. */
const MODES = [
  {
    id: 'fund_fit',
    label: 'Should our fund invest?',
    icon: 'bi-bullseye',
    hint: 'Sonar checks the company against your mandate and IPS, then gives its view for the committee with the catalysts and headwinds.',
  },
  {
    id: 'open',
    label: 'Open research question',
    icon: 'bi-search',
    hint: 'Any research question. The report can be saved to the fund, reviewed and attached to a pitch.',
  },
];

function ResearchTab() {
  const [mode, setMode] = useState('fund_fit');
  const [company, setCompany] = useState('');
  const [context, setContext] = useState('');
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(null);

  if (running) {
    return (
      <DeepResearchRun
        query={running.query}
        extra={running.extra}
        saveLabel={running.extra?.fundFit ? 'Save the fund fit report' : null}
        onBack={() => setRunning(null)}
        onQuick={() => {
          window.location.assign(`/sonar?q=${encodeURIComponent(running.query)}`);
        }}
      />
    );
  }

  const fundQuery = () => {
    const c = company.trim();
    const extra = context.trim() ? ` ${context.trim()}` : '';
    return `Should our fund invest in ${c}?${extra}`.slice(0, SONAR_QUERY_MAX);
  };
  const ready = mode === 'fund_fit' ? company.trim().length >= 1 : draft.trim().length >= 2;

  const submit = (e) => {
    e.preventDefault();
    if (!ready) return;
    if (mode === 'fund_fit') setRunning({ query: fundQuery(), extra: { fundFit: true } });
    else setRunning({ query: draft.trim(), extra: null });
  };

  const current = MODES.find((m) => m.id === mode);

  return (
    <form className="osr-research" onSubmit={submit}>
      <div className="osr-modes" role="radiogroup" aria-label="Kind of research">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={mode === m.id}
            className={`osr-mode${mode === m.id ? ' is-active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            <i className={`bi ${m.icon}`} aria-hidden="true" /> {m.label}
          </button>
        ))}
      </div>
      <p className="osr-muted">{current.hint}</p>
      {mode === 'fund_fit' ? (
        <>
          <label className="osr-field">
            <span>Company or ticker</span>
            <input
              value={company}
              maxLength={80}
              placeholder="NVIDIA or NVDA"
              onChange={(e) => setCompany(e.target.value)}
            />
          </label>
          <label className="osr-field">
            <span>Anything the committee wants covered (optional)</span>
            <textarea
              value={context}
              rows={2}
              maxLength={400}
              placeholder="Focus on data center demand and export controls."
              onChange={(e) => setContext(e.target.value)}
            />
          </label>
        </>
      ) : (
        <label className="osr-field">
          <span>Research question</span>
          <textarea
            value={draft}
            rows={3}
            maxLength={SONAR_QUERY_MAX}
            placeholder="What are the biggest risks to NVIDIA's growth over the next three years?"
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
      )}
      <div className="osr-actions">
        <button type="submit" className="osr-btn osr-btn--primary" disabled={!ready}>
          <i className="bi bi-layers" aria-hidden="true" /> Run deep research
        </button>
        <span className="osr-muted">
          About 1 to 4 minutes. Uses one run from your fund&rsquo;s monthly deep research budget.
        </span>
      </div>
    </form>
  );
}
