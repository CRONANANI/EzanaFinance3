'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  computeTrackRecord,
  getCallStatus,
  getDirection,
  RESOLVABLE_STATUSES,
} from '@/lib/creator-calls';
import { page, shape, type as typeTokens } from './profile-design-tokens';

const EMPTY_FORM = {
  ticker: '',
  direction: 'bullish',
  target_price: '',
  resolves_at: '',
  thesis: '',
};

function StatChip({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 56 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || page.ink }}>{value}</div>
      <div
        style={{
          fontSize: 10,
          color: page.inkMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
    </div>
  );
}

function VoteButton({ active, color, icon, count, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        background: active ? color : 'transparent',
        border: `1px solid ${active ? color : page.border}`,
        color: active ? '#fff' : page.inkSoft,
      }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: 11 }} />
      {count}
    </button>
  );
}

function CallRow({ call, isOwner, onVote, onResolve, busy }) {
  const status = getCallStatus(call.status);
  const dir = getDirection(call.direction);
  const isOpen = call.status === 'open';
  return (
    <li
      style={{
        padding: 12,
        border: `1px solid ${page.border}`,
        borderRadius: 10,
        background: page.surfaceAlt,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: page.ink }}>${call.ticker}</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: dir.color,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <i className={`bi ${dir.icon}`} /> {dir.label}
        </span>
        {call.target_price != null && (
          <span style={{ fontSize: 11, color: page.inkMuted }}>
            → ${Number(call.target_price).toFixed(2)}
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: status.color,
            background: status.soft,
          }}
        >
          {status.label}
        </span>
      </div>

      {call.thesis && (
        <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.45, color: page.inkSoft }}>
          {call.thesis}
        </p>
      )}

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}
      >
        <VoteButton
          active={call.my_vote === 'back'}
          color="#10b981"
          icon="bi-hand-thumbs-up"
          count={call.back_count || 0}
          disabled={busy}
          onClick={() => onVote(call.id, call.my_vote === 'back' ? 'none' : 'back')}
        />
        <VoteButton
          active={call.my_vote === 'fade'}
          color="#ef4444"
          icon="bi-hand-thumbs-down"
          count={call.fade_count || 0}
          disabled={busy}
          onClick={() => onVote(call.id, call.my_vote === 'fade' ? 'none' : 'fade')}
        />
        {call.resolves_at && isOpen && (
          <span style={{ fontSize: 10, color: page.inkMuted, marginLeft: 4 }}>
            by {new Date(call.resolves_at).toLocaleDateString()}
          </span>
        )}

        {isOwner && isOpen && (
          <span style={{ display: 'inline-flex', gap: 6, marginLeft: 'auto' }}>
            {RESOLVABLE_STATUSES.map((s) => {
              const st = getCallStatus(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onResolve(call.id, s)}
                  disabled={busy}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 8,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: busy ? 'default' : 'pointer',
                    background: 'transparent',
                    border: `1px solid ${st.color}`,
                    color: st.color,
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * Verifiable track record + prediction challenges for a creator's profile.
 * Anyone sees the hit rate and calls and can back/fade open ones; the creator
 * (when viewing their own profile) can post new calls and resolve open ones.
 */
export function CreatorTrackRecord({ creatorId, canCreate = false }) {
  const [calls, setCalls] = useState([]);
  const [record, setRecord] = useState(computeTrackRecord([]));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/community/creator-calls?creatorId=${encodeURIComponent(creatorId)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setCalls(data.calls || []);
        setRecord(data.trackRecord || computeTrackRecord(data.calls || []));
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    if (creatorId) load();
  }, [creatorId, load]);

  const vote = async (callId, side) => {
    setBusy(true);
    try {
      const res = await fetch('/api/community/creator-calls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, side }),
      });
      const data = await res.json();
      if (res.ok) {
        setCalls((prev) => prev.map((c) => (c.id === callId ? { ...c, ...data } : c)));
      }
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (callId, status) => {
    setBusy(true);
    try {
      const res = await fetch('/api/community/creator-calls', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId, status }),
      });
      if (res.ok) {
        const next = calls.map((c) => (c.id === callId ? { ...c, status } : c));
        setCalls(next);
        setRecord(computeTrackRecord(next));
      }
    } finally {
      setBusy(false);
    }
  };

  const createCall = async () => {
    if (!form.ticker.trim()) {
      setError('Ticker is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/community/creator-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not post call');
        return;
      }
      const next = [data.call, ...calls];
      setCalls(next);
      setRecord(computeTrackRecord(next));
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    padding: '6px 9px',
    background: page.surface,
    border: `1px solid ${page.border}`,
    borderRadius: 6,
    color: page.ink,
    fontSize: 12,
    fontFamily: typeTokens.sans,
  };

  if (!loading && calls.length === 0 && !canCreate) return null;

  return (
    <div
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: 16,
        fontFamily: typeTokens.sans,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <i className="bi bi-bullseye" style={{ color: '#10b981' }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: page.ink }}>Track record</h3>
        {canCreate && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              background: '#10b981',
              border: 'none',
              color: '#fff',
            }}
          >
            {showForm ? 'Cancel' : 'New call'}
          </button>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 4px',
          marginBottom: 12,
          borderTop: `1px solid ${page.border}`,
          borderBottom: `1px solid ${page.border}`,
        }}
      >
        <StatChip
          label="Hit rate"
          value={record.hitRate != null ? `${record.hitRate}%` : '—'}
          color="#10b981"
        />
        <StatChip label="Hit" value={record.hit} color="#10b981" />
        <StatChip label="Missed" value={record.missed} color="#ef4444" />
        <StatChip label="Open" value={record.open} color="#38bdf8" />
        <StatChip label="Total" value={record.total} />
      </div>

      {showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...inputStyle, width: 90 }}
              placeholder="TICKER"
              value={form.ticker}
              onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
            />
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
            >
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
            </select>
            <input
              style={{ ...inputStyle, width: 90 }}
              placeholder="Target $"
              inputMode="decimal"
              value={form.target_price}
              onChange={(e) => setForm({ ...form, target_price: e.target.value })}
            />
          </div>
          <input
            style={inputStyle}
            type="date"
            value={form.resolves_at}
            onChange={(e) => setForm({ ...form, resolves_at: e.target.value })}
          />
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 52 }}
            placeholder="Thesis (optional)"
            maxLength={280}
            value={form.thesis}
            onChange={(e) => setForm({ ...form, thesis: e.target.value })}
          />
          {error && <div style={{ fontSize: 11, color: '#ef4444' }}>{error}</div>}
          <button
            type="button"
            onClick={createCall}
            disabled={busy}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: busy ? 'default' : 'pointer',
              background: '#10b981',
              border: 'none',
              color: '#fff',
            }}
          >
            {busy ? 'Posting…' : 'Post call'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12, color: page.inkMuted }}>Loading…</div>
      ) : calls.length === 0 ? (
        <div style={{ fontSize: 12, color: page.inkMuted }}>No calls yet.</div>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {calls.map((c) => (
            <CallRow
              key={c.id}
              call={c}
              isOwner={canCreate}
              onVote={vote}
              onResolve={resolve}
              busy={busy}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
