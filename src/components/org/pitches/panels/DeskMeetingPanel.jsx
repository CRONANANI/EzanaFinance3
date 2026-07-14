'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users,
  ShieldCheck,
  Scale,
  TrendingDown,
  TrendingUp,
  Percent,
  CalendarDays,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';

/**
 * DeskMeetingPanel (spec §5.2, §2.4) — the deep_dive desk meeting artifact.
 *
 * A structured meeting record, NOT a checkbox: attendees, compliance notes,
 * sector weight, headwinds, tailwinds, proposed sizing, decision. When a meeting
 * has been logged it renders read-only; otherwise eligible viewers (desk PM /
 * exec) get the [Log Desk Meeting] form. The gate `desk_meeting_logged` passes
 * once a row exists with held_at set AND >= 3 attendees.
 *
 * @param {object}   props
 * @param {object}   props.pitch      the pitch (needs id; may carry a members list)
 * @param {object}   [props.viewer]   current member { id, role, ... }
 * @param {Function} [props.onRefresh] called after a successful log
 */
const ELIGIBLE_ROLES = ['portfolio_manager', 'executive'];
const DECISION_LABELS = { advance: 'Advance', more_work: 'More work', kill: 'Kill' };

export function DeskMeetingPanel({ pitch, viewer, onRefresh }) {
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Members list is optional. When the pitch carries one we render a real
  // multi-select of attendees; otherwise we fall back to an ID-list textarea so
  // the control is still functional (no dead UI).
  const members = useMemo(
    () => pitch?.members || pitch?.org_members || pitch?.desk_members || [],
    [pitch],
  );
  const hasMemberList = Array.isArray(members) && members.length > 0;
  const nameOf = useCallback(
    (id) => members.find((m) => m.id === id)?.display_name || id,
    [members],
  );

  const eligible = ELIGIBLE_ROLES.includes(viewer?.role);

  // Form state
  const [heldAt, setHeldAt] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [idText, setIdText] = useState('');
  const [complianceNotes, setComplianceNotes] = useState('');
  const [sectorWeightNotes, setSectorWeightNotes] = useState('');
  const [headwinds, setHeadwinds] = useState('');
  const [tailwinds, setTailwinds] = useState('');
  const [sizing, setSizing] = useState('');
  const [decision, setDecision] = useState('');

  const load = useCallback(() => {
    if (!pitch?.id) return;
    setLoading(true);
    fetch(`/api/org/pitches/${pitch.id}/desk-meeting`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMeeting(d?.meeting || null))
      .catch(() => setMeeting(null))
      .finally(() => setLoading(false));
  }, [pitch?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const attendeeIds = hasMemberList
    ? selectedIds
    : idText
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

  const toggleMember = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const canSubmit =
    !!heldAt &&
    attendeeIds.length >= 3 &&
    complianceNotes.trim() &&
    sectorWeightNotes.trim() &&
    headwinds.trim() &&
    tailwinds.trim() &&
    sizing !== '' &&
    !Number.isNaN(Number(sizing));

  const submit = async () => {
    setError(null);
    if (!canSubmit) {
      setError('Complete every field and add at least 3 attendees.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/org/pitches/${pitch.id}/desk-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          held_at: new Date(heldAt).toISOString(),
          attendee_ids: attendeeIds,
          compliance_notes: complianceNotes.trim(),
          sector_weight_notes: sectorWeightNotes.trim(),
          headwinds: headwinds.trim(),
          tailwinds: tailwinds.trim(),
          proposed_sizing_pct: Number(sizing),
          decision: decision || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMeeting(data.meeting);
      setShowForm(false);
      onRefresh?.(data.meeting);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pdmeet pdmeet--loading">
        <Loader2 size={14} className="pdmeet-spin" aria-hidden /> Loading desk meeting…
      </div>
    );
  }

  // ── Logged → read-only record ──────────────────────────────────────────────
  if (meeting) {
    const attendees = Array.isArray(meeting.attendee_ids) ? meeting.attendee_ids : [];
    const fmtDate = meeting.held_at
      ? new Date(meeting.held_at).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '—';
    return (
      <section className="pdmeet" aria-label="Desk meeting">
        <header className="pdmeet-head">
          <h3 className="pdmeet-title">
            <ClipboardCheck size={15} aria-hidden /> Desk meeting logged
          </h3>
          <span className="pdmeet-badge">
            <CalendarDays size={12} aria-hidden /> <span className="pdmeet-num">{fmtDate}</span>
          </span>
        </header>

        <div className="pdmeet-meta">
          <span className="pdmeet-metaitem">
            <Users size={13} aria-hidden />
            <span className="pdmeet-num">{attendees.length}</span> attendees
          </span>
          {meeting.proposed_sizing_pct != null && (
            <span className="pdmeet-metaitem">
              <Percent size={13} aria-hidden />
              Proposed sizing{' '}
              <span className="pdmeet-num">{Number(meeting.proposed_sizing_pct)}%</span>
            </span>
          )}
          {meeting.decision && (
            <span className={`pdmeet-decision pdmeet-decision--${meeting.decision}`}>
              {DECISION_LABELS[meeting.decision] || meeting.decision}
            </span>
          )}
        </div>

        {hasMemberList && attendees.length > 0 && (
          <ul className="pdmeet-attendees">
            {attendees.map((id) => (
              <li key={id} className="pdmeet-chip">
                {nameOf(id)}
              </li>
            ))}
          </ul>
        )}

        <dl className="pdmeet-fields">
          <Field icon={ShieldCheck} label="Compliance notes" value={meeting.compliance_notes} />
          <Field icon={Scale} label="Sector weight" value={meeting.sector_weight_notes} />
          <Field icon={TrendingDown} label="Headwinds" value={meeting.headwinds} />
          <Field icon={TrendingUp} label="Tailwinds" value={meeting.tailwinds} />
          {meeting.notes && <Field icon={ClipboardCheck} label="Notes" value={meeting.notes} />}
        </dl>
      </section>
    );
  }

  // ── Unlogged, viewer not eligible → informational only ─────────────────────
  if (!eligible && !showForm) {
    return (
      <section className="pdmeet pdmeet--empty" aria-label="Desk meeting">
        <ClipboardCheck size={16} aria-hidden />
        <p>
          No desk meeting logged yet. A desk PM or executive must record it before this pitch can
          advance.
        </p>
      </section>
    );
  }

  // ── Unlogged, eligible → [Log Desk Meeting] CTA / form ─────────────────────
  if (!showForm) {
    return (
      <section className="pdmeet pdmeet--empty" aria-label="Desk meeting">
        <ClipboardCheck size={16} aria-hidden />
        <p>
          No desk meeting logged yet. Record the structured meeting to clear the deep-dive gate.
        </p>
        <button type="button" className="pdmeet-cta" onClick={() => setShowForm(true)}>
          Log Desk Meeting
        </button>
      </section>
    );
  }

  return (
    <section className="pdmeet" aria-label="Log desk meeting">
      <header className="pdmeet-head">
        <h3 className="pdmeet-title">
          <ClipboardCheck size={15} aria-hidden /> Log desk meeting
        </h3>
      </header>

      <div className="pdmeet-form">
        <label className="pdmeet-label">
          <span>
            <CalendarDays size={12} aria-hidden /> Meeting date &amp; time
          </span>
          <input
            type="datetime-local"
            className="pdmeet-input pdmeet-num"
            value={heldAt}
            onChange={(e) => setHeldAt(e.target.value)}
          />
        </label>

        <div className="pdmeet-label">
          <span>
            <Users size={12} aria-hidden /> Attendees (need <span className="pdmeet-num">≥3</span> ·{' '}
            <span className="pdmeet-num">{attendeeIds.length}</span> selected)
          </span>
          {hasMemberList ? (
            <ul className="pdmeet-picker">
              {members.map((m) => (
                <li key={m.id}>
                  <label className="pdmeet-pick">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(m.id)}
                      onChange={() => toggleMember(m.id)}
                    />
                    {m.display_name || m.id}
                    {m.role ? <span className="pdmeet-pick-role">{m.role}</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <textarea
              className="pdmeet-input pdmeet-num"
              rows={2}
              value={idText}
              onChange={(e) => setIdText(e.target.value)}
              placeholder="Attendee member IDs, comma or space separated"
            />
          )}
        </div>

        <label className="pdmeet-label">
          <span>
            <ShieldCheck size={12} aria-hidden /> Compliance notes
          </span>
          <textarea
            className="pdmeet-input"
            rows={2}
            value={complianceNotes}
            onChange={(e) => setComplianceNotes(e.target.value)}
            placeholder="Restricted list, disclosures, soft/hard breaches…"
          />
        </label>

        <label className="pdmeet-label">
          <span>
            <Scale size={12} aria-hidden /> Sector weight
          </span>
          <textarea
            className="pdmeet-input"
            rows={2}
            value={sectorWeightNotes}
            onChange={(e) => setSectorWeightNotes(e.target.value)}
            placeholder="Current vs. target desk weight with this position…"
          />
        </label>

        <div className="pdmeet-row2">
          <label className="pdmeet-label">
            <span>
              <TrendingDown size={12} aria-hidden /> Headwinds
            </span>
            <textarea
              className="pdmeet-input"
              rows={2}
              value={headwinds}
              onChange={(e) => setHeadwinds(e.target.value)}
            />
          </label>
          <label className="pdmeet-label">
            <span>
              <TrendingUp size={12} aria-hidden /> Tailwinds
            </span>
            <textarea
              className="pdmeet-input"
              rows={2}
              value={tailwinds}
              onChange={(e) => setTailwinds(e.target.value)}
            />
          </label>
        </div>

        <div className="pdmeet-row2">
          <label className="pdmeet-label">
            <span>
              <Percent size={12} aria-hidden /> Proposed sizing %
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="pdmeet-input pdmeet-num"
              value={sizing}
              onChange={(e) => setSizing(e.target.value)}
              placeholder="e.g. 2.50"
            />
          </label>
          <label className="pdmeet-label">
            <span>Decision</span>
            <select
              className="pdmeet-input"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="">— (optional)</option>
              <option value="advance">Advance</option>
              <option value="more_work">More work</option>
              <option value="kill">Kill</option>
            </select>
          </label>
        </div>

        {error && <div className="pdmeet-error">{error}</div>}

        <div className="pdmeet-actions">
          <button
            type="button"
            className="pdmeet-cancel"
            onClick={() => setShowForm(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="pdmeet-cta"
            onClick={submit}
            disabled={saving || !canSubmit}
          >
            {saving ? (
              <>
                <Loader2 size={13} className="pdmeet-spin" aria-hidden /> Saving…
              </>
            ) : (
              'Log Desk Meeting'
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({ icon: Icon, label, value }) {
  return (
    <div className="pdmeet-field">
      <dt className="pdmeet-field-label">
        <Icon size={12} aria-hidden /> {label}
      </dt>
      <dd className="pdmeet-field-value">{value}</dd>
    </div>
  );
}
