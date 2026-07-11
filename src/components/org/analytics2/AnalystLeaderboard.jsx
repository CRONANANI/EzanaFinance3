'use client';

import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { money, pct } from './format';
import { sectorColor } from './sectorColors';

const initials = (name) =>
  (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/** First-class people panel: real names, $ contribution, sortable, row → scorecard. */
export function AnalystLeaderboard({ data = [], onSelect }) {
  const [sort, setSort] = useState({ key: 'contribution_usd', dir: 'desc' });

  const rows = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const an = a[sort.key] == null ? -Infinity : Number(a[sort.key]);
      const bn = b[sort.key] == null ? -Infinity : Number(b[sort.key]);
      return sort.dir === 'asc' ? an - bn : bn - an;
    });
    return arr;
  }, [data, sort]);

  const maxAbs = useMemo(
    () => Math.max(1, ...data.map((a) => Math.abs(a.contribution_usd ?? 0))),
    [data],
  );
  const toggle = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  if (data.length === 0) {
    return <div className="fa-empty">No analysts on the roster yet.</div>;
  }

  return (
    <div className="fa-card" style={{ overflow: 'hidden' }}>
      <div className="fa-card-head">
        <h3 className="fa-card-t">
          <Trophy size={15} aria-hidden /> Analyst leaderboard
        </h3>
        <span className="fa-card-mut">click a row for the scorecard</span>
      </div>
      <div className="an4-table-wrap">
        <table className="fa-lb">
          <thead>
            <tr>
              <th style={{ width: 24 }} aria-label="Rank" />
              <th>Analyst</th>
              <th className="r" onClick={() => toggle('pitches')}>
                Pitch
              </th>
              <th className="r" onClick={() => toggle('hit_rate_pct')}>
                Hit
              </th>
              <th className="r" onClick={() => toggle('avg_alpha_pct')}>
                Avg α
              </th>
              <th className="r" onClick={() => toggle('contribution_usd')}>
                Contribution
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => {
              const muted = (a.pitches ?? 0) === 0;
              const c = a.contribution_usd ?? 0;
              const rankCls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
              return (
                <tr
                  key={a.member_id}
                  className={muted ? 'is-muted' : ''}
                  onClick={() => onSelect?.(a.member_id)}
                  tabIndex={0}
                  onKeyDown={(e) =>
                    (e.key === 'Enter' || e.key === ' ') &&
                    (e.preventDefault(), onSelect?.(a.member_id))
                  }
                >
                  <td>
                    <span className={`fa-rank ${rankCls}`}>{i + 1}</span>
                  </td>
                  <td>
                    <div className="fa-who">
                      <span
                        className="fa-av"
                        style={{
                          background: `${sectorColor(a.sleeve)}22`,
                          color: sectorColor(a.sleeve),
                        }}
                      >
                        {initials(a.name)}
                      </span>
                      <div>
                        <div className="nm">{a.name}</div>
                        <div className="sl">{a.sleeve || 'No sleeve'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="r an4-num">{a.pitches ?? 0}</td>
                  <td className="r an4-num">
                    {a.hit_rate_pct == null ? '—' : `${Math.round(a.hit_rate_pct)}%`}
                  </td>
                  <td
                    className={`r an4-num ${a.avg_alpha_pct == null ? '' : a.avg_alpha_pct >= 0 ? 'an4-pos' : 'an4-neg'}`}
                  >
                    {a.avg_alpha_pct == null ? '—' : pct(a.avg_alpha_pct, 1)}
                  </td>
                  <td className="r">
                    {muted ? (
                      <span className="an4-num" style={{ color: 'var(--text-muted)' }}>
                        —
                      </span>
                    ) : (
                      <div className="fa-contrib">
                        <span
                          className="amt"
                          style={{
                            color: c >= 0 ? 'var(--text-primary)' : 'var(--negative, #ef4444)',
                          }}
                        >
                          {money(c)}
                        </span>
                        <span className="fa-contrib-bar">
                          <i
                            style={{
                              width: `${(Math.abs(c) / maxAbs) * 100}%`,
                              background:
                                c >= 0 ? 'var(--emerald, #10b981)' : 'var(--negative, #ef4444)',
                            }}
                          />
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
