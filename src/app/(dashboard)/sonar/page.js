'use client';

import { useEffect, useState } from 'react';
import { SonarInput } from '@/components/sonar/SonarInput';

import './sonar.css';

/**
 * Ezana Sonar — the universal intelligence surface. Type anything (a person, a
 * bank, a policy, a ticker, a bill, an @user) and get back a synthesized, cited
 * briefing assembled by cross-referencing Ezana's datasets. Companion to Echo:
 * Echo reflects the news, Sonar probes on demand. Everything the surface shows —
 * which datasets are searchable, the quota, the upgrade prompt — is driven by the
 * server-side entitlement matrix (plan tier × version).
 */
export default function SonarPage() {
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Pull the user's Sonar capabilities up front so the surface is honest about
  // what it can (and can't yet) search before the first ping.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/sonar/entitlements', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setEntitlements(data);
      } catch {
        /* non-fatal — the surface still works, just without the pre-query context */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runQuery(rawQuery) {
    const q = String(rawQuery || '').trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/sonar/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 429) {
        setError('Sonar is receiving a lot of pings right now. Try again in a moment.');
        return;
      }
      if (!res.ok) {
        setError(data?.error || 'Sonar could not complete that ping.');
        return;
      }
      setResult(data);
      // Refresh quota after a successful ping.
      if (data?.quota) {
        setEntitlements((prev) => (prev ? { ...prev, quota: data.quota } : prev));
      }
    } catch {
      setError('Network error — Sonar could not reach the datasets.');
    } finally {
      setLoading(false);
    }
  }

  const quota = result?.quota || entitlements?.quota;
  const available = entitlements?.available || [];
  const preLocked = entitlements?.locked || [];

  return (
    <>
      {/* Full-bleed "Echo Rings" emerald gradient backdrop (white core → deep
          emerald), fixed behind the Sonar content. */}
      <div className="sonar-gradient-bg" aria-hidden />

      <div className="sonar-page">
        <div className="sonar-hero">
          <SonarInput onSubmit={runQuery} loading={loading} />

          {quota && (
          <div className="sonar-quota">
            {quota.remaining} of {quota.limit} pings left today
            {entitlements?.version && entitlements.version !== 'regular'
              ? ` · ${entitlements.version} scope`
              : ''}
          </div>
        )}

        {(available.length > 0 || preLocked.length > 0) && !result && !loading && (
          <div className="sonar-chips">
            {available.map((d) => (
              <span key={d.id} className="sonar-chip sonar-chip--on" title={d.source}>
                {d.label}
              </span>
            ))}
            {preLocked.map((d) => (
              <span key={d.id} className="sonar-chip sonar-chip--locked" title="Upgrade to unlock">
                {d.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="sonar-sweep" role="status" aria-live="polite">
          <div className="sonar-radar" aria-hidden />
          <div className="sonar-sweep-label">Cross-referencing datasets…</div>
        </div>
      )}

        {error && <div className="sonar-error">{error}</div>}

        {result && !loading && (
          <div className="sonar-sheet">
            <SonarResult result={result} />
          </div>
        )}
      </div>
    </>
  );
}

function SonarResult({ result }) {
  if (result.quotaExceeded) {
    return (
      <div className="sonar-results">
        <div className="sonar-note sonar-note--warn">{result.message}</div>
        <UpgradePrompt locked={result.locked} />
      </div>
    );
  }

  const {
    query,
    classification,
    briefing,
    grounded,
    empty,
    degraded,
    advice_flagged: adviceFlagged,
    sections = [],
    searched = [],
    locked = [],
    disclaimer,
  } = result;

  return (
    <div className="sonar-results">
      <div className="sonar-readline">
        Sonar read · <b>{query}</b>
        {classification && classification !== 'unknown' && (
          <span className="sonar-tag">{classification}</span>
        )}
      </div>

      {empty ? (
        <div className="sonar-note">
          Ezana has limited data on <b>{query}</b> across the datasets Sonar searched. Nothing was
          fabricated — try a related entity, ticker, or bill number.
        </div>
      ) : grounded ? (
        <div className="sonar-briefing">{briefing}</div>
      ) : (
        <div className="sonar-note">
          Synthesis is unavailable{degraded ? ` (${degraded})` : ''}, so Sonar is showing the raw
          sourced matches below without a written briefing.
        </div>
      )}

      {adviceFlagged && (
        <div className="sonar-note sonar-note--warn">
          Sonar presents sourced findings, not investment advice. Treat any directional language as
          research, not a recommendation.
        </div>
      )}

      {sections.map((sec) => (
        <div className="sonar-section" key={sec.id}>
          <div className="sonar-section-head">
            <span className="sonar-section-label">{sec.label}</span>
            <span className="sonar-section-source">{sec.source}</span>
          </div>
          {sec.items.map((it) => (
            <div className="sonar-source" key={it.marker}>
              <span className="sonar-marker">{it.marker}</span>
              <div className="sonar-source-body">
                {it.url ? (
                  <a className="sonar-source-title" href={it.url} target="_blank" rel="noreferrer">
                    {it.title}
                  </a>
                ) : (
                  <span className="sonar-source-title">{it.title}</span>
                )}
                <div className="sonar-source-meta">
                  {it.ticker && <span>{it.ticker}</span>}
                  {it.date && <span>{String(it.date).slice(0, 10)}</span>}
                  {it.similarity != null && <span>sim {it.similarity}</span>}
                </div>
                {it.snippet && <div className="sonar-source-snip">{it.snippet}</div>}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="sonar-manifest">
        <div className="sonar-manifest-title">What Sonar searched</div>
        <div className="sonar-manifest-row">
          {searched.length ? (
            searched.map((d) => (
              <span
                key={d.id}
                className={`sonar-chip${d.used ? ' sonar-chip--on' : ''}`}
                title={d.used ? `${d.source} — returned matches` : `${d.source} — no matches`}
              >
                {d.label}
              </span>
            ))
          ) : (
            <span className="sonar-chip">No datasets available at your tier</span>
          )}
        </div>
        <UpgradePrompt locked={locked} inline />
      </div>

      {disclaimer && <div className="sonar-disclaimer">{disclaimer}</div>}
    </div>
  );
}

function UpgradePrompt({ locked, inline }) {
  if (!locked || locked.length === 0) return null;
  const names = locked.map((d) => d.label).join(', ');
  return (
    <div className={inline ? 'sonar-upgrade' : 'sonar-note'}>
      Upgrade to include {names}.{' '}
      <a href="/pricing">See plans →</a>
    </div>
  );
}
