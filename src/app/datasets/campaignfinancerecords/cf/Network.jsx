'use client';

/**
 * 04 The political money network: OutsideMoneyPressure,
 * OutsideGroupExplorer, DonorGeography, DonorIndustryAtlas,
 * LobbyistConnections.
 */
import { useMemo, useState } from 'react';
import { money, pct, seatLabel, share } from './format';
import { CardFoot, CFCardState, Kpi, MemberPicker, Pills } from './ui';
import { useMemberDetail } from './useMember';

const OUTSIDE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'H', label: 'House' },
  { key: 'S', label: 'Senate' },
  { key: 'D', label: 'Democratic' },
  { key: 'R', label: 'Republican' },
];

export function OutsideMoneyPressure({ data, updated, onOpen }) {
  const [filter, setFilter] = useState('all');
  const o = data?.outside || {};
  const rows = useMemo(() => {
    const list = (data?.members || []).filter((m) => (m.support || 0) + (m.oppose || 0) > 0);
    return list
      .filter((m) => {
        if (filter === 'all') return true;
        if (filter === 'H' || filter === 'S') return m.chamber === filter;
        return m.party === filter;
      })
      .sort((a, b) => (b.support || 0) + (b.oppose || 0) - ((a.support || 0) + (a.oppose || 0)))
      .slice(0, 15);
  }, [data, filter]);
  const max = Math.max(1, ...rows.map((m) => Math.max(m.support || 0, m.oppose || 0)));
  const net = (o.support || 0) - (o.oppose || 0);
  return (
    <CFCardState
      span={12}
      title="Outside money pressure"
      sub="Independent expenditures made by others for or against each member. Separate from the campaign's own spending."
      actions={
        <Pills
          label="Filter"
          value={filter}
          onChange={setFilter}
          size="sm"
          options={OUTSIDE_FILTERS}
        />
      }
      state={data?.ready && o.members ? 'ready' : 'unavailable'}
      bodyHeight={320}
      footer={
        <CardFoot
          updated={updated}
          covered={o.members ?? 0}
          label="members with outside spending"
        />
      }
    >
      <div className="cfi-omp">
        <div className="cfi-kpis cfi-kpis--stack">
          <Kpi label="Supporting" value={money(o.support)} tone="emerald" />
          <Kpi label="Opposing" value={money(o.oppose)} tone="amber" />
          <Kpi label="Net" value={money(net, { sign: true })} />
          <Kpi label="Members with records" value={o.members ?? null} />
        </div>
        <div className="cfi-diverge">
          <div className="cfi-diverge-head cfi-eyebrow">
            <span>Member</span>
            <span className="is-oppose">Opposing</span>
            <span className="is-support">Supporting</span>
            <span className="r">Net</span>
          </div>
          {rows.length ? (
            <ul>
              {rows.map((m) => {
                const n = (m.support || 0) - (m.oppose || 0);
                return (
                  <li key={m.id}>
                    <button type="button" className="cfi-diverge-row" onClick={() => onOpen(m.id)}>
                      <span className="cfi-diverge-who">
                        <b>{m.name}</b> <span className="cfi-mono cfi-muted">{seatLabel(m)}</span>
                      </span>
                      <span className="cfi-diverge-left" title={`Opposing ${money(m.oppose || 0)}`}>
                        <span style={{ width: `${((m.oppose || 0) / max) * 100}%` }} />
                      </span>
                      <span
                        className="cfi-diverge-right"
                        title={`Supporting ${money(m.support || 0)}`}
                      >
                        <span style={{ width: `${((m.support || 0) / max) * 100}%` }} />
                      </span>
                      <span className={`cfi-mono r ${n >= 0 ? 'is-pos' : 'is-neg'}`}>
                        {money(n, { sign: true })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="cfi-state-note">No records for this selection</p>
          )}
        </div>
      </div>
      <p className="cfi-note">
        Net is support minus opposition as reported. A positive net does not mean a member gained
        electorally. Showing the 15 members with the most outside spending for the filter.
      </p>
    </CFCardState>
  );
}

export function OutsideGroupExplorer({ data, updated, onOpen }) {
  const [mode, setMode] = useState('member');
  const members = useMemo(() => data?.members || [], [data]);
  const groups = data?.groups || [];
  const links = useMemo(() => data?.links || [], [data]);

  const byMember = useMemo(() => {
    const acc = new Map();
    for (const [mi, gi, side, amount] of links) {
      if (!acc.has(mi)) acc.set(mi, []);
      acc.get(mi).push({ gi, side, amount });
    }
    return [...acc.entries()]
      .map(([mi, list]) => ({
        member: members[mi],
        list: list.sort((a, b) => b.amount - a.amount),
        total: list.reduce((s, l) => s + l.amount, 0),
      }))
      .filter((r) => r.member)
      .sort((a, b) => b.total - a.total);
  }, [links, members]);

  const byGroup = useMemo(() => {
    const acc = new Map();
    for (const [mi, gi, side, amount] of links) {
      if (!acc.has(gi)) acc.set(gi, []);
      acc.get(gi).push({ mi, side, amount });
    }
    return acc;
  }, [links]);

  const [selMember, setSelMember] = useState(null);
  const [selGroup, setSelGroup] = useState(null);
  const activeMember = selMember ?? byMember[0]?.member?.id ?? null;
  const activeGroup = selGroup ?? 0;
  const memberRow = byMember.find((r) => r.member.id === activeMember) || null;
  const groupLinks = (byGroup.get(activeGroup) || []).slice().sort((a, b) => b.amount - a.amount);

  return (
    <CFCardState
      span={7}
      title="Who is spending on whom"
      sub="Select a member to see the outside groups, or switch to see a group's members"
      actions={
        <Pills
          label="View"
          value={mode}
          onChange={setMode}
          size="sm"
          options={[
            { key: 'member', label: 'By member' },
            { key: 'group', label: 'By group' },
          ]}
        />
      }
      state={data?.ready && links.length ? 'ready' : 'unavailable'}
      bodyHeight={360}
      footer={
        <CardFoot updated={updated}>
          <span>Showing up to 12 groups per member</span>
          <span>Not every outside group is listed</span>
        </CardFoot>
      }
    >
      <div className="cfi-linked">
        {mode === 'member' ? (
          <>
            <div className="cfi-linked-col">
              <div className="cfi-eyebrow cfi-linked-head">
                <span>Members, most outside money</span>
                <span>Groups</span>
              </div>
              <ul className="cfi-linked-list" role="listbox" aria-label="Members">
                {byMember.slice(0, 40).map((r) => (
                  <li key={r.member.id} role="option" aria-selected={r.member.id === activeMember}>
                    <button
                      type="button"
                      className={r.member.id === activeMember ? 'is-on' : undefined}
                      onClick={() => setSelMember(r.member.id)}
                    >
                      <span>{r.member.name}</span>
                      <span className="cfi-mono cfi-muted">{r.list.length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="cfi-linked-col">
              <div className="cfi-eyebrow cfi-linked-head is-accent">
                <span>Groups for {memberRow?.member?.name || 'member'}</span>
                <span>Amount</span>
              </div>
              <ul className="cfi-linked-list">
                {(memberRow?.list || []).map((l) => (
                  <li key={`${l.gi}-${l.side}`} className="cfi-linked-item">
                    <span>{groups[l.gi]?.name}</span>
                    <span className={`cfi-side is-${l.side === 'O' ? 'oppose' : 'support'}`}>
                      {l.side === 'O' ? 'Oppose' : 'Support'}
                    </span>
                    <span className="cfi-mono r">{money(l.amount)}</span>
                  </li>
                ))}
              </ul>
              {memberRow ? (
                <button
                  type="button"
                  className="cfi-link-btn"
                  onClick={() => onOpen(memberRow.member.id)}
                >
                  Open {memberRow.member.name}&apos;s profile
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="cfi-linked-col">
              <div className="cfi-eyebrow cfi-linked-head">
                <span>Groups, most spending</span>
                <span>Members</span>
              </div>
              <ul className="cfi-linked-list" role="listbox" aria-label="Outside groups">
                {groups.slice(0, 40).map((g, gi) => (
                  <li key={g.id} role="option" aria-selected={gi === activeGroup}>
                    <button
                      type="button"
                      className={gi === activeGroup ? 'is-on' : undefined}
                      onClick={() => setSelGroup(gi)}
                    >
                      <span>{g.name}</span>
                      <span className="cfi-mono cfi-muted">{g.members}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="cfi-linked-col">
              <div className="cfi-eyebrow cfi-linked-head is-accent">
                <span>Members for {groups[activeGroup]?.name || 'group'}</span>
                <span>Amount</span>
              </div>
              <ul className="cfi-linked-list">
                {groupLinks.map((l) => (
                  <li key={`${l.mi}-${l.side}`} className="cfi-linked-item">
                    <button
                      type="button"
                      className="cfi-link-btn"
                      onClick={() => onOpen(members[l.mi]?.id)}
                    >
                      {members[l.mi]?.name}
                    </button>
                    <span className={`cfi-side is-${l.side === 'O' ? 'oppose' : 'support'}`}>
                      {l.side === 'O' ? 'Oppose' : 'Support'}
                    </span>
                    <span className="cfi-mono r">{money(l.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </CFCardState>
  );
}

/* 51-tile US grid (row, column), from the approved design. */
export const US_TILES = [
  ['AK', 1, 1],
  ['ME', 1, 11],
  ['WI', 2, 6],
  ['VT', 2, 10],
  ['NH', 2, 11],
  ['WA', 3, 1],
  ['ID', 3, 2],
  ['MT', 3, 3],
  ['ND', 3, 4],
  ['MN', 3, 5],
  ['IL', 3, 6],
  ['MI', 3, 7],
  ['NY', 3, 9],
  ['MA', 3, 10],
  ['OR', 4, 1],
  ['NV', 4, 2],
  ['WY', 4, 3],
  ['SD', 4, 4],
  ['IA', 4, 5],
  ['IN', 4, 6],
  ['OH', 4, 7],
  ['PA', 4, 8],
  ['NJ', 4, 9],
  ['CT', 4, 10],
  ['RI', 4, 11],
  ['CA', 5, 1],
  ['UT', 5, 2],
  ['CO', 5, 3],
  ['NE', 5, 4],
  ['MO', 5, 5],
  ['KY', 5, 6],
  ['WV', 5, 7],
  ['VA', 5, 8],
  ['MD', 5, 9],
  ['DE', 5, 10],
  ['AZ', 6, 2],
  ['NM', 6, 3],
  ['KS', 6, 4],
  ['AR', 6, 5],
  ['TN', 6, 6],
  ['NC', 6, 7],
  ['SC', 6, 8],
  ['DC', 6, 9],
  ['OK', 7, 4],
  ['LA', 7, 5],
  ['MS', 7, 6],
  ['AL', 7, 7],
  ['GA', 7, 8],
  ['HI', 8, 1],
  ['TX', 8, 4],
  ['FL', 8, 9],
];

export function DonorGeography({ data, updated, cycle }) {
  const members = useMemo(() => (data?.members || []).filter((m) => m.hasStates), [data]);
  const defaultId = useMemo(
    () => [...members].sort((a, b) => (b.raised || 0) - (a.raised || 0))[0]?.id || null,
    [members],
  );
  const [picked, setPicked] = useState(null);
  const id = picked || defaultId;
  const member = members.find((m) => m.id === id) || null;
  const detail = useMemberDetail(id, cycle);
  const states = detail.member?.states || [];
  const level = new Map(states.map((s, i) => [s.state, 5 - Math.min(i, 4)]));
  const home = states.find((s) => s.state === member?.state) || null;
  const inShare = home ? share(home.total, member?.itemized) : null;

  let state = data?.ready && members.length ? 'ready' : 'unavailable';
  if (state === 'ready' && detail.status === 'loading') state = 'loading';
  if (state === 'ready' && detail.status === 'error') state = 'error';

  return (
    <CFCardState
      span={5}
      title="Donor geography"
      sub="Where itemized donors live, and how much is from out of state"
      actions={<MemberPicker members={members} value={id} onChange={setPicked} />}
      state={state}
      onRetry={detail.retry}
      bodyHeight={360}
      footer={
        <CardFoot updated={updated} covered={members.length} label="members with donor states" />
      }
    >
      <div
        className="cfi-tilemap"
        role="img"
        aria-label={`Top donor states for ${member?.name || 'the selected member'}`}
      >
        {US_TILES.map(([s, r, c]) => (
          <span
            key={s}
            className={`cfi-tile lv-${level.get(s) || 0}${s === member?.state ? ' is-home' : ''}`}
            style={{ gridRow: r, gridColumn: c }}
          >
            {s}
          </span>
        ))}
      </div>
      <div className="cfi-legend cfi-tilemap-legend">
        <span className="cfi-eyebrow">Fifth</span>
        {[1, 2, 3, 4, 5].map((l) => (
          <i key={l} className={`cfi-tile-key lv-${l}`} aria-hidden="true" />
        ))}
        <span className="cfi-eyebrow">First</span>
        <span className="cfi-eyebrow cfi-ml-auto">Member&apos;s top five donor states</span>
      </div>
      <div className="cfi-geo-cols">
        <div>
          <p className="cfi-eyebrow cfi-rule">Top donor states</p>
          {states.length ? (
            <ul className="cfi-mini-list">
              {states.map((s) => (
                <li key={s.state}>
                  <span>{s.name}</span>
                  <span className="cfi-mono">{money(s.total)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cfi-muted">Not available yet</p>
          )}
        </div>
        <div>
          <p className="cfi-eyebrow cfi-rule">
            {member?.name}
            {member?.state ? `, ${member.state}` : ''}
          </p>
          {inShare != null ? (
            <>
              <span className="cfi-split-bar cfi-split-bar--lg" aria-hidden="true">
                <span className="is-ind" style={{ width: `${inShare * 100}%` }} />
                <span className="is-out" style={{ width: `${(1 - inShare) * 100}%` }} />
              </span>
              <p className="cfi-row-split cfi-small">
                <span>
                  In state <b className="cfi-mono">{pct(inShare, 1)}</b>
                </span>
                <span>
                  Out of state <b className="cfi-mono">{pct(1 - inShare, 1)}</b>
                </span>
              </p>
            </>
          ) : (
            <p className="cfi-muted cfi-small">
              {states.length
                ? 'Home state is not among the top five donor states.'
                : 'Not available yet'}
            </p>
          )}
          <p className="cfi-note">Shares are of the member&apos;s itemized individual dollars.</p>
        </div>
      </div>
    </CFCardState>
  );
}

export function DonorIndustryAtlas() {
  return (
    <CFCardState
      span={7}
      title="Donor industry atlas"
      sub="Ezana's classification of donor reported employers, rolled up to Ezana sectors"
      state="unavailable"
      bodyHeight={300}
    />
  );
}

export function LobbyistConnections() {
  return (
    <CFCardState
      span={5}
      title="Lobbyist contributions and clients"
      sub="Trace a lobbying firm to its clients and the members it gave to"
      state="unavailable"
      bodyHeight={300}
    />
  );
}
