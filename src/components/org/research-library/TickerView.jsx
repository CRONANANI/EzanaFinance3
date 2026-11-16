'use client';

import { useEffect, useRef, useState } from 'react';
import {
  NA,
  docTypeLabel,
  fmtDate,
  fmtSignedPct,
  roleLabel,
} from '@/lib/org-research-library-model';
import { Section, SectionError, Skel } from '@/components/org/command-center/parts';
import { DocumentBody } from './DocumentBody';
import { Flags, Mono, OpenTitle, StatusText } from './parts';

function Stat({ icon, label, children, loading, tone }) {
  return (
    <div className="tcc-kpi" role="listitem">
      <i className={`bi ${icon} tcc-kpi__icon`} aria-hidden="true" />
      <span className="tcc-kpi__label">{label}</span>
      <span className={`tcc-kpi__value tcc-mono${tone ? ` tcc-${tone}` : ''}`}>
        {loading ? <Skel w={40} h={16} /> : children}
      </span>
    </div>
  );
}

/**
 * The ticker dossier: every document the viewer can read on one ticker,
 * newest first, with coverage figures and the first pitch's expected return.
 */
export function TickerView({
  symbol,
  knownTickers,
  loadDossier,
  summarize,
  sample,
  autoSummary,
  onAutoSummaryDone,
  onSymbol,
  onOpen,
}) {
  const [input, setInput] = useState(symbol || '');
  const [state, setState] = useState({ status: 'idle', data: null });
  const [nonce, setNonce] = useState(0);
  const [summary, setSummary] = useState({ status: 'idle', text: '' });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => setInput(symbol || ''), [symbol]);

  useEffect(() => {
    setSummary({ status: 'idle', text: '' });
    if (!symbol) {
      setState({ status: 'idle', data: null });
      return undefined;
    }
    let live = true;
    setState({ status: 'loading', data: null });
    loadDossier(symbol).then((res) => {
      if (live) setState(res);
    });
    return () => {
      live = false;
    };
  }, [symbol, loadDossier, nonce]);

  const docs = state.data?.docs || [];
  const runSummary = async () => {
    if (sample) {
      setSummary({
        status: 'error',
        text: 'Sample content: summaries are only written for council documents.',
      });
      return;
    }
    if (!docs.length) return;
    setSummary({ status: 'loading', text: '' });
    const out = await summarize({ ids: docs.map((d) => d.id), label: `${symbol} coverage` });
    if (!alive.current) return;
    setSummary(
      out.ok
        ? { status: 'ready', text: out.summary }
        : { status: 'error', text: 'The assistant could not write a summary.', retry: true },
    );
  };

  /* "Summarize ticker" from the side column lands here and starts the summary. */
  useEffect(() => {
    if (autoSummary && state.status === 'ready') {
      onAutoSummaryDone();
      runSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSummary, state.status]);

  const submit = (e) => {
    e.preventDefault();
    const t = input.trim().toUpperCase();
    if (t) onSymbol(t);
  };

  const s = state.data?.stats;
  const loading = state.status === 'loading';
  const er = s?.firstPitch?.expected_return_pct;

  return (
    <div className="orl-ticker-view">
      <form className="orl-tickerform" onSubmit={submit} role="search">
        <label className="orl-search">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="tcc-sr">Ticker</span>
          <input
            className="orl-search__input orl-mono"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="Enter a ticker"
            list="orl-dossier-tickers"
            maxLength={12}
          />
        </label>
        <datalist id="orl-dossier-tickers">
          {(knownTickers || []).map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <button type="submit" className="tcc-textbtn tcc-textbtn--accent">
          Open dossier <i className="bi bi-arrow-right" aria-hidden="true" />
        </button>
      </form>

      {!symbol ? (
        <p className="tcc-state">
          <span>Choose a ticker to see every document the council has written on it.</span>
          {(knownTickers || []).slice(0, 8).map((t) => (
            <button
              key={t}
              type="button"
              className="tcc-textbtn tcc-textbtn--accent orl-mono"
              onClick={() => onSymbol(t)}
            >
              {t}
            </button>
          ))}
        </p>
      ) : state.status === 'error' ? (
        <SectionError
          message={`The ${symbol} dossier could not be loaded.`}
          onRetry={() => setNonce((n) => n + 1)}
        />
      ) : (
        <>
          <div className="orl-tickerhead">
            <h2 className="tcc-title">
              <span className="orl-mono">{symbol}</span>
              {state.data?.sector ? (
                <span className="orl-sub orl-tickerhead__sector">{state.data.sector}</span>
              ) : null}
            </h2>
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={runSummary}
              disabled={loading || !docs.length || summary.status === 'loading'}
            >
              <i className="bi bi-stars" aria-hidden="true" />
              Summarize all
            </button>
          </div>
          <div className="tcc-kpistrip orl-kpis orl-kpis--dossier" role="list" aria-busy={loading}>
            <Stat icon="bi-journal-text" label="Documents" loading={loading}>
              {s?.docCount ?? 0}
            </Stat>
            <Stat icon="bi-people" label="Analysts" loading={loading}>
              {s?.analystCount ?? 0}
            </Stat>
            <Stat icon="bi-calendar3" label="Covered since" loading={loading}>
              {s?.coveredSinceYear ?? NA}
            </Stat>
            <Stat icon="bi-easel" label="Pitches" loading={loading}>
              {s?.pitchCount ?? 0}
            </Stat>
            <Stat
              icon="bi-bullseye"
              label="First pitch, expected return"
              loading={loading}
              tone={er == null ? 'na' : Number(er) >= 0 ? 'pos' : 'neg'}
            >
              {fmtSignedPct(er)}
            </Stat>
          </div>

          {summary.status === 'loading' && (
            <p className="tcc-state" role="status">
              <i className="bi bi-arrow-repeat orl-spin" aria-hidden="true" />
              <span>Writing a summary of {symbol} coverage</span>
            </p>
          )}
          {summary.status === 'error' && (
            <p className="tcc-state tcc-state--error" role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              <span>{summary.text}</span>
              {summary.retry ? (
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent"
                  onClick={runSummary}
                >
                  Retry
                </button>
              ) : null}
            </p>
          )}
          {summary.status === 'ready' && (
            <div className="orl-aibox">
              <div className="orl-aibox__head">
                <span>
                  <i className="bi bi-stars" aria-hidden="true" /> Summary of {symbol} coverage by
                  Ezana&apos;s assistant, written on request and not saved
                </span>
                <button
                  type="button"
                  className="tcc-textbtn"
                  onClick={() => setSummary({ status: 'idle', text: '' })}
                >
                  Dismiss
                </button>
              </div>
              <DocumentBody text={summary.text} />
            </div>
          )}

          <Section
            id="orl-dossier-docs"
            title={`Every document on ${symbol}`}
            className="orl-block"
            aside={<span className="orl-sub">Newest first</span>}
          >
            <div
              className="orl-table"
              role="table"
              aria-labelledby="orl-dossier-docs"
              aria-busy={loading}
            >
              <div className="orl-row orl-row--dossier orl-row--head" role="row">
                <span role="columnheader">Date</span>
                <span role="columnheader">Document</span>
                <span role="columnheader">Status</span>
                <span role="columnheader" className="orl-num">
                  Ver.
                </span>
              </div>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="orl-row orl-row--dossier orl-row--skel"
                    aria-hidden="true"
                  >
                    <Skel w="70%" h={10} />
                    <Skel w="80%" h={12} />
                    <Skel w="60%" h={10} />
                    <Skel w="40%" h={10} />
                  </div>
                ))
              ) : docs.length === 0 ? (
                <p className="tcc-state">
                  <span>No documents on {symbol} that you can read yet.</span>
                </p>
              ) : (
                docs.map((d) => (
                  <div key={d.id} className="orl-row orl-row--dossier" role="row">
                    <span role="cell">
                      <Mono>{fmtDate(d.published_at || d.created_at)}</Mono>
                    </span>
                    <span role="cell" className="orl-doc">
                      <OpenTitle note={d} onOpen={onOpen} />
                      <span className="orl-docsub">
                        <span>{docTypeLabel(d.doc_type)}</span>
                        <span className="orl-clip">
                          {d.author_name || NA}
                          {d.author_role ? `, ${roleLabel(d.author_role)}` : ''}
                        </span>
                        <Flags note={d} />
                      </span>
                      {d.abstract ? <span className="orl-abstract">{d.abstract}</span> : null}
                    </span>
                    <span role="cell">
                      <StatusText status={d.status} />
                    </span>
                    <span role="cell" className="orl-num">
                      <Mono>v{d.version || 1}</Mono>
                    </span>
                  </div>
                ))
              )}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
