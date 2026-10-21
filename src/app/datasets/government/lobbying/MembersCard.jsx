'use client';

/**
 * Card 9, Money to Members: LD-203 contributions by lobbyists and
 * registrants. Names render exactly as filed and never link anywhere: the
 * honoree is free text and cannot be joined to a member record with
 * certainty. Item dates are clamped to the report's filing period.
 */
import { useState } from 'react';
import { CONTRIBUTION_TYPES, clampToPeriod } from '@/lib/lobbying/page-model';
import {
  CONTRIBUTION_TYPE_LABEL,
  MEMBERS_PERIOD_LABEL,
  fmtCount,
  fmtDate,
  fmtSpend,
  membersScopeLabel,
} from '@/lib/lobbying/page-format';
import { Card, SkelRows, Tabs } from './ui';

const TABS = [
  { value: 'honorees', label: 'Top honorees' },
  { value: 'committees', label: 'Top committees' },
  { value: 'largest', label: 'Largest items' },
];

export default function MembersCard({ view, types, setTypes, sub, empty }) {
  const [tab, setTab] = useState('honorees');
  const d = view.data || {};
  const counts = d.typeCounts || {};
  const rows = d[tab] || [];
  const isEmpty = view.status === 'ready' && !Number(d.items);
  const toggleType = (t) =>
    setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t].sort());

  return (
    <Card
      id="lbx-members"
      className="lbx-card--fill"
      title="Money to members"
      sub={
        view.status === 'ready' && d.periods?.length
          ? `${membersScopeLabel(d.periods)} · ${sub}`
          : sub
      }
      right={
        view.status === 'ready' && !isEmpty ? (
          <div className="lbx-members-total">
            <span className="lbx-mono lbx-members-amt">{fmtSpend(d.total)}</span>
            <span className="lbx-mono lbx-faint">{fmtCount(d.reports)} reports</span>
          </div>
        ) : null
      }
      status={view.status}
      onRetry={view.retry}
      empty={isEmpty ? empty : null}
      skeleton={<SkelRows n={6} h={46} />}
      footer={
        <div className="lbx-notes">
          <p>Names as filed by the contributor.</p>
          <p>
            Dates outside the filing period are clamped to it; filer typos exist in the source.
            Items with no honoree or payee named count toward the total but are not ranked.
          </p>
        </div>
      }
    >
      <Tabs
        label="Contribution view"
        value={tab}
        options={TABS}
        onChange={setTab}
        idBase="lbx-mm"
      />
      <div className="lbx-type-chips" role="group" aria-label="Contribution types">
        {CONTRIBUTION_TYPES.map((t) => {
          const on = types.includes(t);
          return (
            <button
              key={t}
              type="button"
              className={`lbx-chip lbx-chip--sm${on ? ' is-on' : ''}`}
              aria-pressed={on}
              onClick={() => toggleType(t)}
            >
              {CONTRIBUTION_TYPE_LABEL[t]}
              <span className="lbx-mono">{fmtCount(counts[t] || 0)}</span>
            </button>
          );
        })}
      </div>
      <ol
        className="lbx-mm-list"
        id="lbx-mm-panel"
        role="tabpanel"
        aria-labelledby={`lbx-mm-tab-${tab}`}
      >
        {rows.map((r, i) => {
          if (tab === 'largest') {
            const c = clampToPeriod(r.date, r.year, r.period);
            return (
              <li key={`${r.contributor}-${r.payee}-${i}`} className="lbx-mm-row">
                <span className="lbx-mono lbx-faint">{i + 1}</span>
                <span className="lbx-mm-name">
                  <span className="lbx-ellipsis" title={r.payee}>
                    {r.payee || r.honoree || 'Payee not named'}
                  </span>
                  <span className="lbx-mono lbx-mm-meta lbx-ellipsis">
                    {CONTRIBUTION_TYPE_LABEL[r.type] || r.type} ·{' '}
                    {c ? fmtDate(c.date) : `${r.year} ${MEMBERS_PERIOD_LABEL[r.period] || ''}`}
                    {c?.clamped ? ' (date clamped)' : ''}
                    {r.honoree ? ` · honoree ${r.honoree}` : ''}
                  </span>
                </span>
                <span className="lbx-mono lbx-mm-amt">{fmtSpend(r.amount)}</span>
              </li>
            );
          }
          return (
            <li key={`${r.name}-${i}`} className="lbx-mm-row">
              <span className="lbx-mono lbx-faint">{i + 1}</span>
              <span className="lbx-mm-name">
                <span className="lbx-ellipsis" title={r.name}>
                  {r.name}
                </span>
                <span className="lbx-mono lbx-mm-meta">
                  {fmtCount(r.items)} {Number(r.items) === 1 ? 'item' : 'items'}
                </span>
              </span>
              <span className="lbx-mono lbx-mm-amt">{fmtSpend(r.amount)}</span>
            </li>
          );
        })}
        {!rows.length ? (
          <li className="lbx-state">No contributions of this type in the period.</li>
        ) : null}
      </ol>
    </Card>
  );
}
