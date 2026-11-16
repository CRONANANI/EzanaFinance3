'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Modal, Select } from '@/components/ds';
import {
  NA,
  STALE_DAYS,
  cleanTitle,
  fmtDate,
  fmtSignedPct,
} from '@/lib/org-research-library-model';
import { Section, SectionError, Skel } from '@/components/org/command-center/parts';
import { ActionMessage, Mono, say } from './parts';

function Coverage({ stale }) {
  return stale ? (
    <span className="orl-warn">
      <i className="bi bi-clock-history" aria-hidden="true" />
      Stale
    </span>
  ) : (
    <span className="orl-muted">
      <i className="bi bi-check2" aria-hidden="true" />
      Current
    </span>
  );
}

function Signed({ v }) {
  const n = Number(v);
  const tone = v == null || !Number.isFinite(n) ? 'orl-muted' : n >= 0 ? 'orl-pos' : 'orl-neg';
  return <Mono className={tone}>{fmtSignedPct(v)}</Mono>;
}

function Chain({ ticker, loadChain, canRecord, onRecord, onBack, onOpen, version }) {
  const [state, setState] = useState({ status: 'loading', data: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ status: 'loading', data: null });
    loadChain(ticker).then((res) => live && setState(res));
    return () => {
      live = false;
    };
  }, [ticker, loadChain, nonce, version]);
  const c = state.data;
  return (
    <div className="orl-chain">
      <button type="button" className="tcc-textbtn" onClick={onBack}>
        <i className="bi bi-arrow-left" aria-hidden="true" />
        All coverage
      </button>
      <div className="orl-tickerhead">
        <h2 className="tcc-title">
          <span className="orl-mono">{ticker}</span>
          <span className="orl-sub orl-tickerhead__sector">Handoff chain, oldest first</span>
        </h2>
        {canRecord && (
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent"
            onClick={() => onRecord(ticker)}
          >
            Record handoff <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        )}
      </div>
      {state.status === 'error' ? (
        <SectionError
          message={`The ${ticker} chain could not be loaded.`}
          onRetry={() => setNonce((n) => n + 1)}
        />
      ) : state.status === 'loading' ? (
        <div className="orl-skelcol" aria-busy="true">
          <Skel w="50%" h={12} />
          <Skel w="70%" h={12} />
          <Skel w="60%" h={12} />
        </div>
      ) : (
        <>
          <ul className="orl-chainfacts">
            <li>
              <Coverage stale={c.stale} />
            </li>
            <li>
              Last document <Mono>{c.lastDocAt ? fmtDate(c.lastDocAt) : NA}</Mono>
            </li>
            <li>
              Latest pitch, expected return <Signed v={c.performance?.expected_return_pct} />
            </li>
          </ul>
          {c.hops.length === 0 ? (
            <p className="tcc-state">
              <span>No handoff recorded for {ticker} yet.</span>
              {canRecord ? (
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent"
                  onClick={() => onRecord(ticker)}
                >
                  Record handoff
                </button>
              ) : null}
            </p>
          ) : (
            <div className="orl-table" role="table" aria-label={`${ticker} handoffs`}>
              <div className="orl-row orl-row--hops orl-row--head" role="row">
                <span role="columnheader">From</span>
                <span role="columnheader">
                  <span className="tcc-sr">to</span>
                </span>
                <span role="columnheader">To</span>
                <span role="columnheader">Term</span>
                <span role="columnheader">Recorded</span>
                <span role="columnheader">Handoff document</span>
              </div>
              {c.hops.map((h) => (
                <div key={h.id} className="orl-row orl-row--hops" role="row">
                  <span role="cell" className="orl-clip">
                    {h.from?.name || 'Unassigned'}
                  </span>
                  <span role="cell" className="orl-muted">
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </span>
                  <span role="cell" className="orl-clip">
                    {h.to?.name || 'Unassigned'}
                  </span>
                  <span role="cell">
                    <Mono>{h.term || NA}</Mono>
                  </span>
                  <span role="cell">
                    <Mono>{fmtDate(h.created_at)}</Mono>
                  </span>
                  <span role="cell" className="orl-clip">
                    {h.handoff?.id ? (
                      <button
                        type="button"
                        className="orl-open"
                        onClick={() => onOpen(h.handoff.id)}
                        title={cleanTitle(h.handoff.title)}
                      >
                        {h.handoff.title ? cleanTitle(h.handoff.title) : 'Open document'}
                      </button>
                    ) : (
                      NA
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Coverage lineage: one row per covered ticker, and the handoff chain. */
export function LineageView({
  lineage,
  onRetry,
  chain,
  onChain,
  loadChain,
  canRecord,
  onRecord,
  onOpen,
  version,
}) {
  if (chain) {
    return (
      <Chain
        ticker={chain}
        loadChain={loadChain}
        canRecord={canRecord}
        onRecord={onRecord}
        onBack={() => onChain(null)}
        onOpen={onOpen}
        version={version}
      />
    );
  }
  const rows = lineage.data?.tickers || [];
  return (
    <Section
      id="orl-lineage"
      title="Coverage by ticker"
      className="orl-block"
      aside={
        <span className="orl-head-aside">
          <span className="orl-sub">
            Stale after <Mono>{STALE_DAYS}</Mono> days without a document
          </span>
          {canRecord && (
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => onRecord(null)}
            >
              Record handoff <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          )}
        </span>
      }
    >
      {lineage.status === 'error' ? (
        <SectionError message="Coverage lineage could not be loaded." onRetry={onRetry} />
      ) : (
        <div
          className="orl-table"
          role="table"
          aria-labelledby="orl-lineage"
          aria-busy={lineage.status === 'loading'}
        >
          <div className="orl-row orl-row--lineage orl-row--head" role="row">
            <span role="columnheader">Ticker</span>
            <span role="columnheader">Current analyst</span>
            <span role="columnheader" className="orl-num">
              Documents
            </span>
            <span role="columnheader" className="orl-num">
              Handoffs
            </span>
            <span role="columnheader">Last document</span>
            <span
              role="columnheader"
              className="orl-num"
              title="Expected return of the latest pitch"
            >
              Latest pitch
            </span>
            <span role="columnheader">Coverage</span>
          </div>
          {lineage.status === 'loading' ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="orl-row orl-row--lineage orl-row--skel" aria-hidden="true">
                <Skel w="60%" h={12} />
                <Skel w="70%" h={10} />
                <Skel w="40%" h={10} />
                <Skel w="40%" h={10} />
              </div>
            ))
          ) : rows.length === 0 ? (
            <p className="tcc-state">
              <span>No coverage yet. Tickers appear here once documents name them.</span>
              {canRecord ? (
                <button
                  type="button"
                  className="tcc-textbtn tcc-textbtn--accent"
                  onClick={() => onRecord(null)}
                >
                  Record handoff
                </button>
              ) : null}
            </p>
          ) : (
            rows.map((r) => (
              <div key={r.ticker} className="orl-row orl-row--lineage" role="row">
                <span role="cell">
                  <button
                    type="button"
                    className="orl-open orl-mono orl-ticker"
                    onClick={() => onChain(r.ticker)}
                    title={`Open the ${r.ticker} handoff chain`}
                  >
                    {r.ticker}
                  </button>
                </span>
                <span role="cell" className="orl-clip">
                  {r.currentAnalyst || <span className="orl-muted">Unassigned</span>}
                </span>
                <span role="cell" className="orl-num">
                  <Mono>{r.docCount}</Mono>
                </span>
                <span role="cell" className="orl-num">
                  <Mono>{r.hops}</Mono>
                </span>
                <span role="cell">
                  <Mono>{r.lastDocAt ? fmtDate(r.lastDocAt) : NA}</Mono>
                </span>
                <span role="cell" className="orl-num">
                  <Signed v={r.expected_return_pct} />
                </span>
                <span role="cell">
                  <Coverage stale={r.stale} />
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </Section>
  );
}

/** Record a coverage handoff (executives and portfolio managers). */
export function HandoffDialog({ ticker, notes, knownTickers, data, sample, onClose, onDone }) {
  const [form, setForm] = useState({
    ticker: ticker || '',
    from: '',
    to: '',
    term: '',
    noteId: '',
  });
  const [members, setMembers] = useState({ status: 'loading', data: [] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const alive = useRef(true);
  const { getMembers, act } = data;
  useEffect(() => {
    alive.current = true;
    getMembers().then((m) => alive.current && setMembers(m));
    return () => {
      alive.current = false;
    };
  }, [getMembers]);

  const people = useMemo(
    () =>
      [...(members.data || [])]
        .sort(
          (a, b) =>
            Number(b.is_active !== false) - Number(a.is_active !== false) ||
            String(a.display_name).localeCompare(String(b.display_name)),
        )
        .map((m) => ({
          value: m.id,
          label: `${m.display_name || 'Member'}${m.is_active === false ? ' (former member)' : ''}`,
        })),
    [members.data],
  );
  const t = form.ticker.trim().toUpperCase();
  const docs = (notes || []).filter((n) => String(n.ticker || '').toUpperCase() === t);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    const e = {};
    if (!t) e.ticker = 'Enter a ticker.';
    if (!form.to) e.to = 'Choose who takes over coverage.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setMsg(null);
    const out = await act({
      type: 'handoff',
      ticker: t,
      from: form.from || null,
      to: form.to,
      term: form.term.trim() || null,
      noteId: form.noteId || null,
    });
    if (!alive.current) return;
    setBusy(false);
    if (!out.ok) {
      setMsg({
        tone: 'error',
        text: say(out.error, 'Could not record the handoff. Nothing was changed.'),
      });
      return;
    }
    onDone(`Recorded the ${t} handoff.${sample ? ' Sample content: it is not saved.' : ''}`, t);
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title="Record a coverage handoff"
      size={560}
      className="orl-dialog"
      footer={
        <div className="orl-dfoot__right">
          <button type="button" className="tcc-textbtn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <Button variant="primary" className="tcc-flatbtn" loading={busy} onClick={submit}>
            Record handoff
          </Button>
        </div>
      }
    >
      <div className="orl-form">
        <Input
          id="orl-h-ticker"
          label="Ticker"
          value={form.ticker}
          onChange={(e) =>
            setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase(), noteId: '' }))
          }
          list="orl-h-tickers"
          maxLength={12}
          className="orl-mono"
          error={errors.ticker}
        />
        <datalist id="orl-h-tickers">
          {(knownTickers || []).map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
        {members.status === 'error' ? (
          <p className="tcc-state tcc-state--error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            <span>Members could not be loaded.</span>
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent"
              onClick={() => {
                setMembers({ status: 'loading', data: [] });
                getMembers().then((m) => alive.current && setMembers(m));
              }}
            >
              Retry
            </button>
          </p>
        ) : (
          <div className="orl-form__pair">
            <Select
              id="orl-h-from"
              label="From"
              value={form.from}
              onChange={set('from')}
              options={[{ value: '', label: 'Unassigned (first coverage)' }, ...people]}
            />
            <Select
              id="orl-h-to"
              label="To"
              value={form.to}
              onChange={set('to')}
              error={errors.to}
              options={[{ value: '', label: 'Choose a member' }, ...people]}
            />
          </div>
        )}
        <div className="orl-form__pair">
          <Input
            id="orl-h-term"
            label="Term"
            value={form.term}
            onChange={set('term')}
            maxLength={40}
            placeholder="Fall 2026"
          />
          <Select
            id="orl-h-doc"
            label="Handoff document (optional)"
            value={form.noteId}
            onChange={set('noteId')}
            options={[
              { value: '', label: docs.length ? 'None' : 'No documents on this ticker' },
              ...docs.map((n) => ({ value: n.id, label: cleanTitle(n.title) })),
            ]}
          />
        </div>
        <ActionMessage msg={msg} onDismiss={() => setMsg(null)} />
      </div>
    </Modal>
  );
}
