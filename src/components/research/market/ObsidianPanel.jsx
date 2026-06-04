'use client';

import { useCallback, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ModelCardShell } from '@/components/research/ModelCardShell';

const EXAMPLE_KEYWORDS = ['Space tech', 'GLP-1 drugs', 'Nuclear SMRs', 'Quantum computing'];

function formatRelativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const sec = Math.floor((Date.now() - then) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(iso).toLocaleString();
}

export function ObsidianPanel() {
  const [keyword, setKeyword] = useState('');
  const [report, setReport] = useState('');
  const [generatedAt, setGeneratedAt] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [activeKeyword, setActiveKeyword] = useState('');

  const runAnalysis = useCallback(
    async (rawKeyword) => {
      const clean = (rawKeyword || keyword).toString().trim();
      if (!clean) return;

      setKeyword(clean);
      setActiveKeyword(clean);
      setStatus('loading');
      setError(null);
      setReport('');

      try {
        const res = await fetch('/api/research/obsidian', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ keyword: clean }),
        });

        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.error || `Analysis failed (${res.status})`);
        }

        setReport(body.report || '');
        setGeneratedAt(body.generatedAt || new Date().toISOString());
        setStatus('done');
      } catch (err) {
        setError(err.message || 'Something went wrong');
        setStatus('error');
      }
    },
    [keyword],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    runAnalysis(keyword);
  };

  const handleChip = (chip) => {
    setKeyword(chip);
    runAnalysis(chip);
  };

  return (
    <ModelCardShell
      icon="bi-gem"
      title="Obsidian"
      description="Type a theme or industry — get an analysis, sentiment read, hot names, and tailwinds vs headwinds."
      className="obsidian-card"
    >
      <form className="obsidian-search" onSubmit={handleSubmit}>
        <input
          type="text"
          className="obsidian-input stc-input"
          placeholder="e.g. space tech, GLP-1 drugs, nuclear SMRs"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          maxLength={120}
          aria-label="Industry or theme keyword"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          className="stc-run-btn obsidian-analyze-btn"
          disabled={status === 'loading' || !keyword.trim()}
        >
          <i className="bi bi-search" aria-hidden />
          Analyze
        </button>
      </form>

      <div className="obsidian-chips" role="list" aria-label="Example themes">
        {EXAMPLE_KEYWORDS.map((chip) => (
          <button
            key={chip}
            type="button"
            className="obsidian-chip"
            onClick={() => handleChip(chip)}
            disabled={status === 'loading'}
          >
            {chip}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <div className="obsidian-loading" aria-live="polite">
          <div className="obsidian-loading-spinner" aria-hidden />
          <p className="obsidian-loading-text">
            Obsidian is analyzing &ldquo;{activeKeyword}&rdquo;&hellip;
          </p>
          <div className="obsidian-skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="obsidian-skeleton-line" />
            ))}
          </div>
        </div>
      )}

      {status === 'error' && error && (
        <div className="obsidian-error" role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden />
          <p>{error}</p>
          <button
            type="button"
            className="stc-run-btn"
            onClick={() => runAnalysis(activeKeyword || keyword)}
          >
            Retry
          </button>
        </div>
      )}

      {status === 'done' && report && (
        <div className="obsidian-result">
          <div className="obsidian-report">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
          <p className="obsidian-footer lf-mono">
            Generated {formatRelativeTime(generatedAt)} · informational only
          </p>
        </div>
      )}
    </ModelCardShell>
  );
}

export default ObsidianPanel;
