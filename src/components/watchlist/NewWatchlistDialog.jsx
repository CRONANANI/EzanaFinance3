'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Sparkles, Search, Bell, Check } from 'lucide-react';
import { CompanySearch } from '@/components/research/CompanySearch';
import { getThemeSuggestions } from '@/lib/watchlist-suggestions';
import './new-watchlist-dialog.css';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#10b981', '#8b5cf6', '#ec4899',
];

/**
 * Extract an exchange code (NYSE / NASDAQ / other) from a Finnhub symbol
 * search result. Finnhub US-listed symbols have no `.XX` suffix and carry a
 * `displaySymbol` equal to `symbol`. Non-US symbols look like `AAPL.MX`.
 */
function resolveExchange(result) {
  const sym = result.symbol || result.displaySymbol || '';
  if (sym.includes('.')) return 'OTHER';
  const hay = `${result.description || ''} ${result.mic || ''}`.toUpperCase();
  if (hay.includes('NASDAQ') || hay.includes('XNAS')) return 'NASDAQ';
  if (hay.includes('NYSE') || hay.includes('XNYS')) return 'NYSE';
  return 'NASDAQ';
}

export function NewWatchlistDialog({ open, onOpenChange, onCreated, createList, addItem }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[5]);
  const [alertsOn, setAlertsOn] = useState(false);
  const [tickers, setTickers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const t = setTimeout(() => nameInputRef.current?.focus(), 40);
    return () => {
      clearTimeout(t);
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
        previouslyFocused.current.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onOpenChange(false);
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!name.trim()) {
      setSuggestions([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingSuggestions(true);
    const t = setTimeout(async () => {
      try {
        const results = await getThemeSuggestions(name);
        if (cancelled) return;
        setSuggestions(
          (results || []).filter((r) => r.exchange === 'NYSE' || r.exchange === 'NASDAQ'),
        );
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [name]);

  useEffect(() => {
    if (open) return;
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[5]);
    setAlertsOn(false);
    setTickers([]);
    setSuggestions([]);
    setSubmitting(false);
    setSubmitError(null);
  }, [open]);

  const addTicker = useCallback((t) => {
    if (!t?.symbol) return;
    if (t.exchange && t.exchange !== 'NYSE' && t.exchange !== 'NASDAQ') return;
    setTickers((prev) => (prev.some((x) => x.symbol === t.symbol) ? prev : [...prev, t]));
  }, []);

  const removeTicker = useCallback((symbol) => {
    setTickers((prev) => prev.filter((t) => t.symbol !== symbol));
  }, []);

  const canSubmit = name.trim().length > 0 && tickers.length > 0 && !submitting;

  const handleCreate = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createList?.(name.trim());
      if (!res?.ok || !res.listId) {
        throw new Error(res?.reason || 'Failed to create watchlist');
      }
      const itemResults = await Promise.all(
        tickers.map((t) =>
          addItem?.(res.listId, {
            type: 'stock',
            ticker: t.symbol,
            name: t.name || t.symbol,
            sector: t.sector || '',
            metadata: {
              exchange: t.exchange,
              color,
              alertsEnabled: alertsOn,
              description: description.trim() || undefined,
            },
          }),
        ),
      );

      const failed = itemResults.filter((r) => r && r.ok === false);
      if (failed.length === itemResults.length && itemResults.length > 0) {
        throw new Error(
          failed[0]?.reason ||
            'Watchlist was created but no tickers could be added.',
        );
      }
      if (failed.length > 0) {
        setSubmitError(
          `Added ${itemResults.length - failed.length} of ${itemResults.length} tickers. ${failed[0]?.reason || ''}`.trim(),
        );
      }

      // Persist per-list alert/color/description preferences locally so the
      // watchlist price-alerts monitor can see them without an API change.
      try {
        const raw = window.localStorage.getItem('ezana.watchlistPrefs') || '{}';
        const prefs = JSON.parse(raw);
        prefs[res.listId] = {
          alertsEnabled: !!alertsOn,
          color,
          description: description.trim() || '',
          updatedAt: new Date().toISOString(),
        };
        window.localStorage.setItem('ezana.watchlistPrefs', JSON.stringify(prefs));
      } catch {
        /* localStorage may be disabled — non-fatal */
      }

      onCreated?.(res.listId);
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e?.message || 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, createList, addItem, name, tickers, color, alertsOn, description, onCreated, onOpenChange]);

  const handleSearchSelect = useCallback(
    (result) => {
      if (!result?.symbol) return;
      const sym = result.symbol.toUpperCase();
      if (sym.includes('.')) return;
      const exchange = resolveExchange(result);
      if (exchange !== 'NYSE' && exchange !== 'NASDAQ') return;
      addTicker({
        symbol: sym,
        name: result.name || result.description || sym,
        exchange,
      });
    },
    [addTicker],
  );

  const heading = useMemo(() => {
    if (name.trim()) return `Suggestions for "${name.trim()}"`;
    return 'Suggestions';
  }, [name]);

  if (!open) return null;
  if (typeof window === 'undefined') return null;

  const modal = (
    <div
      className="nwd-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nwd-title"
        className="nwd-dialog"
      >
        <header className="nwd-header">
          <div>
            <h2 id="nwd-title" className="nwd-title">Create a new watchlist</h2>
            <p className="nwd-sub">Name your list, add companies, and get suggestions based on your theme.</p>
          </div>
          <button
            type="button"
            className="nwd-close"
            aria-label="Close dialog"
            onClick={() => onOpenChange(false)}
          >
            <X size={18} />
          </button>
        </header>

        <div className="nwd-body">
          {/* 1 ── Watchlist name */}
          <div className="nwd-field">
            <label className="nwd-label" htmlFor="nwd-name">Watchlist name</label>
            <input
              id="nwd-name"
              ref={nameInputRef}
              type="text"
              className="nwd-input"
              placeholder={'e.g. "AI Leaders", "Dividend Kings", "Green Energy"'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoComplete="off"
            />
          </div>

          {/* 2 ── Search for a company (moved up — under name) */}
          <div className="nwd-field">
            <label className="nwd-label nwd-label-inline"><Search size={14} /> Search for a company</label>
            <div className="nwd-search-wrap">
              <CompanySearch
                placeholder="Search by ticker or company name…"
                onSelect={handleSearchSelect}
              />
              <div className="nwd-hint nwd-hint-muted">Results are filtered to NYSE &amp; NASDAQ listings.</div>
            </div>
          </div>

          {/* 3 ── Suggestions (only when name has content) */}
          {name.trim() && (
            <div className="nwd-field">
              <div className="nwd-label nwd-label-row">
                <span className="nwd-label-inline"><Sparkles size={14} /> {heading}</span>
                <span className="nwd-hint">NYSE &amp; NASDAQ only</span>
              </div>
              {loadingSuggestions ? (
                <div className="nwd-muted">Finding matches…</div>
              ) : suggestions.length === 0 ? (
                <div className="nwd-muted">
                  No matches yet — try keywords like <em>AI</em>, <em>dividends</em>, <em>clean energy</em>, <em>chips</em>, or <em>defense</em>.
                </div>
              ) : (
                <div className="nwd-suggestions">
                  {suggestions.map((s) => {
                    const added = tickers.some((t) => t.symbol === s.symbol);
                    const chgCls = s.changePct == null ? '' : s.changePct >= 0 ? 'up' : 'down';
                    return (
                      <div key={s.symbol} className="nwd-sug-row">
                        <div className="nwd-sug-main">
                          <span className="nwd-sug-sym">{s.symbol}</span>
                          <span className="nwd-sug-name" title={s.name}>{s.name}</span>
                          <span className={`nwd-badge nwd-badge-${s.exchange.toLowerCase()}`}>{s.exchange}</span>
                          {s.sector && <span className="nwd-sug-sector">{s.sector}</span>}
                        </div>
                        <div className="nwd-sug-side">
                          {typeof s.price === 'number' && (
                            <span className="nwd-sug-price">${s.price.toFixed(2)}</span>
                          )}
                          {s.changePct != null && (
                            <span className={`nwd-sug-chg ${chgCls}`}>
                              {s.changePct >= 0 ? '+' : ''}{s.changePct.toFixed(2)}%
                            </span>
                          )}
                          <button
                            type="button"
                            className={`nwd-sug-add ${added ? 'added' : ''}`}
                            disabled={added}
                            onClick={() => addTicker(s)}
                          >
                            {added ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4 ── Added companies */}
          <div className="nwd-field">
            <div className="nwd-label-row">
              <span className="nwd-label">Added companies</span>
              <span className="nwd-count">
                {tickers.length} {tickers.length === 1 ? 'company' : 'companies'}
              </span>
            </div>
            {tickers.length === 0 ? (
              <div className="nwd-empty">
                No companies added yet — search above or pick from suggestions.
              </div>
            ) : (
              <div className="nwd-chips">
                {tickers.map((t) => (
                  <div key={t.symbol} className="nwd-chip">
                    <span className="nwd-chip-sym">{t.symbol}</span>
                    <span className="nwd-chip-name" title={t.name}>{t.name}</span>
                    {t.exchange && (
                      <span className={`nwd-badge nwd-badge-${t.exchange.toLowerCase()}`}>{t.exchange}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeTicker(t.symbol)}
                      aria-label={`Remove ${t.symbol}`}
                      className="nwd-chip-x"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5 ── Color tag (moved down) */}
          <div className="nwd-field">
            <label className="nwd-label">Color tag</label>
            <div className="nwd-colors">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Select color ${c}`}
                  aria-pressed={color === c}
                  className={`nwd-color ${color === c ? 'on' : ''}`}
                  style={{ background: c }}
                >
                  {color === c && <Check size={12} color="#fff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* 6 ── Notes */}
          <div className="nwd-field">
            <label className="nwd-label" htmlFor="nwd-notes">Notes (optional)</label>
            <textarea
              id="nwd-notes"
              className="nwd-textarea"
              placeholder="What's this watchlist for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={2}
            />
            <div className="nwd-count nwd-count-right">{description.length}/200</div>
          </div>

          <label className="nwd-alert">
            <input
              type="checkbox"
              checked={alertsOn}
              onChange={(e) => setAlertsOn(e.target.checked)}
            />
            <Bell size={14} />
            <span>Notify me on major price moves (±5%)</span>
          </label>

          {submitError && <div className="nwd-error">{submitError}</div>}
        </div>

        <footer className="nwd-footer">
          <button
            type="button"
            className="nwd-btn nwd-btn-ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="nwd-btn nwd-btn-primary"
            onClick={handleCreate}
            disabled={!canSubmit}
          >
            {submitting ? 'Creating…' : 'Create Watchlist'}
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
