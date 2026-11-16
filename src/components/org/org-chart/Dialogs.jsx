'use client';

import { useEffect, useState } from 'react';
import { Button, Checkbox, Modal } from '@/components/ds';
import {
  ROLE_GROUP_LABEL,
  memberName,
  rankLabel,
  rankOptions,
  sectorCoverageBodies,
  sectorsOf,
} from '@/lib/org-chart-model';

/**
 * Change one member's rank. Only the ranks the viewer may give are listed
 * (the rank route enforces the same rules and refuses anything else).
 */
export function ChangeRankDialog({ member, viewer, sampleActive, onSave, onClose }) {
  const open = Boolean(member);
  const [pick, setPick] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const memberId = member?.id || null;
  useEffect(() => {
    setPick(null);
    setError(null);
    setSaving(false);
  }, [memberId]);
  if (!member) return null;

  const options = rankOptions(member, viewer);
  const save = async () => {
    if (!pick || saving) return;
    setSaving(true);
    setError(null);
    const res = await onSave(member.id, pick);
    if (res?.ok) return;
    setSaving(false);
    setError(res?.error || 'Could not change the rank. Nothing was changed.');
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Change rank"
      size={440}
      className="ooc-dialog"
      footer={
        <>
          <button
            type="button"
            className="tcc-textbtn ooc-inline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            loading={saving}
            disabled={!pick}
            onClick={save}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="ooc-rank">
        <dl className="ooc-facts ooc-facts--stack">
          <div>
            <dt>Member</dt>
            <dd>{memberName(member)}</dd>
          </div>
          <div>
            <dt>Current rank</dt>
            <dd>
              {rankLabel(member)} ({ROLE_GROUP_LABEL[member.role] || 'Member'} group)
            </dd>
          </div>
        </dl>
        {options.length === 0 ? (
          <p className="tcc-state">
            <span>There is no other rank you can give this member.</span>
          </p>
        ) : (
          <div role="radiogroup" aria-label="New rank" className="ooc-rank__list">
            {options.map((t) => {
              const on = pick === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`ooc-rank__opt${on ? ' is-on' : ''}`}
                  onClick={() => setPick(t.id)}
                >
                  <i className={`bi ${on ? 'bi-check-lg' : 'bi-circle'}`} aria-hidden="true" />
                  <span>{t.label}</span>
                  <span className="ooc-rank__group">{ROLE_GROUP_LABEL[t.role]} group</span>
                </button>
              );
            })}
          </div>
        )}
        <p className="tcc-form__note">
          The role group follows the rank, and with it what the member can do across the app. A
          default title follows too; a custom title stays. The change is logged with your name.
          {sampleActive ? ' Sample content is showing: this change stays on the page.' : ''}
        </p>
        {error && (
          <p className="tcc-state tcc-state--error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </Modal>
  );
}

/**
 * Choose who covers one sector. Saved through the existing chart route, one
 * request per member whose sectors change. Executives and portfolio managers
 * only; the route checks the role again.
 */
export function CoverageDialog({ sector, members, sampleActive, onSave, onClose }) {
  const open = Boolean(sector);
  const [ids, setIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    setIds(sector ? members.filter((m) => sectorsOf(m).includes(sector)).map((m) => m.id) : []);
    setError(null);
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector]);
  if (!sector) return null;

  const bodies = sectorCoverageBodies(members, sector, ids);
  const groups = [
    ['analyst', 'Analysts'],
    ['portfolio_manager', 'Portfolio managers'],
    ['executive', 'Executives'],
  ]
    .map(([role, label]) => [label, members.filter((m) => m.role === role)])
    .filter(([, list]) => list.length > 0);

  const save = async () => {
    if (saving || bodies.length === 0) return;
    setSaving(true);
    setError(null);
    const res = await onSave(bodies);
    if (res?.ok) return;
    setSaving(false);
    setError(res?.error || 'Could not save coverage. Nothing was changed.');
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title={`Coverage: ${sector}`}
      size={480}
      className="ooc-dialog"
      footer={
        <>
          <button
            type="button"
            className="tcc-textbtn ooc-inline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <Button
            variant="primary"
            className="tcc-flatbtn"
            loading={saving}
            disabled={bodies.length === 0}
            onClick={save}
          >
            Save coverage
          </Button>
        </>
      }
    >
      <div className="ooc-coverdlg">
        <p className="tcc-form__note">
          Flag routing sends a flag in this sector to the first analyst covering it, when no pitch
          names an analyst for the ticker. Covering members outside the analyst group are listed on
          the chart but are not picked by routing.
          {sampleActive ? ' Sample content is showing: this stays on the page.' : ''}
        </p>
        {groups.map(([label, list]) => (
          <fieldset key={label} className="ooc-fieldset">
            <legend>{label}</legend>
            <div className="ooc-checks">
              {list.map((m) => (
                <Checkbox
                  key={m.id}
                  label={`${memberName(m)}, ${rankLabel(m)}`}
                  checked={ids.includes(m.id)}
                  onChange={(e) =>
                    setIds((cur) =>
                      e.target.checked ? [...cur, m.id] : cur.filter((x) => x !== m.id),
                    )
                  }
                />
              ))}
            </div>
          </fieldset>
        ))}
        {error && (
          <p className="tcc-state tcc-state--error" role="alert">
            <i className="bi bi-exclamation-circle" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </Modal>
  );
}
