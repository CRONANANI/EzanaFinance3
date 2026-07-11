'use client';

import { History } from 'lucide-react';
import { money, pct, signClass } from './format';

/** Full-width delta strip. Renders nothing when `data` is null (no meetings). */
export function SinceLastMeetingStrip({ data }) {
  if (!data) return null;

  const added = data.positions_added;
  const closed = data.positions_closed;
  const posClosed =
    added == null && closed == null ? '—' : `+${added ?? 0}${closed ? ` / −${closed}` : ''}`;

  const cells = [
    {
      l: 'Fund value',
      v:
        data.fund_value_delta == null
          ? '—'
          : `${data.fund_value_delta >= 0 ? '+' : ''}${money(data.fund_value_delta)}`,
      cls: signClass(data.fund_value_delta),
    },
    { l: 'Return', v: pct(data.return_delta_pct, 1), cls: signClass(data.return_delta_pct) },
    { l: 'Positions', v: posClosed, cls: '' },
    {
      l: 'Pitches decided',
      v: data.pitches_decided == null ? '—' : String(data.pitches_decided),
      cls: '',
    },
    {
      l: 'New flags',
      v: data.flags_raised == null ? '—' : String(data.flags_raised),
      cls: data.flags_raised ? 'fa-amber' : '',
    },
  ];

  return (
    <div className="fa-slm">
      <div className="fa-slm-lead">
        <History size={16} aria-hidden />
        <div>
          <div className="t">Since last meeting</div>
          <div className="d">
            {new Date(`${data.since_date}T00:00:00`).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            · {data.days_ago}d ago
          </div>
        </div>
      </div>
      {cells.map((c) => (
        <div className="fa-slm-cell" key={c.l}>
          <div className="l">{c.l}</div>
          <div className={`v ${c.cls}`}>{c.v}</div>
        </div>
      ))}
    </div>
  );
}
