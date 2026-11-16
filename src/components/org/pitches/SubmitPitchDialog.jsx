'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Input, Modal, Select, Textarea } from '@/components/ds';
import { TextToggle } from '@/components/org/command-center/parts';
import {
  CONVICTION,
  HORIZONS,
  NA,
  PITCH_TYPES,
  fmtDate,
  fmtMoney,
  fmtPct,
  horizonName,
} from '@/lib/org-pitch-pipeline-model';
import { say } from './pitch-copy';

const STEPS = [
  ['identity', 'Identity'],
  ['thesis', 'Thesis'],
  ['deep', 'Deep dive data'],
  ['review', 'Review'],
];
const lines = (s) =>
  String(s || '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
const numOrNull = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * Submit a pitch. Four steps, every one with fields: who and what, the
 * thesis, the Deep Dive data (optional at submission, needed later by the
 * gates, and editable from the pitch until the thesis freezes), and a review
 * with earlier pitches on the same ticker, which must be acknowledged.
 *
 * On submit the investment policy check runs first (a hard breach blocks),
 * then the pitch is created; the server also blocks members whose required
 * onboarding is unfinished. In sample content nothing is sent.
 */
export function SubmitPitchDialog({ board, sample, act, onClose, onCreated }) {
  const viewer = board?.viewer || {};
  const teams = board?.teams || [];
  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    ticker: '',
    company_name: '',
    team_id: viewer.team_id || teams[0]?.id || '',
    pitch_type: 'long',
    time_horizon: '12m',
    target_price: '',
    expected_return_pct: '',
    current_price: '',
    thesis_short: '',
    thesis_full: '',
    why_now: '',
    catalysts: '',
    risks: '',
    variant_perception: '',
    falsification: '',
    valuation_base: '',
    valuation_bull: '',
    valuation_bear: '',
    position_size_pct: '',
    conviction_level: '',
    catalyst_date: '',
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const [results, setResults] = useState([]);
  const [priors, setPriors] = useState({ status: 'idle', list: [] });
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tried, setTried] = useState(false);
  const searchSeq = useRef(0);

  const ticker = f.ticker.trim().toUpperCase();

  /* Earlier decided pitches on the ticker. Sample: from the sample council. */
  useEffect(() => {
    if (!ticker) {
      setPriors({ status: 'idle', list: [] });
      return undefined;
    }
    if (sample) {
      const list = (board?.pitches || []).filter(
        (p) => p.ticker === ticker && p.status !== 'active' && p.decision,
      );
      setPriors({ status: 'ready', list });
      setAck(false);
      return undefined;
    }
    let off = false;
    setPriors((p) => ({ ...p, status: 'loading' }));
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/org/archive/by-ticker/${encodeURIComponent(ticker)}`);
        const data = await res.json();
        if (!off) setPriors({ status: res.ok ? 'ready' : 'error', list: data.priors || [] });
      } catch {
        if (!off) setPriors({ status: 'error', list: [] });
      }
      if (!off) setAck(false);
    }, 400);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, [ticker, sample, board]);

  const search = async (q) => {
    set('ticker', q.toUpperCase());
    if (sample || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const seq = (searchSeq.current += 1);
    try {
      const res = await fetch(`/api/org/symbol-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (seq === searchSeq.current) setResults((data.results || []).slice(0, 6));
    } catch {
      setResults([]);
    }
  };

  const pick = async (sym, name) => {
    setResults([]);
    setF((x) => ({ ...x, ticker: sym, company_name: name || sym }));
    try {
      const res = await fetch(`/api/market-data?ticker=${encodeURIComponent(sym)}`);
      const data = await res.json();
      const price = data.quote?.price ?? data.quote?.c;
      if (price) set('current_price', String(price));
    } catch {
      /* The price is optional; the server looks it up again on submit. */
    }
  };

  const problems = useMemo(() => {
    const p = {};
    if (!ticker) p.ticker = 'Enter a ticker.';
    if (f.thesis_short.trim().length < 20) {
      p.thesis_short = 'Write at least 20 characters: the Idea gate needs it.';
    }
    for (const k of [
      'target_price',
      'expected_return_pct',
      'valuation_base',
      'valuation_bull',
      'valuation_bear',
      'position_size_pct',
    ]) {
      if (f[k] !== '' && !Number.isFinite(Number(f[k]))) p[k] = 'Enter a number.';
    }
    if (priors.list.length > 0 && !ack) p.ack = 'Confirm you have read the earlier pitches.';
    return p;
  }, [f, ticker, priors.list.length, ack]);
  const stepOf = {
    ticker: 0,
    thesis_short: 1,
    target_price: 0,
    expected_return_pct: 0,
    valuation_base: 2,
    valuation_bull: 2,
    valuation_bear: 2,
    position_size_pct: 2,
    ack: 3,
  };
  const err = (k) => (tried || step > stepOf[k] ? problems[k] : undefined);

  const submit = async () => {
    setTried(true);
    setError('');
    const first = Object.keys(problems)[0];
    if (first) {
      setStep(stepOf[first] ?? 3);
      setError(problems[first]);
      return;
    }
    setBusy(true);
    if (!sample) {
      try {
        const ips = await fetch('/api/org/ips/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker,
            side: f.pitch_type === 'short' ? 'sell' : 'buy',
            sizePct: numOrNull(f.position_size_pct),
            source_type: 'pitch',
            log: true,
          }),
        }).then((r) => r.json().catch(() => null));
        if (ips?.blocked) {
          setBusy(false);
          setError('This pitch breaches a hard investment policy limit and cannot be submitted.');
          return;
        }
      } catch {
        /* The policy check itself failing never blocks a legitimate pitch. */
      }
    }
    const body = {
      ticker,
      company_name: f.company_name.trim() || ticker,
      team_id: f.team_id || undefined,
      pitch_type: f.pitch_type,
      time_horizon: f.time_horizon,
      target_price: numOrNull(f.target_price),
      expected_return_pct: numOrNull(f.expected_return_pct),
      current_price_at_submission: numOrNull(f.current_price),
      thesis_short: f.thesis_short.trim(),
      thesis_full: f.thesis_full.trim() || null,
      why_now: f.why_now.trim() || null,
      catalysts: lines(f.catalysts),
      risks: lines(f.risks),
      variant_perception: f.variant_perception.trim() || null,
      falsification: f.falsification.trim() || null,
      valuation_base: numOrNull(f.valuation_base),
      valuation_bull: numOrNull(f.valuation_bull),
      valuation_bear: numOrNull(f.valuation_bear),
      position_size_pct: numOrNull(f.position_size_pct),
      conviction_level: numOrNull(f.conviction_level),
      catalyst_date: f.catalyst_date || null,
    };
    const res = await act({ type: 'submit', body });
    setBusy(false);
    if (!res.ok) {
      setError(say(res.error, 'The pitch was not submitted. Nothing was saved.'));
      return;
    }
    onCreated(ticker, res.id);
  };

  const last = step === STEPS.length - 1;

  return (
    <Modal
      open
      onClose={onClose}
      title="Submit new pitch"
      size={640}
      className="opp-dialog"
      footer={
        <>
          {step > 0 && (
            <button
              type="button"
              className="tcc-textbtn opp-footleft"
              onClick={() => setStep(step - 1)}
            >
              <i className="bi bi-arrow-left" aria-hidden="true" />
              Back
            </button>
          )}
          <button type="button" className="tcc-textbtn" onClick={onClose}>
            Cancel
          </button>
          {last ? (
            <button type="button" className="tcc-btn" disabled={busy} onClick={submit}>
              Submit pitch
            </button>
          ) : (
            <button type="button" className="tcc-btn" onClick={() => setStep(step + 1)}>
              Next
            </button>
          )}
        </>
      }
    >
      <div className="tcc-toggles opp-steps" role="tablist" aria-label="Steps">
        {STEPS.map(([key, label], i) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={step === i}
            className={`tcc-toggle${step === i ? ' is-on' : ''}`}
            onClick={() => setStep(i)}
          >
            <span className="tcc-mono">{i + 1}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="opp-form">
        {step === 0 && (
          <>
            <div className="opp-grid2">
              <div className="opp-field opp-lookup">
                <Input
                  id="opp-sub-ticker"
                  label="Ticker"
                  value={f.ticker}
                  autoComplete="off"
                  placeholder="For example NVDA"
                  error={err('ticker')}
                  onChange={(e) => search(e.target.value)}
                />
                {results.length > 0 && (
                  <ul className="opp-results" role="listbox" aria-label="Matching tickers">
                    {results.map((r) => (
                      <li key={r.symbol}>
                        <button
                          type="button"
                          role="option"
                          aria-selected="false"
                          onClick={() => pick(r.symbol, r.name || r.companyName)}
                        >
                          <span className="tcc-mono">{r.symbol}</span>
                          <span>{r.name || r.companyName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Input
                id="opp-sub-company"
                label="Company"
                value={f.company_name}
                onChange={(e) => set('company_name', e.target.value)}
              />
            </div>
            <div className="opp-grid2">
              <Select
                id="opp-sub-desk"
                label="Desk"
                value={f.team_id}
                onChange={(e) => set('team_id', e.target.value)}
                options={[
                  { value: '', label: 'My desk' },
                  ...teams.map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
              <Select
                id="opp-sub-horizon"
                label="Horizon"
                value={f.time_horizon}
                onChange={(e) => set('time_horizon', e.target.value)}
                options={HORIZONS.map(([value, label]) => ({ value, label }))}
              />
            </div>
            <div className="opp-field">
              <span className="ds-field-label" id="opp-sub-type">
                Type
              </span>
              <div className="tcc-toggles opp-toggles" role="group" aria-labelledby="opp-sub-type">
                {PITCH_TYPES.map(([value, label]) => (
                  <TextToggle
                    key={value}
                    pressed={f.pitch_type === value}
                    onClick={() => set('pitch_type', value)}
                  >
                    {label}
                  </TextToggle>
                ))}
              </div>
            </div>
            <div className="opp-grid3">
              <Input
                id="opp-sub-target"
                label="Target price ($)"
                inputMode="decimal"
                value={f.target_price}
                error={err('target_price')}
                onChange={(e) => set('target_price', e.target.value)}
              />
              <Input
                id="opp-sub-exp"
                label="Expected return (%)"
                inputMode="decimal"
                value={f.expected_return_pct}
                error={err('expected_return_pct')}
                onChange={(e) => set('expected_return_pct', e.target.value)}
              />
              <Input
                id="opp-sub-price"
                label="Current price ($)"
                inputMode="decimal"
                value={f.current_price}
                hint={sample ? undefined : 'Looked up again on submit.'}
                onChange={(e) => set('current_price', e.target.value)}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Input
              id="opp-sub-short"
              label="Short thesis"
              maxLength={140}
              value={f.thesis_short}
              error={err('thesis_short')}
              hint={`${f.thesis_short.length} of 140 characters`}
              onChange={(e) => set('thesis_short', e.target.value)}
            />
            <Textarea
              id="opp-sub-full"
              label="Full thesis"
              rows={4}
              value={f.thesis_full}
              hint="The Screening gate looks for at least 200 characters."
              onChange={(e) => set('thesis_full', e.target.value)}
            />
            <Textarea
              id="opp-sub-why"
              label="Why now"
              rows={2}
              value={f.why_now}
              hint="At least 60 characters for the Screening gate."
              onChange={(e) => set('why_now', e.target.value)}
            />
            <div className="opp-grid2">
              <Textarea
                id="opp-sub-cat"
                label="Catalysts"
                rows={3}
                value={f.catalysts}
                hint="One per line."
                onChange={(e) => set('catalysts', e.target.value)}
              />
              <Textarea
                id="opp-sub-risk"
                label="Risks"
                rows={3}
                value={f.risks}
                hint="One per line."
                onChange={(e) => set('risks', e.target.value)}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="opp-note">
              Optional now. The Screening gate needs the base value and the Deep Dive gate needs all
              of these. They can be filled in from the pitch until the thesis freezes.
            </p>
            <div className="opp-grid3">
              <Input
                id="opp-sub-base"
                label="Base value ($)"
                inputMode="decimal"
                value={f.valuation_base}
                error={err('valuation_base')}
                onChange={(e) => set('valuation_base', e.target.value)}
              />
              <Input
                id="opp-sub-bull"
                label="Bull value ($)"
                inputMode="decimal"
                value={f.valuation_bull}
                error={err('valuation_bull')}
                onChange={(e) => set('valuation_bull', e.target.value)}
              />
              <Input
                id="opp-sub-bear"
                label="Bear value ($)"
                inputMode="decimal"
                value={f.valuation_bear}
                error={err('valuation_bear')}
                onChange={(e) => set('valuation_bear', e.target.value)}
              />
            </div>
            <Textarea
              id="opp-sub-variant"
              label="Variant perception"
              rows={2}
              value={f.variant_perception}
              hint="Where you differ from the market. At least 80 characters."
              onChange={(e) => set('variant_perception', e.target.value)}
            />
            <Textarea
              id="opp-sub-fals"
              label="Falsification condition"
              rows={2}
              value={f.falsification}
              hint="What would prove the thesis wrong. At least 40 characters."
              onChange={(e) => set('falsification', e.target.value)}
            />
            <div className="opp-grid3">
              <Input
                id="opp-sub-size"
                label="Position size (% of fund)"
                inputMode="decimal"
                value={f.position_size_pct}
                error={err('position_size_pct')}
                onChange={(e) => set('position_size_pct', e.target.value)}
              />
              <Select
                id="opp-sub-conv"
                label="Conviction"
                value={f.conviction_level}
                onChange={(e) => set('conviction_level', e.target.value)}
                options={[
                  { value: '', label: 'Not set' },
                  ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: CONVICTION[n] })),
                ]}
              />
              <Input
                id="opp-sub-catdate"
                label="Catalyst date"
                type="date"
                value={f.catalyst_date}
                onChange={(e) => set('catalyst_date', e.target.value)}
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <dl className="tcc-pairs opp-pairs">
              <div className="tcc-pair">
                <dt>Pitch</dt>
                <dd>
                  <span className="tcc-ticker tcc-mono">{ticker || NA}</span> {f.company_name}
                </dd>
              </div>
              <div className="tcc-pair">
                <dt>Type and horizon</dt>
                <dd>
                  {PITCH_TYPES.find(([k]) => k === f.pitch_type)?.[1]},{' '}
                  {horizonName(f.time_horizon)}
                </dd>
              </div>
              <div className="tcc-pair">
                <dt>Target</dt>
                <dd className="tcc-mono">
                  {fmtMoney(numOrNull(f.target_price))} ({fmtPct(numOrNull(f.expected_return_pct))}{' '}
                  expected)
                </dd>
              </div>
              <div className="tcc-pair">
                <dt>Short thesis</dt>
                <dd>{f.thesis_short || NA}</dd>
              </div>
            </dl>

            <h3 className="opp-subhead">
              Earlier pitches on {ticker || 'this ticker'}{' '}
              <span className="tcc-mono">
                ({priors.status === 'ready' ? priors.list.length : NA})
              </span>
            </h3>
            {priors.status === 'loading' ? (
              <p className="opp-note">Checking the archive.</p>
            ) : priors.status === 'error' ? (
              <p className="opp-note">The archive could not be checked. You can still submit.</p>
            ) : priors.list.length === 0 ? (
              <p className="opp-note">None on record.</p>
            ) : (
              <>
                <ul className="opp-list">
                  {priors.list.map((p) => (
                    <li key={p.id} className="opp-line opp-wrap">
                      <span className="tcc-mono">{fmtDate(p.decision_at)}</span>
                      <span>{p.decision || p.status}</span>
                      <span className="opp-sub">{p.thesis_short}</span>
                    </li>
                  ))}
                </ul>
                <label className="opp-check">
                  <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                  I have read these and my thesis says why this time is different.
                </label>
                {err('ack') && <span className="ds-field-error">{problems.ack}</span>}
              </>
            )}
            <p className="opp-note">
              <i className="bi bi-shield-check" aria-hidden="true" /> The investment policy check
              runs when you submit. A hard breach stops the pitch; unfinished required onboarding
              does too.
            </p>
          </>
        )}

        {error && (
          <p className="opp-error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
