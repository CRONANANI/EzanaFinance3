'use client';

/**
 * Card 6, Revolving Door: the share of filings naming at least one lobbyist
 * who held a covered government position, and the firms that employ the
 * most of them. Positions are shown exactly as filed. No accusatory framing.
 */
import { useState } from 'react';
import { doorShare } from '@/lib/lobbying/page-model';
import { fmtCount, fmtPct } from '@/lib/lobbying/page-format';
import { Card, Skel, SkelRows } from './ui';

export default function DoorCard({ view, sub, empty }) {
  const [open, setOpen] = useState(null);
  const d = view.data || {};
  const firms = d.firms || [];
  const share = doorShare(d.doorFilings, d.filings);
  const top = firms.length ? firms[0].lobbyists : 0;
  const isEmpty = view.status === 'ready' && !Number(d.doorFilings);
  return (
    <Card
      id="lbx-door"
      className="lbx-card--fill"
      title="Former officials now lobbying"
      sub={sub}
      status={view.status}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      skeleton={
        <>
          <Skel h={44} w="60%" />
          <div style={{ height: 16 }} />
          <SkelRows n={8} h={44} />
        </>
      }
      footer={
        <p className="lbx-notes-line">
          Positions are shown exactly as the filer wrote them. A named position is a disclosure
          requirement, not a finding.
        </p>
      }
    >
      <div className="lbx-door-lead">
        <p className="lbx-door-share lbx-mono">{fmtPct(share)}</p>
        <div className="lbx-door-copy">
          <p>
            of filings name at least one lobbyist who previously held a covered government position.
          </p>
          <span className="lbx-track" aria-hidden="true">
            <span style={{ width: `${share || 0}%` }} />
          </span>
          <p className="lbx-faint lbx-mono">{fmtCount(d.lobbyists)} distinct lobbyists</p>
        </div>
      </div>

      <p className="lbx-kicker lbx-kicker--sm lbx-door-kicker">
        Firms by former officials on filings
      </p>
      <ul className="lbx-door-list">
        {firms.map((f) => {
          const isOpen = open === f.key;
          const panel = `lbx-door-${f.key.replace(/\W+/g, '-')}`;
          return (
            <li key={f.key} className="lbx-door-item">
              <button
                type="button"
                className="lbx-door-row lbx-row"
                aria-expanded={isOpen}
                aria-controls={panel}
                onClick={() => setOpen(isOpen ? null : f.key)}
              >
                <span className="lbx-door-firm lbx-ellipsis" title={f.name}>
                  {f.name}
                </span>
                <span className="lbx-door-count">
                  <span className="lbx-mini" aria-hidden="true">
                    <span style={{ width: `${top ? (f.lobbyists / top) * 100 : 0}%` }} />
                  </span>
                  <span className="lbx-mono">{fmtCount(f.lobbyists)}</span>
                  <span className="lbx-sr"> former officials</span>
                </span>
                <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} aria-hidden="true" />
              </button>
              {isOpen ? (
                <div className="lbx-door-panel lbx-tile" id={panel}>
                  <p className="lbx-kicker lbx-kicker--sm">Covered positions, as filed</p>
                  {f.positions?.length ? (
                    <ul>
                      {f.positions.map((p, i) => (
                        <li key={`${p.name}-${i}`}>
                          <span className="lbx-door-who">{p.name}</span>
                          <span className="lbx-door-pos lbx-clamp2" title={p.position}>
                            {p.position}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="lbx-state">No position text was filed for these lobbyists.</p>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
