'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { getMemberByEmail, MOCK_TEAMS } from '@/lib/orgMockData';

const STEPS = ['Identity', 'Thesis', 'Attachments', 'Review'];

export function PitchComposer({ open, onClose, onCreated }) {
  const { orgData } = useOrg();
  const viewer = getMemberByEmail(orgData?.member?.email) || { team_id: 't7', id: 'm10' };

  const [step, setStep] = useState(0);
  const [ticker, setTicker] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [companyName, setCompanyName] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [pitchType, setPitchType] = useState('long');
  const [horizon, setHorizon] = useState('12m');
  const [targetPrice, setTargetPrice] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [thesisShort, setThesisShort] = useState('');
  const [thesisFull, setThesisFull] = useState('');
  const [whyNow, setWhyNow] = useState('');
  const [catalysts, setCatalysts] = useState(['']);
  const [risks, setRisks] = useState(['']);
  const [priors, setPriors] = useState([]);
  const [priorsAck, setPriorsAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(0);
      setTicker('');
      setPriors([]);
      setPriorsAck(false);
      setError('');
    }
  }, [open]);

  const loadPriors = useCallback(async (sym) => {
    if (!sym || sym.length < 1) {
      setPriors([]);
      return;
    }
    const res = await fetch(`/api/org/archive/by-ticker/${encodeURIComponent(sym)}`);
    const data = await res.json();
    setPriors(data.priors || []);
    setPriorsAck((data.priors || []).length === 0);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (ticker.length >= 1) loadPriors(ticker);
    }, 400);
    return () => clearTimeout(t);
  }, [ticker, loadPriors]);

  const searchTicker = async (q) => {
    setTicker(q.toUpperCase());
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const res = await fetch(`/api/org/symbol-search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data.results || []);
  };

  const pickSymbol = async (sym, name) => {
    setTicker(sym);
    setCompanyName(name || sym);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/market-data?ticker=${encodeURIComponent(sym)}`);
      const data = await res.json();
      const price = data.quote?.price ?? data.quote?.c;
      if (price) setCurrentPrice(String(price));
    } catch {
      /* optional */
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/org/pitches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          company_name: companyName,
          pitch_type: pitchType,
          time_horizon: horizon,
          target_price: parseFloat(targetPrice),
          expected_return_pct: parseFloat(expectedReturn),
          current_price_at_submission: parseFloat(currentPrice) || null,
          thesis_short: thesisShort,
          thesis_full: thesisFull,
          why_now: whyNow,
          catalysts: catalysts.filter(Boolean),
          risks: risks.filter(Boolean),
          team_id: viewer.team_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      onCreated?.(data.pitch);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const teamName = MOCK_TEAMS.find((t) => t.id === viewer.team_id)?.name;

  return (
    <div className="op-modal-overlay" onClick={onClose} role="presentation">
      <div className="op-modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="op-modal-header">
          <h2>Submit New Pitch</h2>
          <button type="button" className="op-modal-close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="op-stepper">
          {STEPS.map((s, i) => (
            <span key={s} className={`op-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              {i + 1}. {s}
            </span>
          ))}
        </div>

        {priors.length > 0 && step >= 1 && (
          <div className="op-priors-box">
            <strong>Prior pitches on {ticker}</strong>
            <ul>
              {priors.map((p) => (
                <li key={p.id}>
                  {p.decision_at ? new Date(p.decision_at).toLocaleDateString() : '?'} —{' '}
                  {p.decision || p.status}: {p.thesis_short?.slice(0, 80)}…
                </li>
              ))}
            </ul>
            <label className="op-check">
              <input
                type="checkbox"
                checked={priorsAck}
                onChange={(e) => setPriorsAck(e.target.checked)}
              />
              I have reviewed prior pitches and addressed why this time is different
            </label>
          </div>
        )}

        {step === 0 && (
          <div className="op-form">
            <label>
              Ticker
              <input
                value={ticker}
                onChange={(e) => searchTicker(e.target.value)}
                placeholder="e.g. NVDA"
              />
            </label>
            {searchResults.length > 0 && (
              <div className="op-search-dropdown">
                {searchResults.map((s) => (
                  <button
                    key={s.symbol}
                    type="button"
                    onClick={() => pickSymbol(s.symbol, s.name || s.companyName)}
                  >
                    {s.symbol} — {s.name || s.companyName}
                  </button>
                ))}
              </div>
            )}
            <label>
              Company
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </label>
            <div className="op-form-row">
              <label>
                Type
                <select value={pitchType} onChange={(e) => setPitchType(e.target.value)}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                  <option value="pair">Pair</option>
                  <option value="options">Options</option>
                </select>
              </label>
              <label>
                Horizon
                <select value={horizon} onChange={(e) => setHorizon(e.target.value)}>
                  <option value="1m">1m</option>
                  <option value="3m">3m</option>
                  <option value="6m">6m</option>
                  <option value="12m">12m</option>
                  <option value="24m">24m</option>
                  <option value="long-term">Long-term</option>
                </select>
              </label>
            </div>
            <div className="op-form-row">
              <label>
                Target price
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                />
              </label>
              <label>
                Expected return %
                <input
                  type="number"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(e.target.value)}
                />
              </label>
              <label>
                Current price
                <input
                  type="number"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                />
              </label>
            </div>
            {teamName && <p className="op-hint">Sector team: {teamName}</p>}
          </div>
        )}

        {step === 1 && (
          <div className="op-form">
            <label>
              Short thesis (headline)
              <input
                maxLength={140}
                value={thesisShort}
                onChange={(e) => setThesisShort(e.target.value)}
                placeholder="One-line thesis"
              />
              <span className="op-char-count">{thesisShort.length}/140</span>
            </label>
            <label>
              Full thesis
              <textarea
                rows={4}
                value={thesisFull}
                onChange={(e) => setThesisFull(e.target.value)}
              />
            </label>
            <label>
              Why now
              <textarea rows={3} value={whyNow} onChange={(e) => setWhyNow(e.target.value)} />
            </label>
            <label>Catalysts</label>
            {catalysts.map((c, i) => (
              <input
                key={i}
                value={c}
                onChange={(e) => {
                  const next = [...catalysts];
                  next[i] = e.target.value;
                  setCatalysts(next);
                }}
                placeholder={`Catalyst ${i + 1}`}
              />
            ))}
            <button
              type="button"
              className="op-btn op-btn--ghost"
              onClick={() => setCatalysts([...catalysts, ''])}
            >
              + Catalyst
            </button>
            <label>Risks</label>
            {risks.map((r, i) => (
              <input
                key={i}
                value={r}
                onChange={(e) => {
                  const next = [...risks];
                  next[i] = e.target.value;
                  setRisks(next);
                }}
                placeholder={`Risk ${i + 1}`}
              />
            ))}
            <button
              type="button"
              className="op-btn op-btn--ghost"
              onClick={() => setRisks([...risks, ''])}
            >
              + Risk
            </button>
          </div>
        )}

        {step === 2 && (
          <p className="op-hint">
            Preliminary files can be added after submission from the pitch detail Deliverables tab.
          </p>
        )}

        {step === 3 && (
          <div className="op-review">
            <p>
              <strong>{ticker}</strong> · {pitchType} · {horizon} · Target ${targetPrice}
            </p>
            <p>{thesisShort}</p>
          </div>
        )}

        {error && <p className="op-error">{error}</p>}

        <div className="op-modal-footer">
          {step > 0 && (
            <button
              type="button"
              className="op-btn op-btn--ghost"
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="op-btn"
              disabled={step === 0 && !ticker}
              onClick={() => setStep(step + 1)}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="op-btn"
              disabled={submitting || !thesisShort || (priors.length > 0 && !priorsAck)}
              onClick={handleSubmit}
            >
              {submitting ? 'Submitting…' : 'Submit pitch'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
