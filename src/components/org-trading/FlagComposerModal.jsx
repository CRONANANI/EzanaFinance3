'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  Flag,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  MOCK_MEMBERS,
  MOCK_TEAMS,
  MOCK_TMT_RESEARCH_PIPELINE,
  getTotalPortfolioValue,
} from '@/lib/orgMockData';
import {
  CONVICTIONS,
  MIN_MESSAGE_CHARS,
  RESPONSE_WINDOWS,
  SUGGESTED_ACTIONS,
  actionLabel,
  benchmarkForSector,
  defaultResponseHoursForConviction,
  reasonsForColor,
} from '@/lib/org-flag-taxonomy';
import { PinnedAttachmentPicker } from './PinnedAttachmentPicker';

const num = (v, digits = 2) =>
  Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** Initials for a small avatar chip. */
function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function RoutedTo({ name, role }) {
  if (!name) return null;
  return (
    <div className="ot-routed-chip">
      <span className="ot-routed-avatar" aria-hidden>
        {initials(name)}
      </span>
      <div>
        <div className="ot-routed-name">{name}</div>
        <div className="ot-routed-role">{role}</div>
      </div>
    </div>
  );
}

const pctText = (v) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`);

/**
 * Header position switcher — flag a different position without closing the
 * modal. The list is whatever the server returned as flaggable (already
 * permission-filtered); this only searches/keyboards over it. Rendered only
 * when there is more than one choice; otherwise the header shows static text.
 */
function PositionSwitcher({ current, book, onSwitch }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return book;
    return book.filter(
      (p) =>
        p.ticker.toLowerCase().includes(q) ||
        (p.sector || '').toLowerCase().includes(q) ||
        (p.analyst || '').toLowerCase().includes(q),
    );
  }, [book, query]);

  useEffect(() => setActiveIdx(0), [query]);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  const choose = (p) => {
    setOpen(false);
    setQuery('');
    onSwitch(p);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIdx]) choose(filtered[activeIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const isCurrent = (p) => p.ticker === current.ticker && p.mockTeamId === current.mockTeamId;

  return (
    <div className="ot-switcher" ref={rootRef}>
      <button
        type="button"
        className="ot-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Switch position — currently ${current.ticker}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ot-ticker-chip ot-num">{current.ticker}</span>
        <span className="ot-switcher-sub">
          {current.sector || ''}
          {current.analyst ? ` · ${current.analyst}` : ''}
          {current.plPct != null && (
            <span className={`ot-num ${current.plPct >= 0 ? 'ot-pos' : 'ot-neg'}`}>
              {' · '}
              {pctText(current.plPct)}
            </span>
          )}
        </span>
        <ChevronDown size={14} aria-hidden />
      </button>

      {open && (
        <div className="ot-switcher-panel">
          <input
            ref={inputRef}
            type="text"
            className="ot-switcher-search"
            placeholder="Search ticker, sector, analyst…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Search positions"
          />
          <ul className="ot-switcher-list" role="listbox">
            {filtered.length === 0 && (
              <li className="ot-switcher-empty">No positions match “{query}”.</li>
            )}
            {filtered.map((p, i) => (
              <li key={`${p.ticker}_${p.mockTeamId}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIdx}
                  className={`ot-switcher-option ${i === activeIdx ? 'is-active' : ''} ${
                    isCurrent(p) ? 'is-current' : ''
                  }`}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => choose(p)}
                >
                  <span className="ot-ticker-chip ot-num">{p.ticker}</span>
                  <span className="ot-switcher-option-meta">
                    {p.sector}
                    {p.analyst ? ` · ${p.analyst}` : ''}
                  </span>
                  <span
                    className={`ot-num ot-switcher-option-pl ${p.plPct >= 0 ? 'ot-pos' : 'ot-neg'}`}
                  >
                    {pctText(p.plPct)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function FlagComposerModal({
  ticker: initialTicker,
  mockTeamId: initialMockTeamId,
  teamDbId: initialTeamDbId,
  position: initialPosition,
  currentMember,
  onClose,
  onSuccess,
}) {
  // Active position — switchable in-place via the header switcher. Everything
  // below (rail, routing, thesis, benchmark) re-derives from these.
  const [active, setActive] = useState({
    ticker: initialTicker,
    mockTeamId: initialMockTeamId,
    teamDbId: initialTeamDbId,
    position: initialPosition,
  });
  const { ticker, mockTeamId, teamDbId, position } = active;
  // ── Derive the read-only dossier (all from the same mock wiring as the desk) ─
  const team = MOCK_TEAMS.find((t) => t.id === mockTeamId) || null;
  const sector = team?.sector || team?.name || position?.sector || null;
  const benchmark = benchmarkForSector(sector);
  const coverage = MOCK_TMT_RESEARCH_PIPELINE.find((r) => r.ticker === ticker) || null;
  const analyst =
    (coverage && MOCK_MEMBERS.find((m) => m.id === coverage.analyst_id)) ||
    MOCK_MEMBERS.find((m) => m.role === 'analyst' && m.team_id === mockTeamId) ||
    null;
  const sectorHead =
    MOCK_MEMBERS.find((m) => m.role === 'portfolio_manager' && m.team_id === mockTeamId) || null;
  const thesis = coverage?.thesis || null;

  // Flagger IS the covering analyst → this is a Thesis Update, not a challenge.
  const isThesisUpdate =
    !!currentMember?.display_name &&
    !!analyst?.name &&
    currentMember.display_name.trim().toLowerCase() === analyst.name.trim().toLowerCase();

  const totalAum = getTotalPortfolioValue();
  const pctAum = totalAum && position?.value ? (position.value / totalAum) * 100 : null;
  const plPct = position?.plPct ?? null;
  const plDollar = position?.pl ?? null;
  const positive = (plPct ?? 0) >= 0;

  // ── Compose state ──────────────────────────────────────────────
  const [flagColor, setFlagColor] = useState('green');
  const [reason, setReason] = useState('');
  const [conviction, setConviction] = useState('med');
  const [action, setAction] = useState('monitor');
  const [message, setMessage] = useState('');
  const [escalate, setEscalate] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [responseHours, setResponseHours] = useState(defaultResponseHoursForConviction('med'));
  const [attachments, setAttachments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const subject = `Position review: ${ticker}`;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [duplicate, setDuplicate] = useState(null); // { existing_flag }

  // Flaggable positions for the switcher — permission-filtered SERVER-SIDE.
  const [book, setBook] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/org-trading/positions')
      .then((r) => (r.ok ? r.json() : { positions: [] }))
      .then((d) => {
        if (!cancelled) setBook(Array.isArray(d.positions) ? d.positions : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // A draft is "dirty" once the user has entered anything worth losing.
  const isDirty =
    !!reason ||
    message.trim().length > 0 ||
    conviction !== 'med' ||
    action !== 'monitor' ||
    escalate ||
    conflict ||
    evidence.length > 0 ||
    attachments.length > 0;

  // Switch to another position — warns before discarding a draft, then resets
  // the whole composer. conflict_disclosed is ticker-specific, so it resets and
  // the conflict check re-runs against the new ticker.
  const switchTo = (item) => {
    if (!item || (item.ticker === ticker && item.mockTeamId === mockTeamId)) return;
    if (
      isDirty &&
      typeof window !== 'undefined' &&
      !window.confirm(
        `Discard this draft flag? Your reason, message, and evidence for ${ticker} will be cleared.`,
      )
    ) {
      return;
    }
    setActive({
      ticker: item.ticker,
      mockTeamId: item.mockTeamId,
      teamDbId: item.teamDbId ?? null,
      position: item.position,
    });
    setFlagColor('green');
    setReason('');
    setConviction('med');
    setAction('monitor');
    setMessage('');
    setEscalate(false);
    setConflict(false);
    setResponseHours(defaultResponseHoursForConviction('med'));
    setAttachments([]);
    setEvidence([]);
    setError(null);
    setDuplicate(null);
  };

  const reasonOptions = useMemo(() => reasonsForColor(flagColor), [flagColor]);
  const messageLen = message.trim().length;
  const messageOk = messageLen >= MIN_MESSAGE_CHARS;
  const isRed = flagColor === 'red';
  const accentClass = isRed ? 'red' : 'green';

  // Selecting a color invalidates a reason from the other color.
  const pickColor = (color) => {
    setFlagColor(color);
    setReason('');
  };

  // Conviction defaults the response deadline.
  const pickConviction = (c) => {
    setConviction(c);
    setResponseHours(defaultResponseHoursForConviction(c));
  };

  const addChartSnapshot = () => {
    if (evidence.some((e) => e.type === 'chart')) return;
    setEvidence((prev) => [
      ...prev,
      { type: 'chart', ref: ticker, caption: `${ticker} price chart` },
    ]);
  };

  const hasEvidence = attachments.length > 0 || evidence.length > 0;
  const softNudge = isRed && conviction === 'high' && !hasEvidence;

  const ctaLabel = isThesisUpdate
    ? `Post Thesis Update → ${actionLabel(action)}`
    : `Raise ${isRed ? 'Red' : 'Green'} Flag → ${actionLabel(action)}`;

  const submit = async (allowDuplicate = false) => {
    setError(null);
    if (!reason) {
      setError('Choose a reason.');
      return;
    }
    if (!messageOk) {
      setError(`Message must be at least ${MIN_MESSAGE_CHARS} characters.`);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/org-trading/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          mock_team_id: mockTeamId,
          team_id: teamDbId || null,
          flag_color: flagColor,
          subject,
          body: message,
          reason,
          conviction,
          suggested_action: action,
          escalate_to_ic: escalate,
          conflict_disclosed: conflict,
          response_hours: responseHours,
          allow_duplicate: allowDuplicate,
          position_snapshot: {
            shares: position?.shares,
            avg_cost: position?.avg_cost,
            current_price: position?.current_price,
            sector,
          },
          attachments,
          evidence,
        }),
      });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        setDuplicate(data.existing_flag || {});
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onSuccess?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Duplicate interstitial ─────────────────────────────────────
  if (duplicate) {
    return (
      <div className="ot-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="ot-modal" style={{ maxWidth: 460 }}>
          <div className="ot-modal-header">
            <h2 className="ot-modal-title">{ticker} already has an open flag</h2>
            <button type="button" aria-label="Close" className="ot-modal-close" onClick={onClose}>
              <X size={18} aria-hidden />
            </button>
          </div>
          <p className="ot-dossier-muted" style={{ marginBottom: '1rem' }}>
            An open flag on <strong>{ticker}</strong> already exists in the council
            {duplicate.subject ? ` — “${duplicate.subject}”` : ''}. You can raise a separate flag,
            or cancel and respond to the existing one.
          </p>
          <div className="ot-modal-footer">
            <button type="button" className="ot-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="ot-btn-primary"
              disabled={isSubmitting}
              onClick={() => {
                setDuplicate(null);
                submit(true);
              }}
            >
              Raise a separate flag
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ot-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ot-modal ot-modal-dossier">
        <div className="ot-modal-header">
          <div className="ot-dossier-title">
            <Flag size={16} className={`ot-flag-icon ${accentClass}`} aria-hidden />
            <h2 className="ot-modal-title">{isThesisUpdate ? 'Thesis Update' : 'Flag Position'}</h2>
            {book.length > 1 ? (
              <PositionSwitcher
                current={{ ticker, sector, analyst: analyst?.name, plPct, mockTeamId }}
                book={book}
                onSwitch={switchTo}
              />
            ) : (
              <>
                <span className="ot-ticker-chip ot-num">{ticker}</span>
                <span className="ot-dossier-sub">
                  {sector ? `· ${sector}` : ''} {analyst ? `· ${analyst.name}` : ''}
                </span>
              </>
            )}
          </div>
          <button type="button" aria-label="Close" className="ot-modal-close" onClick={onClose}>
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="ot-dossier-grid">
          {/* ── LEFT RAIL — the case being challenged (READ-ONLY) ── */}
          <aside className="ot-dossier-rail">
            <div className={`ot-dossier-pl ${positive ? 'pos' : 'neg'}`}>
              <div className="ot-dossier-pl-head">
                {positive ? (
                  <TrendingUp size={16} aria-hidden />
                ) : (
                  <TrendingDown size={16} aria-hidden />
                )}
                <span className="ot-num">
                  {plPct == null ? '—' : `${positive ? '▲' : '▼'} ${num(Math.abs(plPct), 1)}%`}
                </span>
              </div>
              <div className="ot-dossier-pl-dollar ot-num">
                {plDollar == null
                  ? '—'
                  : `${plDollar >= 0 ? '+' : '−'}$${num(Math.abs(plDollar), 0)}`}
              </div>
              <div className="ot-dossier-pl-bench ot-num">
                {benchmark ? `vs ${benchmark}` : 'no benchmark'}
              </div>
            </div>

            <div className="ot-dossier-stats">
              <div className="ot-dossier-stat">
                <span className="ot-dossier-stat-label">Shares</span>
                <span className="ot-dossier-stat-value ot-num">
                  {position?.shares != null ? num(position.shares, 0) : '—'}
                </span>
              </div>
              <div className="ot-dossier-stat">
                <span className="ot-dossier-stat-label">% of AUM</span>
                <span className="ot-dossier-stat-value ot-num">
                  {pctAum == null ? '—' : `${num(pctAum, 1)}%`}
                </span>
              </div>
              <div className="ot-dossier-stat">
                <span className="ot-dossier-stat-label">Held</span>
                <span className="ot-dossier-stat-value ot-num">—</span>
              </div>
              <div className="ot-dossier-stat">
                <span className="ot-dossier-stat-label">Cost</span>
                <span className="ot-dossier-stat-value ot-num">
                  {position?.avg_cost != null ? `$${num(position.avg_cost)}` : '—'}
                </span>
              </div>
            </div>

            <div className="ot-dossier-thesis">
              <span className="ot-form-label">Thesis</span>
              {thesis ? (
                <p className="ot-dossier-thesis-text">“{thesis}”</p>
              ) : (
                <p className="ot-dossier-muted">No pitch thesis on file for {ticker}.</p>
              )}
            </div>

            {conflict && (
              <div className="ot-banner amber">
                <AlertTriangle size={13} aria-hidden />
                <span>
                  Conflict disclosed — you hold {ticker} personally. This is recorded on the flag.
                </span>
              </div>
            )}

            <div className="ot-dossier-evidence">
              <span className="ot-form-label">Evidence</span>
              <PinnedAttachmentPicker
                ticker={ticker}
                selected={attachments}
                onChange={setAttachments}
              />
              <button
                type="button"
                className="ot-dossier-evidence-btn"
                onClick={addChartSnapshot}
                disabled={evidence.some((e) => e.type === 'chart')}
              >
                <Camera size={13} aria-hidden />
                {evidence.some((e) => e.type === 'chart')
                  ? 'Chart snapshot attached'
                  : 'Chart snapshot'}
              </button>
            </div>

            <div className="ot-dossier-routes">
              <span className="ot-form-label">Routes to</span>
              <RoutedTo name={analyst?.name} role={analyst?.sub_role || 'Covering analyst'} />
              <RoutedTo name={sectorHead?.name} role={sectorHead?.sub_role || 'Sector head'} />
            </div>
          </aside>

          {/* ── RIGHT COLUMN — compose ── */}
          <section className="ot-dossier-compose">
            <div className="ot-form-group">
              <span className="ot-form-label">Flag type</span>
              <div className="ot-flag-color-row">
                <button
                  type="button"
                  className={`ot-flag-color-btn ${flagColor === 'green' ? 'is-selected green' : ''}`}
                  onClick={() => pickColor('green')}
                >
                  <Flag size={14} aria-hidden />
                  <span>
                    Green
                    <small>Thesis strengthening</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`ot-flag-color-btn ${flagColor === 'red' ? 'is-selected red' : ''}`}
                  onClick={() => pickColor('red')}
                >
                  <Flag size={14} aria-hidden />
                  <span>
                    Red
                    <small>Thesis at risk</small>
                  </span>
                </button>
              </div>
            </div>

            <div className="ot-form-group">
              <label className="ot-form-label" htmlFor="ot-flag-reason">
                Reason
              </label>
              <select
                id="ot-flag-reason"
                className="ot-form-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                <option value="">Select a reason…</option>
                {reasonOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ot-form-group">
              <span className="ot-form-label">Conviction</span>
              <div className="ot-seg-row">
                {CONVICTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`ot-seg ${conviction === c.value ? 'is-selected' : ''} ${
                      c.value === 'high' ? 'high' : ''
                    }`}
                    onClick={() => pickConviction(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ot-form-group">
              <label className="ot-form-label" htmlFor="ot-flag-action">
                Suggested action
              </label>
              <select
                id="ot-flag-action"
                className="ot-form-select"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {SUGGESTED_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ot-form-group">
              <label className="ot-form-label" htmlFor="ot-flag-message">
                Message
              </label>
              <textarea
                id="ot-flag-message"
                className="ot-form-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  isRed
                    ? 'Defend or dispute the thesis with specifics — what changed and why it matters.'
                    : 'What confirms the thesis? Be specific about the new information.'
                }
              />
              <div className={`ot-char-hint ${messageOk ? 'ok' : ''}`}>
                {messageLen}/{MIN_MESSAGE_CHARS} min
              </div>
            </div>

            <div className="ot-form-row">
              <label className="ot-check">
                <input
                  type="checkbox"
                  checked={escalate}
                  onChange={(e) => setEscalate(e.target.checked)}
                />
                Escalate to IC
              </label>
              <div className="ot-inline-select">
                <label className="ot-form-label" htmlFor="ot-flag-due">
                  Response due
                </label>
                <select
                  id="ot-flag-due"
                  className="ot-form-select"
                  value={responseHours}
                  onChange={(e) => setResponseHours(Number(e.target.value))}
                >
                  {RESPONSE_WINDOWS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="ot-check">
              <input
                type="checkbox"
                checked={conflict}
                onChange={(e) => setConflict(e.target.checked)}
              />
              I hold {ticker} personally (disclose conflict)
            </label>

            {softNudge && (
              <div className="ot-banner amber" style={{ marginTop: '0.75rem' }}>
                <AlertTriangle size={13} aria-hidden />
                <span>
                  Red flags at high conviction are taken seriously. Can you attach something?
                </span>
              </div>
            )}

            {error && (
              <div className="ot-banner red" style={{ marginTop: '0.75rem' }}>
                {error}
              </div>
            )}
          </section>
        </div>

        <div className="ot-modal-footer ot-dossier-footer">
          <span className="ot-dossier-footnote">
            Recorded on the position · public within the org
          </span>
          <div className="ot-dossier-footer-actions">
            <button type="button" className="ot-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={`ot-btn-primary ot-cta-${accentClass}`}
              onClick={() => submit(false)}
              disabled={isSubmitting || !reason || !messageOk}
            >
              {isSubmitting ? 'Raising…' : ctaLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
