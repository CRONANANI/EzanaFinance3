'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  NA,
  STALE_DAYS,
  fmtDate,
  fmtShare,
  recentHandoffs,
  staleTickers,
} from '@/lib/org-research-library-model';
import { KIND_LABEL as SONAR_KIND, STATUS_LABEL as SONAR_STATUS } from '@/lib/org-sonar/reports';
import { ArrowLink, Section, SectionError, Skel } from '@/components/org/command-center/parts';
import { Mono } from './parts';

function SkelLines({ n = 3 }) {
  return (
    <div className="orl-skelcol" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <Skel key={i} w={`${90 - i * 12}%`} h={12} />
      ))}
    </div>
  );
}

/* ── Sonar research reports: the latest four the viewer may read ─────────── */
function SonarReports({ sonar, onRetry }) {
  const rows = (sonar.data || []).slice(0, 4);
  return (
    <Section
      id="orl-sonar"
      title="Sonar research reports"
      className="orl-sideblock"
      aside={<ArrowLink href="/org-team-hub/sonar">All reports</ArrowLink>}
    >
      {sonar.status === 'loading' ? (
        <SkelLines n={4} />
      ) : sonar.status === 'error' ? (
        <SectionError message="Reports could not be loaded." onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <p className="tcc-state">
          <span>No reports yet. Save a research run in Sonar to your fund.</span>
        </p>
      ) : (
        <div className="orl-table" role="table" aria-labelledby="orl-sonar">
          <div className="orl-row orl-row--sonar orl-row--head" role="row">
            <span role="columnheader">Report</span>
            <span role="columnheader">Status</span>
            <span role="columnheader" className="orl-num">
              Ver.
            </span>
            <span role="columnheader" className="orl-num" title="Share of claims verified">
              Verified
            </span>
          </div>
          {rows.map((r) => (
            <div key={r.id} className="orl-row orl-row--sonar" role="row">
              <span role="cell" className="orl-doc">
                <Link href={`/org-team-hub/sonar/${r.id}`} className="orl-open orl-open--link">
                  {r.title}
                </Link>
                <span className="orl-docsub">
                  <span>{SONAR_KIND[r.kind] || r.kind}</span>
                  {r.ticker && <Mono className="orl-ticker">{r.ticker}</Mono>}
                </span>
              </span>
              <span role="cell" className={`orl-clip orl-sonar--${r.status}`}>
                {SONAR_STATUS[r.status] || r.status}
              </span>
              <span role="cell" className="orl-num">
                <Mono>v{r.current_version ?? 1}</Mono>
              </span>
              <span role="cell" className="orl-num">
                <Mono>{fmtShare(r.summary?.stats?.claimSupportRate)}</Mono>
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ── Coverage handoffs: the latest handoff per ticker ────────────────────── */
function Handoffs({ lineage, canRecord, onRecord, onOpenChain, onRetry }) {
  const rows = recentHandoffs(lineage.data?.tickers).slice(0, 5);
  return (
    <Section
      id="orl-handoffs"
      title="Coverage handoffs"
      className="orl-sideblock"
      aside={
        canRecord ? (
          <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onRecord}>
            Record handoff <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        ) : null
      }
    >
      {lineage.status === 'loading' ? (
        <SkelLines n={3} />
      ) : lineage.status === 'error' ? (
        <SectionError message="Handoffs could not be loaded." onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <p className="tcc-state">
          <span>No handoffs recorded yet.</span>
          {canRecord ? (
            <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onRecord}>
              Record handoff
            </button>
          ) : null}
        </p>
      ) : (
        <div className="orl-table" role="table" aria-labelledby="orl-handoffs">
          <div className="orl-row orl-row--hand orl-row--head" role="row">
            <span role="columnheader">Ticker</span>
            <span role="columnheader">From</span>
            <span role="columnheader">To</span>
            <span role="columnheader" className="orl-num">
              Term
            </span>
          </div>
          {rows.map((r) => (
            <div key={r.ticker} className="orl-row orl-row--hand" role="row">
              <span role="cell">
                <button
                  type="button"
                  className="orl-open orl-mono orl-ticker"
                  onClick={() => onOpenChain(r.ticker)}
                  title={`Open the ${r.ticker} handoff chain`}
                >
                  {r.ticker}
                </button>
              </span>
              <span role="cell" className="orl-clip" title={r.latestHop.from || 'Unassigned'}>
                {r.latestHop.from || 'Unassigned'}
              </span>
              <span role="cell" className="orl-clip" title={r.latestHop.to || 'Unassigned'}>
                {r.latestHop.to || 'Unassigned'}
              </span>
              <span role="cell" className="orl-num orl-clip">
                <Mono>{r.latestHop.term || NA}</Mono>
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ── Stale coverage: no document in 90 days ──────────────────────────────── */
function StaleCoverage({ lineage, now, onOpenTicker, onRetry }) {
  const rows = staleTickers(lineage.data?.tickers, now).slice(0, 6);
  return (
    <Section
      id="orl-stale"
      title="Stale coverage"
      className="orl-sideblock"
      aside={
        <span className="orl-sub">
          No document in <Mono>{STALE_DAYS}</Mono> days
        </span>
      }
    >
      {lineage.status === 'loading' ? (
        <SkelLines n={3} />
      ) : lineage.status === 'error' ? (
        <SectionError message="Coverage could not be loaded." onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <p className="tcc-state">
          <span>Every covered ticker has a document from the last {STALE_DAYS} days.</span>
        </p>
      ) : (
        <div className="orl-table" role="table" aria-labelledby="orl-stale">
          <div className="orl-row orl-row--stale orl-row--head" role="row">
            <span role="columnheader">Ticker</span>
            <span role="columnheader">Last document</span>
            <span role="columnheader" className="orl-num">
              Days
            </span>
          </div>
          {rows.map((r) => (
            <div key={r.ticker} className="orl-row orl-row--stale" role="row">
              <span role="cell">
                <button
                  type="button"
                  className="orl-open orl-mono orl-ticker"
                  onClick={() => onOpenTicker(r.ticker)}
                  title={`Open the ${r.ticker} dossier`}
                >
                  {r.ticker}
                </button>
              </span>
              <span role="cell">
                <Mono>{r.lastDocAt ? fmtDate(r.lastDocAt) : NA}</Mono>
              </span>
              <span role="cell" className="orl-num orl-warn">
                <i className="bi bi-clock-history" aria-hidden="true" />
                <Mono>{r.days == null ? NA : `${r.days}d`}</Mono>
                <span className="tcc-sr">Stale</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ── Quick dossier for one ticker ────────────────────────────────────────── */
function QuickDossier({
  ticker,
  libraryStatus,
  loadDossier,
  onOpenTicker,
  onSummarize,
  sampleKey,
}) {
  const [state, setState] = useState({ status: 'idle', data: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!ticker) return undefined;
    let alive = true;
    setState({ status: 'loading', data: null });
    loadDossier(ticker).then((res) => {
      if (alive) setState(res);
    });
    return () => {
      alive = false;
    };
  }, [ticker, loadDossier, nonce, sampleKey]);

  const s = state.data?.stats;
  return (
    <Section
      id="orl-quick"
      title={
        ticker ? (
          <>
            Quick dossier for <span className="orl-mono orl-accent">{ticker}</span>
          </>
        ) : (
          'Quick dossier'
        )
      }
      className="orl-sideblock"
    >
      {libraryStatus === 'loading' ? (
        <SkelLines n={4} />
      ) : libraryStatus === 'error' ? (
        <p className="tcc-state">
          <span>Shown once the library loads.</span>
        </p>
      ) : !ticker ? (
        <p className="tcc-state">
          <span>No document in this list has a ticker.</span>
        </p>
      ) : state.status === 'loading' || state.status === 'idle' ? (
        <SkelLines n={4} />
      ) : state.status === 'error' ? (
        <SectionError
          message="The dossier could not be loaded."
          onRetry={() => setNonce((n) => n + 1)}
        />
      ) : (
        <>
          <dl className="tcc-pairs orl-pairs">
            <div className="tcc-pair">
              <dt>Documents</dt>
              <dd>
                <Mono>{s.docCount}</Mono>
              </dd>
            </div>
            <div className="tcc-pair">
              <dt>Distinct authors</dt>
              <dd>
                <Mono>{s.analystCount}</Mono>
              </dd>
            </div>
            <div className="tcc-pair">
              <dt>Covered since</dt>
              <dd>
                <Mono>{s.coveredSinceYear ?? NA}</Mono>
              </dd>
            </div>
            <div className="tcc-pair">
              <dt>Linked pitches</dt>
              <dd>
                <Mono>{s.pitchCount ?? 0}</Mono>
              </dd>
            </div>
          </dl>
          <p className="orl-links">
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => onOpenTicker(ticker)}
            >
              Open dossier <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => onSummarize(ticker)}
              disabled={!s.docCount}
            >
              Summarize ticker <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </p>
        </>
      )}
    </Section>
  );
}

export function SideColumn({
  sonar,
  lineage,
  now,
  canRecord,
  quickTicker,
  libraryStatus,
  loadDossier,
  sampleKey,
  onRetrySonar,
  onRetryLineage,
  onRecord,
  onOpenChain,
  onOpenTicker,
  onSummarizeTicker,
}) {
  return (
    <aside className="orl-side" aria-label="Coverage and reports">
      <SonarReports sonar={sonar} onRetry={onRetrySonar} />
      <Handoffs
        lineage={lineage}
        canRecord={canRecord}
        onRecord={onRecord}
        onOpenChain={onOpenChain}
        onRetry={onRetryLineage}
      />
      <StaleCoverage
        lineage={lineage}
        now={now}
        onOpenTicker={onOpenTicker}
        onRetry={onRetryLineage}
      />
      <QuickDossier
        ticker={quickTicker}
        libraryStatus={libraryStatus}
        loadDossier={loadDossier}
        onOpenTicker={onOpenTicker}
        onSummarize={onSummarizeTicker}
        sampleKey={sampleKey}
      />
    </aside>
  );
}
