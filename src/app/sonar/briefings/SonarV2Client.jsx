'use client';

/**
 * The /sonar page shell: the ping bar, the thread of briefings and the
 * SonarBriefing renderer. A follow-up re-pings with parentPingId so the
 * router inherits the parent's entities; the breadcrumb comes back from the
 * server. Quota errors and degraded composes render honestly.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SonarBriefing from '@/components/sonar/SonarBriefing';
import './sonar-v2.css';

export default function SonarV2Client() {
  const sp = useSearchParams();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [thread, setThread] = useState([]);

  const ping = useCallback(
    async (query, parentPingId = null, kind = 'text') => {
      const q = String(query || '').trim();
      if (!q || busy) return;
      setBusy(true);
      setError(null);
      try {
        /* An EzanaQL follow-up (or a ?eq= handoff from the console) goes to
           the cluster pipeline; free text goes to the template router. */
        const isEq = kind === 'ezanaql' || /^from\s/i.test(q);
        const res = await fetch(isEq ? '/api/sonar/ping' : '/api/sonar/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isEq ? { query: q } : { query: q, parentPingId }),
        });
        const json = await res.json().catch(() => null);
        if (res.status === 401) {
          setError('Sign in to run Sonar pings.');
        } else if (!res.ok || !json) {
          setError(json?.error || 'That ping did not land. Try again in a moment.');
        } else if (json.quotaExceeded) {
          setError(json.message);
        } else {
          setResult(json);
          setThread((t) => [...t, { query: q, headline: json.headline, pingId: json.pingId }]);
        }
      } catch {
        setError('That ping did not land. Try again in a moment.');
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  /* EzanaQL handoff: /sonar/briefings?eq=<query> pings the cluster once. */
  const eqRan = useRef(false);
  useEffect(() => {
    const eq = sp?.get('eq');
    if (eq && !eqRan.current) {
      eqRan.current = true;
      ping(eq, null, 'ezanaql');
    }
  }, [sp, ping]);

  return (
    <div className="snv2">
      <header className="snv2-head">
        <p className="snv2-eyebrow snb-mono">EZANA SONAR · TEMPLATE BRIEFINGS</p>
        <h1 className="snv2-h1">Ping anything financial</h1>
        <p className="snv2-lede">
          A company, a politician, a fund, an industry in a country, a policy, a question. Sonar
          routes the ping to the right research template, sweeps the datasets it names and writes a
          cited brief. Findings only, never advice.
        </p>
        <form
          className="snv2-bar"
          onSubmit={(e) => {
            e.preventDefault();
            ping(input);
          }}
        >
          <i className="bi bi-broadcast" aria-hidden="true" />
          <input
            type="search"
            value={input}
            maxLength={300}
            placeholder="steel industry in Canada"
            aria-label="Ping Sonar"
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={busy || input.trim().length < 2}>
            {busy ? 'Pinging…' : 'Ping'}
          </button>
        </form>
        {error ? (
          <p className="snv2-error" role="status">
            {error}
          </p>
        ) : null}
        {thread.length > 1 ? (
          <ol className="snv2-thread snb-mono" aria-label="Thread">
            {thread.map((t, i) => (
              <li key={i}>{t.query}</li>
            ))}
          </ol>
        ) : null}
      </header>

      {busy && !result ? (
        <div className="snv2-skel" aria-busy="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}

      <SonarBriefing result={result} busy={busy} onFollowup={(q, parentId) => ping(q, parentId)} />
    </div>
  );
}
