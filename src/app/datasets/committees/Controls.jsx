'use client';

/**
 * The sticky control bar (02-INTERACTIONS.json controls): view switch,
 * chamber, party, sector chips, one grouped search over committees and
 * members. Phone: chamber chips plus a Filters chip opening a bottom sheet.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeChip, Overlay, PartyTag, SeatLabel, Segmented } from './ui';

const VIEWS = [
  { value: 'committees', label: 'Committees' },
  { value: 'members', label: 'Members' },
];
const CHAMBERS = [
  { value: 'all', label: 'All' },
  { value: 'house', label: 'House' },
  { value: 'senate', label: 'Senate' },
  { value: 'joint', label: 'Joint' },
];
const PARTIES = [
  { value: 'all', label: 'ALL' },
  { value: 'D', label: 'D' },
  { value: 'R', label: 'R' },
  { value: 'I', label: 'I' },
];

function SectorChipRow({ sectors, value, onChange }) {
  return (
    <div className="cmx-chiprow" role="radiogroup" aria-label="Sector">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'all'}
        className={`cmx-filterchip${value === 'all' ? ' is-on' : ''}`}
        onClick={() => onChange('all')}
      >
        All
      </button>
      {sectors.map((s) => (
        <button
          key={s.key}
          type="button"
          role="radio"
          aria-checked={value === s.key}
          className={`cmx-filterchip${value === s.key ? ' is-on' : ''}`}
          onClick={() => onChange(s.key)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/**
 * One search box over committees and members; results grouped, a listbox
 * with arrow keys, Enter selects, Escape clears.
 */
export function GroupedSearch({
  committees,
  members,
  onCommittee,
  onMember,
  idBase = 'cmx-search',
  value,
  onValue,
}) {
  const [local, setLocal] = useState('');
  const q = value ?? local;
  const setQ = onValue || setLocal;
  const [active, setActive] = useState(0);
  const boxRef = useRef(null);
  const t = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!t) return [];
    const com = committees
      .filter(
        (c) =>
          c.shortName.toLowerCase().includes(t) ||
          c.name.toLowerCase().includes(t) ||
          c.thomasId.toLowerCase() === t,
      )
      .slice(0, 5)
      .map((c) => ({ kind: 'committee', id: c.thomasId, c }));
    const mem = members
      .filter((m) => m.name.toLowerCase().includes(t) || (m.state || '').toLowerCase() === t)
      .slice(0, 6)
      .map((m) => ({ kind: 'member', id: m.bioguideId, m }));
    return [...com, ...mem];
  }, [committees, members, t]);

  useEffect(() => setActive(0), [t]);

  const pick = (r) => {
    setQ('');
    if (r.kind === 'committee') onCommittee(r.id);
    else onMember(r.id);
  };
  const onKeyDown = (e) => {
    if (!results.length) {
      if (e.key === 'Escape') setQ('');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setQ('');
    }
  };

  let lastKind = null;
  return (
    <div className="cmx-search" ref={boxRef}>
      <i className="bi bi-search" aria-hidden="true" />
      <input
        type="search"
        placeholder="Search committees or members…"
        aria-label="Search committees or members"
        role="combobox"
        aria-expanded={Boolean(t)}
        aria-controls={`${idBase}-list`}
        aria-activedescendant={results.length ? `${idBase}-opt-${active}` : undefined}
        value={q}
        maxLength={80}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {t ? (
        <ul
          className="cmx-results"
          id={`${idBase}-list`}
          role="listbox"
          aria-label="Search results"
        >
          {results.map((r, i) => {
            const header = r.kind !== lastKind;
            lastKind = r.kind;
            return (
              <li key={`${r.kind}-${r.id}`}>
                {header ? (
                  <p className="cmx-results-group" aria-hidden="true">
                    {r.kind === 'committee' ? 'Committees' : 'Members'}
                  </p>
                ) : null}
                <button
                  type="button"
                  role="option"
                  id={`${idBase}-opt-${i}`}
                  aria-selected={i === active}
                  className={`cmx-result${i === active ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(r)}
                >
                  {r.kind === 'committee' ? (
                    <>
                      <span className="cmx-ellipsis">{r.c.shortName}</span>
                      <CodeChip code={r.c.thomasId} />
                    </>
                  ) : (
                    <>
                      <span className="cmx-ellipsis">
                        {r.m.name} <PartyTag party={r.m.party} />
                      </span>
                      <SeatLabel member={r.m} />
                    </>
                  )}
                </button>
              </li>
            );
          })}
          {!results.length ? (
            <li className="cmx-results-none">No committee or member matches.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * @param {{ filters:{view,chamber,party,sector}, set:(patch)=>void,
 *   reset:()=>void, activeCount:number, sectors:{key,label}[],
 *   committees:[], members:[], onCommittee, onMember }} props
 */
export default function Controls({
  filters,
  set,
  reset,
  activeCount,
  sectors,
  committees,
  members,
  onCommittee,
  onMember,
}) {
  const [sheet, setSheet] = useState(false);
  return (
    <div className="cmx-controls" role="region" aria-label="Page filters">
      <div className="cmx-controls-desk">
        <div className="cmx-controls-row">
          <Segmented
            label="View"
            value={filters.view}
            options={VIEWS}
            onChange={(v) => set({ view: v })}
          />
          <Segmented
            label="Chamber"
            value={filters.chamber}
            options={CHAMBERS}
            onChange={(v) => set({ chamber: v })}
          />
          <Segmented
            label="Party"
            value={filters.party}
            options={PARTIES}
            mono
            onChange={(v) => set({ party: v })}
          />
          <GroupedSearch
            committees={committees}
            members={members}
            onCommittee={onCommittee}
            onMember={onMember}
            value={filters.q}
            onValue={(q) => set({ q })}
          />
        </div>
        <SectorChipRow
          sectors={sectors}
          value={filters.sector}
          onChange={(v) => set({ sector: v })}
        />
      </div>

      <div className="cmx-controls-phone">
        <div className="cmx-chiprow" role="radiogroup" aria-label="Chamber">
          {CHAMBERS.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={filters.chamber === c.value}
              className={`cmx-filterchip${filters.chamber === c.value ? ' is-on' : ''}`}
              onClick={() => set({ chamber: c.value })}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="cmx-filterchip cmx-filterchip--open"
          aria-haspopup="dialog"
          onClick={() => setSheet(true)}
        >
          <i className="bi bi-sliders" aria-hidden="true" />
          Filters
          {activeCount ? <span className="cmx-mono">{activeCount}</span> : null}
        </button>
      </div>

      {sheet ? (
        <Overlay label="Filters" onClose={() => setSheet(false)}>
          <div className="cmx-sheet-head">
            <h2 className="cmx-title">Filters</h2>
            <button
              type="button"
              className="cmx-btn cmx-btn--icon"
              aria-label="Close filters"
              onClick={() => setSheet(false)}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
          <div className="cmx-sheet-body">
            <p className="cmx-kicker">View</p>
            <Segmented
              label="View"
              value={filters.view}
              options={VIEWS}
              size="lg"
              onChange={(v) => set({ view: v })}
            />
            <p className="cmx-kicker">Party</p>
            <Segmented
              label="Party"
              value={filters.party}
              options={PARTIES}
              mono
              size="lg"
              onChange={(v) => set({ party: v })}
            />
            <p className="cmx-kicker">Sector</p>
            <SectorChipRow
              sectors={sectors}
              value={filters.sector}
              onChange={(v) => set({ sector: v })}
            />
            <p className="cmx-kicker">Search</p>
            <GroupedSearch
              committees={committees}
              members={members}
              idBase="cmx-search-sheet"
              onCommittee={(id) => {
                setSheet(false);
                onCommittee(id);
              }}
              onMember={(id) => {
                setSheet(false);
                onMember(id);
              }}
            />
          </div>
          <div className="cmx-sheet-foot">
            <button
              type="button"
              className="cmx-btn cmx-btn--ghost"
              onClick={reset}
              disabled={!activeCount}
            >
              Reset
            </button>
            <button type="button" className="cmx-btn" onClick={() => setSheet(false)}>
              Done
            </button>
          </div>
        </Overlay>
      ) : null}
    </div>
  );
}
