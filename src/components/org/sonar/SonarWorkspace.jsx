'use client';

/**
 * SonarWorkspace: Sonar for organizations (/org-team-hub/sonar).
 *
 *   Reports    the org research reports the viewer can read
 *   Research   run deep research inside the org; the run can be saved to
 *              the fund as a report
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
import './org-sonar.css';

export const WORKSPACE_TABS = [
  { id: 'reports', label: 'Reports', icon: 'bi-journal-text' },
  { id: 'research', label: 'Research', icon: 'bi-search' },
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
    </div>
  );
}

function ResearchTab() {
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(null);

  if (running) {
    return (
      <DeepResearchRun
        query={running.query}
        extra={running.extra}
        onBack={() => setRunning(null)}
        onQuick={() => {
          window.location.assign(`/sonar?q=${encodeURIComponent(running.query)}`);
        }}
      />
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const q = draft.trim();
    if (q.length < 2) return;
    setRunning({ query: q, extra: null });
  };

  return (
    <form className="osr-research" onSubmit={submit}>
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
      <div className="osr-actions">
        <button
          type="submit"
          className="osr-btn osr-btn--primary"
          disabled={draft.trim().length < 2}
        >
          <i className="bi bi-layers" aria-hidden="true" /> Run deep research
        </button>
        <span className="osr-muted">
          About 1 to 3 minutes. Findings only, never financial advice.
        </span>
      </div>
    </form>
  );
}
