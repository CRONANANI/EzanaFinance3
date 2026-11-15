'use client';

import { useCallback, useEffect, useState } from 'react';
import { Modal } from '@/components/ds';
import { NA, fmtSignedPct, toneOf } from '@/lib/org-command-center';
import { fmtPct, pitchState } from '@/lib/org-fund-analytics-model';
import { Skel } from '@/components/org/command-center/parts';

const toneClass = (v) => {
  const t = toneOf(v);
  return t === 'na' ? 'tcc-na' : `tcc-${t}`;
};

/**
 * One analyst's scorecard, in the library dialog (Esc, a click outside or
 * Close dismisses it, and focus returns to the row that opened it).
 *
 * Who may read it is decided by the server: a member always sees their own,
 * executives see anyone's, a portfolio manager their own team's, and analysts
 * see peers only when the council has turned that on. Anyone else gets the
 * "own scorecard" message.
 *
 * `sample` is the scorecard to show while sample content is on the page
 * (nothing is fetched then), or undefined on the live page.
 */
export function ScorecardDialog({ member, sample, onClose }) {
  const open = Boolean(member);
  const memberId = member?.member_id || null;
  const [state, setState] = useState({ status: 'loading', scorecard: null, message: '' });

  const load = useCallback(async () => {
    if (!memberId) return;
    if (sample !== undefined) {
      setState(
        sample
          ? { status: 'ready', scorecard: sample, message: '' }
          : { status: 'error', scorecard: null, message: 'No scorecard for this member.' },
      );
      return;
    }
    setState({ status: 'loading', scorecard: null, message: '' });
    try {
      const res = await fetch(`/api/org/analytics/scorecard/${encodeURIComponent(memberId)}`, {
        cache: 'no-store',
      });
      if (res.status === 403) {
        setState({
          status: 'forbidden',
          scorecard: null,
          message: 'You can only view your own scorecard.',
        });
        return;
      }
      if (!res.ok) throw new Error('scorecard failed');
      const json = await res.json();
      setState({ status: 'ready', scorecard: json.scorecard || null, message: '' });
    } catch {
      setState({ status: 'error', scorecard: null, message: 'Could not load the scorecard.' });
    }
  }, [memberId, sample]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const s = state.scorecard;
  const tiles = s
    ? [
        [
          'Hit rate',
          na(fmtPct(s.hit_rate)),
          null,
          'Share of pitches with a reading that beat the benchmark',
        ],
        ['Avg return', fmtSignedPct(s.avg_return), toneClass(s.avg_return)],
        ['Avg alpha', fmtSignedPct(s.avg_alpha), toneClass(s.avg_alpha)],
        ['Pitches', s.pitch_count ?? NA],
        ['Votes cast', s.votes_participated ?? NA],
        ['Research notes', s.notes_authored ?? NA],
      ]
    : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? `Scorecard: ${member.name}` : 'Scorecard'}
      size={640}
      className="ofa-dialog"
    >
      {state.status === 'loading' ? (
        <div className="ofa-card" aria-busy="true">
          <div className="ofa-card__tiles">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="ofa-card__tile">
                <Skel w={64} h={11} />
                <Skel w={72} h={18} />
              </div>
            ))}
          </div>
          <Skel h={14} />
          <Skel h={14} />
          <Skel h={14} />
        </div>
      ) : state.status === 'forbidden' ? (
        <p className="tcc-state" role="status">
          <i className="bi bi-lock" aria-hidden="true" />
          <span>{state.message}</span>
        </p>
      ) : state.status === 'error' || !s ? (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>{state.message || 'No scorecard for this member.'}</span>
          {sample === undefined && (
            <button
              type="button"
              className="tcc-textbtn tcc-textbtn--accent ofa-action"
              onClick={load}
            >
              Retry
            </button>
          )}
        </p>
      ) : (
        <div className="ofa-card">
          {(member?.sleeve || s.sub_role || s.role) && (
            <p className="ofa-sub">
              {[s.sub_role || roleWords(s.role), member?.sleeve].filter(Boolean).join(', ')}
            </p>
          )}
          <dl className="ofa-card__tiles">
            {tiles.map(([label, value, tone, title]) => (
              <div key={label} className="ofa-card__tile" title={title}>
                <dt>{label}</dt>
                <dd className={`tcc-mono${tone ? ` ${tone}` : ''}`}>{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="ofa-subtitle">Calls</h3>
          {s.calls?.length ? (
            <div className="ofa-scroll">
              <table className="ofa-table">
                <thead>
                  <tr>
                    <th scope="col">Ticker</th>
                    <th scope="col" className="ofa-num">
                      Return
                    </th>
                    <th scope="col" className="ofa-num">
                      Alpha
                    </th>
                    <th scope="col">State</th>
                  </tr>
                </thead>
                <tbody>
                  {s.calls.map((c, i) => {
                    const st = c.has_outcome ? pitchState(c.current_state) : pitchState(null);
                    return (
                      <tr key={`${c.ticker}-${i}`}>
                        <td role="rowheader" className="tcc-mono">
                          {c.ticker}
                        </td>
                        <td className={`ofa-num tcc-mono ${toneClass(c.return_pct)}`}>
                          {fmtSignedPct(c.return_pct)}
                        </td>
                        <td className={`ofa-num tcc-mono ${toneClass(c.alpha_pct)}`}>
                          {fmtSignedPct(c.alpha_pct)}
                        </td>
                        <td>
                          <span className={`ofa-pstate tcc-${st.tone}`}>
                            <i className={`bi ${st.icon}`} aria-hidden="true" />
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="tcc-state">
              <span>No pitches yet.</span>
            </p>
          )}
          <p className="ofa-foot">
            A pitch has no reading until 30 days after it is decided. Until then it reads Pending.
          </p>
        </div>
      )}
    </Modal>
  );
}

function na(text) {
  return text === NA ? <span className="tcc-na">{NA}</span> : text;
}
function roleWords(role) {
  const r = String(role || '').replace(/_/g, ' ');
  return r ? r[0].toUpperCase() + r.slice(1) : '';
}
