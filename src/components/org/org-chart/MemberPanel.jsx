'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Checkbox, Input, Modal, Select } from '@/components/ds';
import { NA, fmtSignedPct, toneOf } from '@/lib/org-command-center';
import {
  GICS_SECTORS,
  ROLE_GROUP_LABEL,
  customTitle,
  directReportsOf,
  fmtDay,
  initialsOf,
  isCommittee,
  memberEditBody,
  memberName,
  rankLabel,
  sectorsOf,
  wouldLoop,
} from '@/lib/org-chart-model';
import { Skel } from '@/components/org/command-center/parts';

const BADGE_LABEL = {
  winner: 'Winner',
  top3: 'Top 3',
  finalist: 'Finalist',
  best_thesis: 'Best thesis',
  participant: 'Participant',
};

const toneClass = (v) => {
  const t = toneOf(v);
  return t === 'na' ? 'tcc-na' : `tcc-${t}`;
};
const pct = (v) => (v == null || !Number.isFinite(Number(v)) ? NA : `${Number(v).toFixed(2)}%`);

/**
 * The scorecard and competition placements for one member. Both come from
 * routes that already exist; the server decides who may read a scorecard
 * (a member's own, a manager's team, or peers when the council allows it).
 */
function useMemberExtras(memberId, sampleScorecard, sampleBadges) {
  const [score, setScore] = useState({ status: 'loading', data: null });
  const [badges, setBadges] = useState({ status: 'loading', data: [] });

  const loadScore = useCallback(async () => {
    if (!memberId) return;
    if (sampleScorecard !== undefined) {
      setScore({ status: 'ready', data: sampleScorecard });
      return;
    }
    setScore({ status: 'loading', data: null });
    try {
      const res = await fetch(`/api/org/analytics/scorecard/${encodeURIComponent(memberId)}`, {
        cache: 'no-store',
      });
      if (res.status === 403) {
        setScore({ status: 'forbidden', data: null });
        return;
      }
      if (!res.ok) throw new Error('scorecard failed');
      setScore({ status: 'ready', data: (await res.json()).scorecard || null });
    } catch {
      setScore({ status: 'error', data: null });
    }
  }, [memberId, sampleScorecard]);

  const loadBadges = useCallback(async () => {
    if (!memberId) return;
    if (sampleBadges !== undefined) {
      setBadges({ status: 'ready', data: sampleBadges });
      return;
    }
    setBadges({ status: 'loading', data: [] });
    try {
      const res = await fetch(
        `/api/org/competition-badges?member_id=${encodeURIComponent(memberId)}`,
        { cache: 'no-store' },
      );
      if (!res.ok) throw new Error('badges failed');
      setBadges({ status: 'ready', data: (await res.json()).badges || [] });
    } catch {
      setBadges({ status: 'error', data: [] });
    }
  }, [memberId, sampleBadges]);

  useEffect(() => {
    loadScore();
    loadBadges();
  }, [loadScore, loadBadges]);

  return { score, badges, loadScore, loadBadges };
}

function draftOf(m) {
  return {
    title: m?.title || '',
    reports_to: m?.reports_to || '',
    term_start: m?.term_start || '',
    term_end: m?.term_end || '',
    is_graduating: Boolean(m?.is_graduating),
    sectors: sectorsOf(m),
  };
}

/**
 * One member, opened from anywhere a person appears. Everyone reads it.
 * Executives and portfolio managers also edit the title, manager, term dates,
 * graduating marker and covered sectors (the existing chart route, which
 * checks the role again). The rank is changed in its own dialog, offered only
 * where the rank rules allow it.
 */
export function MemberPanel({
  member,
  members,
  teamLabel,
  viewer,
  sampleActive,
  sampleScorecard,
  sampleBadges,
  onOpen,
  onRank,
  onSave,
  onClose,
}) {
  const open = Boolean(member);
  const memberId = member?.id || null;
  const canManage = Boolean(viewer?.canManage);
  const isSelf = memberId && memberId === viewer?.memberId;
  const { score, badges, loadScore, loadBadges } = useMemberExtras(
    memberId,
    sampleScorecard,
    sampleBadges,
  );

  const [draft, setDraft] = useState(() => draftOf(member));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);

  /* A different member starts a clean form. */
  useEffect(() => {
    setDraft(draftOf(member));
    setError(null);
    setSaved(null);
    setMessage('');
    setSent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  if (!member) return null;

  const name = memberName(member);
  const byId = new Map(members.map((m) => [m.id, m]));
  const manager = member.reports_to ? byId.get(member.reports_to) || null : null;
  const reports = directReportsOf(members, member.id);
  const title = customTitle(member);
  const sectors = sectorsOf(member);
  const set = (k, v) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setSaved(null);
    setError(null);
  };
  const check = memberEditBody(member, draft, members);
  /* An invalid form keeps Save on, so pressing it says what to change. */
  const dirty = !check.ok || Boolean(check.body);

  const save = async (e) => {
    e?.preventDefault();
    if (saving) return;
    if (!check.ok) {
      setError(check.error);
      return;
    }
    if (!check.body) return;
    setSaving(true);
    setError(null);
    const res = await onSave(check.body);
    setSaving(false);
    if (!res?.ok) {
      setError(res?.error || 'Could not save. Nothing was changed.');
      return;
    }
    setSaved(res.sample ? 'Changed on this page only. Sample content is never saved.' : 'Saved.');
  };

  const send = async () => {
    const body = message.trim();
    if (!body || sending) return;
    if (sampleActive) {
      setSent({ ok: true, text: 'Not sent. Messages are off while sample content shows.' });
      return;
    }
    setSending(true);
    setSent(null);
    try {
      const res = await fetch('/api/org/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_member_id: member.id,
          subject: 'Direct message',
          body,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'failed');
      }
      setMessage('');
      setSent({ ok: true, text: `Message sent to ${name}.` });
    } catch {
      setSent({ ok: false, text: 'Could not send the message. Try again.' });
    } finally {
      setSending(false);
    }
  };

  const managerOptions = [
    { value: '', label: 'No manager' },
    ...members
      .filter((m) => m.id !== member.id && !wouldLoop(members, member.id, m.id))
      .map((m) => ({ value: m.id, label: `${memberName(m)}, ${rankLabel(m)}` })),
  ];
  const s = score.data;
  const tiles = [
    ['Hit rate', pct(s?.hit_rate), null],
    ['Avg return', fmtSignedPct(s?.avg_return), toneClass(s?.avg_return)],
    ['Avg alpha', fmtSignedPct(s?.avg_alpha), toneClass(s?.avg_alpha)],
    ['Pitches', s?.pitch_count ?? NA, null],
    ['Votes cast', s?.votes_participated ?? NA, null],
    ['Research notes', s?.notes_authored ?? NA, null],
  ];

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={name}
      size={600}
      className="ooc-dialog"
      footer={
        <>
          <button type="button" className="tcc-textbtn ooc-inline" onClick={onClose}>
            Close
          </button>
          {canManage && (
            <Button
              variant="primary"
              className="tcc-flatbtn"
              type="submit"
              form="ooc-member-form"
              loading={saving}
              disabled={!dirty}
            >
              Save changes
            </Button>
          )}
        </>
      }
    >
      <div className="ooc-panel">
        <div className="ooc-panel__id">
          <span className="ooc-avatar ooc-avatar--xl" aria-hidden="true">
            {initialsOf(name)}
          </span>
          <div>
            <p className="ooc-panel__rank">
              {rankLabel(member)}
              {title ? `, ${title}` : ''}
            </p>
            <p className="ooc-panel__sub">
              {ROLE_GROUP_LABEL[member.role] || 'Member'} group
              {isCommittee(member) ? '. Investment committee (votes on pitches)' : ''}
              {isSelf ? '. This is you' : ''}
            </p>
          </div>
          {member.editable && (
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent ooc-inline ooc-panel__rankbtn"
              onClick={() => onRank(member.id)}
            >
              Change rank
            </button>
          )}
        </div>

        <dl className="ooc-facts">
          <div>
            <dt>Team</dt>
            <dd>{teamLabel}</dd>
          </div>
          <div>
            <dt>Reports to</dt>
            <dd>
              {manager ? (
                <button
                  type="button"
                  className="tcc-textbtn ooc-inline"
                  onClick={() => onOpen(manager.id)}
                >
                  {memberName(manager)}
                </button>
              ) : (
                <span className="tcc-na">{NA}</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Sector coverage</dt>
            <dd>{sectors.length ? sectors.join(', ') : <span className="tcc-na">{NA}</span>}</dd>
          </div>
          <div>
            <dt>Term</dt>
            <dd className="tcc-mono">
              {member.term_start || member.term_end ? (
                `${fmtDay(member.term_start) || NA} to ${fmtDay(member.term_end) || NA}`
              ) : (
                <span className="tcc-na">{NA}</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Graduating</dt>
            <dd>{member.is_graduating ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd className="tcc-na">{NA}</dd>
          </div>
          <div className="ooc-facts__wide">
            <dt>
              Direct reports <span className="tcc-mono">{reports.length}</span>
            </dt>
            <dd>
              {reports.length === 0 ? (
                <span className="tcc-na">None</span>
              ) : (
                reports.map((r, i) => (
                  <span key={r.id}>
                    {i > 0 && ', '}
                    <button
                      type="button"
                      className="tcc-textbtn ooc-inline"
                      onClick={() => onOpen(r.id)}
                    >
                      {memberName(r)}
                    </button>
                  </span>
                ))
              )}
            </dd>
          </div>
        </dl>

        {canManage && (
          <form id="ooc-member-form" className="ooc-form" onSubmit={save} noValidate>
            <h3 className="ooc-subtitle">Edit details</h3>
            {sampleActive && (
              <p className="tcc-form__note">
                Sample content is showing. Changes stay on this page and are not saved.
              </p>
            )}
            <div className="tcc-form__pair">
              <Input
                id="ooc-member-title"
                label="Title (optional)"
                value={draft.title}
                maxLength={80}
                hint="Leave empty to show the rank name."
                onChange={(e) => set('title', e.target.value)}
              />
              <Select
                id="ooc-member-manager"
                label="Reports to"
                value={draft.reports_to}
                options={managerOptions}
                onChange={(e) => set('reports_to', e.target.value)}
              />
            </div>
            <div className="tcc-form__pair">
              <Input
                id="ooc-member-start"
                label="Term start"
                type="date"
                value={draft.term_start}
                onChange={(e) => set('term_start', e.target.value)}
              />
              <Input
                id="ooc-member-end"
                label="Term end"
                type="date"
                value={draft.term_end}
                onChange={(e) => set('term_end', e.target.value)}
              />
            </div>
            <Checkbox
              label="Graduating (their covered sectors will need a handoff)"
              checked={draft.is_graduating}
              onChange={(e) => set('is_graduating', e.target.checked)}
            />
            <fieldset className="ooc-fieldset">
              <legend>Sector coverage</legend>
              <div className="ooc-checks">
                {GICS_SECTORS.map((sector) => (
                  <Checkbox
                    key={sector}
                    label={sector}
                    checked={draft.sectors.includes(sector)}
                    onChange={(e) =>
                      set(
                        'sectors',
                        e.target.checked
                          ? [...draft.sectors, sector]
                          : draft.sectors.filter((x) => x !== sector),
                      )
                    }
                  />
                ))}
              </div>
              {member.role !== 'analyst' && (
                <p className="tcc-form__note">
                  Flag routing only picks a covering member from the analyst group.
                </p>
              )}
            </fieldset>
            {error && (
              <p className="tcc-state tcc-state--error" role="alert">
                <i className="bi bi-exclamation-circle" aria-hidden="true" />
                <span>{error}</span>
              </p>
            )}
            {saved && (
              <p className="ooc-ok" role="status">
                <i className="bi bi-check2-circle" aria-hidden="true" />
                {saved}
              </p>
            )}
          </form>
        )}

        <section aria-label="Scorecard">
          <h3 className="ooc-subtitle">Scorecard</h3>
          {score.status === 'loading' ? (
            <div className="ooc-tiles" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <Skel w={64} h={11} />
                  <Skel w={56} h={16} />
                </div>
              ))}
            </div>
          ) : score.status === 'forbidden' ? (
            <p className="tcc-state" role="status">
              <i className="bi bi-lock" aria-hidden="true" />
              <span>You can only view your own scorecard.</span>
            </p>
          ) : score.status === 'error' ? (
            <p className="tcc-state tcc-state--error" role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              <span>Could not load the scorecard.</span>
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent ooc-inline"
                onClick={loadScore}
              >
                Retry
              </button>
            </p>
          ) : !s ? (
            <p className="tcc-state">
              <span>No scorecard for this member.</span>
            </p>
          ) : (
            <>
              <dl className="ooc-tiles">
                {tiles.map(([label, value, tone]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd className={`tcc-mono${value === NA ? ' tcc-na' : tone ? ` ${tone}` : ''}`}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {s.calls?.length > 0 && (
                <p className="ooc-calls">
                  Calls:{' '}
                  {s.calls.map((c, i) => (
                    <span key={`${c.ticker}-${i}`}>
                      {i > 0 && ', '}
                      <span className="tcc-mono tcc-ticker">{c.ticker}</span>{' '}
                      <span className={`tcc-mono ${toneClass(c.alpha_pct)}`}>
                        {fmtSignedPct(c.alpha_pct)}
                      </span>
                    </span>
                  ))}{' '}
                  (alpha; N/A until 30 days after the decision)
                </p>
              )}
            </>
          )}
        </section>

        <section aria-label="Competitions">
          <h3 className="ooc-subtitle">Competitions</h3>
          {badges.status === 'loading' ? (
            <Skel w="60%" h={14} />
          ) : badges.status === 'error' ? (
            <p className="tcc-state tcc-state--error" role="alert">
              <i className="bi bi-exclamation-circle" aria-hidden="true" />
              <span>Could not load competition placements.</span>
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent ooc-inline"
                onClick={loadBadges}
              >
                Retry
              </button>
            </p>
          ) : badges.data.length === 0 ? (
            <p className="tcc-state">
              <span>No competition placements on file.</span>
            </p>
          ) : (
            <ul className="ooc-badges">
              {badges.data.map((b) => (
                <li key={b.id}>
                  <i className="bi bi-trophy" aria-hidden="true" />
                  <span>{b.competition_name}</span>
                  <span className="ooc-badges__place">
                    {BADGE_LABEL[b.badge_key] || BADGE_LABEL.participant}
                    {b.placement ? (
                      <>
                        , place <span className="tcc-mono">{b.placement}</span>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!isSelf && (
          <section aria-label="Message">
            <h3 className="ooc-subtitle">Message</h3>
            <div className="ooc-message">
              <label className="tcc-sr" htmlFor="ooc-member-message">
                Message {name}
              </label>
              <textarea
                id="ooc-member-message"
                className="ooc-message__field"
                rows={2}
                maxLength={2000}
                placeholder={`Message ${name}`}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setSent(null);
                }}
              />
              <button
                type="button"
                className="tcc-textbtn tcc-textbtn--accent ooc-inline"
                onClick={send}
                disabled={sending || !message.trim()}
              >
                <i className="bi bi-send" aria-hidden="true" />
                {sending ? 'Sending' : 'Send'}
              </button>
            </div>
            {sent && (
              <p
                className={sent.ok ? 'ooc-ok' : 'tcc-state tcc-state--error'}
                role={sent.ok ? 'status' : 'alert'}
              >
                <i
                  className={`bi ${sent.ok ? 'bi-info-circle' : 'bi-exclamation-circle'}`}
                  aria-hidden="true"
                />
                <span>{sent.text}</span>
              </p>
            )}
          </section>
        )}
      </div>
    </Modal>
  );
}
