'use client';

/**
 * /sonar/research: the Sonar research engine v3 surface (behind
 * NEXT_PUBLIC_SONAR_ENGINE_V3). A question box, the streamed research report
 * and follow-on research. ?q= runs a question on load.
 */
import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ResearchReport from '@/components/sonar/research/ResearchReport';
import { useResearchStream } from '@/components/sonar/research/useResearchStream';
import SaveToOrg from '@/components/org/sonar/SaveToOrg';
import './research-page.css';

export default function ResearchClient() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = (params.get('q') || '').slice(0, 600);
  const [q, setQ] = useState(initial);
  const { state, run, cancel } = useResearchStream();
  const started = useRef(false);

  const ask = (text) => {
    const t = String(text || '').trim();
    if (t.length < 2) return;
    setQ(t);
    router.replace(`/sonar/research?q=${encodeURIComponent(t)}`, { scroll: false });
    run(t);
  };

  useEffect(() => {
    if (initial && !started.current) {
      started.current = true;
      run(initial);
    }
  }, [initial, run]);

  return (
    <main className="srp">
      <form
        className="srp-bar"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <label htmlFor="srp-q" className="srp-visually-hidden">
          Research question
        </label>
        <input
          id="srp-q"
          className="srp-input"
          value={q}
          maxLength={600}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask a research question, for example: Who is lobbying hardest on AI regulation?"
        />
        {state.status === 'running' ? (
          <button type="button" className="srp-btn" onClick={cancel}>
            Cancel
          </button>
        ) : (
          <button type="submit" className="srp-btn srp-btn--primary">
            Research
          </button>
        )}
      </form>
      {state.status === 'gated' ? (
        <p className="srp-gate">
          {state.error} <a href="/auth/continue?next=/sonar/research">Create a free account</a>
        </p>
      ) : null}
      {state.status !== 'idle' && state.status !== 'gated' ? (
        <ResearchReport state={state} onFollowUp={ask} />
      ) : null}
      {state.status === 'done' ? (
        <SaveToOrg org={state.org} query={state.run?.researchQuestion || q} />
      ) : null}
    </main>
  );
}
