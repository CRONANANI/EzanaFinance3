'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, Search, ArrowUpRight } from 'lucide-react';
import './research-copilot.css';

const EXAMPLES = [
  "What's our coverage on critical-minerals supply chains?",
  'Recent congressional trades in semiconductors',
  'Government contracts awarded to defense contractors in 2025',
];

const CORPUS_ORDER = ['research_notes', 'echo', 'markets', 'congress', 'contracts'];
const CORPUS_LABELS = {
  research_notes: 'Research notes',
  echo: 'Ezana Echo',
  markets: 'Prediction markets',
  congress: 'Congressional trades',
  contracts: 'Government contracts',
};

export default function ResearchCopilotPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function ask(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/research/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.error || 'Something went wrong. Please try again.');
      else setResult(data);
    } catch {
      setError('Could not reach the copilot. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Group sources by corpus for the provenance panel.
  const grouped = useMemo(() => {
    const src = (result && result.sources) || [];
    const map = new Map();
    for (const s of src) {
      if (!map.has(s.corpus)) map.set(s.corpus, []);
      map.get(s.corpus).push(s);
    }
    return CORPUS_ORDER.filter((c) => map.has(c)).map((c) => [c, map.get(c)]);
  }, [result]);

  const searched = (result && result.corpora_searched) || [];
  const used = new Set((result && result.corpora_used) || []);

  return (
    <div className="rc-page">
      <div className="rc-head">
        <h1 className="rc-title">Research copilot</h1>
        <p className="rc-sub">
          Ask across research notes, Ezana Echo, prediction markets, congressional trades, and
          government contracts. Answers are synthesized only from retrieved sources, cited per claim.
        </p>
      </div>

      <form className="rc-form" onSubmit={ask}>
        <textarea
          className="rc-input"
          placeholder="e.g. What's our coverage on critical-minerals supply chains?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask(e);
          }}
          aria-label="Ask the research copilot"
        />
        <button type="submit" className="rc-ask" disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Ask
        </button>
      </form>
      <p className="rc-hint">⌘/Ctrl + Enter to ask · findings only, not financial advice</p>

      {!result && !loading && (
        <div className="rc-examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" className="rc-example" onClick={() => setQuery(ex)}>
              <Search className="mr-1 inline h-3 w-3" />
              {ex}
            </button>
          ))}
        </div>
      )}

      {searched.length > 0 && (
        <div className="rc-corpora" aria-label="Corpora searched">
          {searched.map((c) => (
            <span key={c} className={`rc-chip ${used.has(c) ? 'rc-chip--used' : ''}`}>
              {CORPUS_LABELS[c] || c}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="rc-loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          Retrieving across corpora…
        </div>
      ) : error ? (
        <div className="rc-error">{error}</div>
      ) : result ? (
        result.empty ? (
          <div className="rc-empty">
            Ezana&apos;s corpora don&apos;t cover that yet. Try naming a sector, ticker, company, or
            person — or broaden the question.
          </div>
        ) : (
          <>
            {result.answer ? (
              <div className="rc-answer">
                <span className="rc-answer-label">
                  <Sparkles className="h-4 w-4" />
                  Synthesized answer
                </span>
                <div className="rc-answer-body">
                  {result.answer.split(/\n{2,}/).map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
                {result.advice_flagged && (
                  <p className="rc-advice-flag">
                    Note: this response is sourced research, not advice or a recommendation.
                  </p>
                )}
                {result.disclaimer && <p className="rc-disclaimer">{result.disclaimer}</p>}
              </div>
            ) : (
              <div className="rc-empty">
                Retrieved relevant sources below (the synthesizer is unavailable right now).
              </div>
            )}

            {grouped.length > 0 && (
              <div>
                <p className="rc-sources-title">Sources</p>
                {grouped.map(([corpus, list]) => (
                  <div key={corpus} className="rc-corpus-group">
                    <p className="rc-corpus-name">{CORPUS_LABELS[corpus] || corpus}</p>
                    {list.map((s) =>
                      s.url ? (
                        <Link key={s.marker} href={s.url} className="rc-source">
                          <span className="rc-source-marker">[{s.marker}]</span>
                          <span className="rc-source-title">{s.title}</span>
                          {s.similarity != null && (
                            <span className="rc-source-sim">{s.similarity.toFixed(2)}</span>
                          )}
                          <ArrowUpRight className="h-4 w-4 flex-shrink-0 opacity-60" />
                        </Link>
                      ) : (
                        <div key={s.marker} className="rc-source">
                          <span className="rc-source-marker">[{s.marker}]</span>
                          <span className="rc-source-title">{s.title}</span>
                          {s.similarity != null && (
                            <span className="rc-source-sim">{s.similarity.toFixed(2)}</span>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )
      ) : null}
    </div>
  );
}
