'use client';

/**
 * Countries ranked by deaths in organized violence over the last 12 months: change on the
 * prior 12 months, events, civilian deaths, dominant violence type and deadliest conflict.
 * Sortable, filterable by region; a row opens the country panel.
 */
import { useMemo, useState } from 'react';
import { changeText, countryRows, fmt } from '@/lib/ucdp/view';
import { Seg } from './ConflictMap';

const SORTS = [
  { id: 'best', label: 'Deaths' },
  { id: 'change', label: 'Change' },
  { id: 'events', label: 'Events' },
  { id: 'civilians', label: 'Civilians' },
];

export default function CountryTable({ overview, selected, onPick }) {
  const [sort, setSort] = useState('best');
  const [region, setRegion] = useState('all');
  const [all, setAll] = useState(false);
  const regions = useMemo(
    () => [
      { id: 'all', label: 'All regions' },
      ...(overview.regions || []).map((r) => ({ id: r.region, label: r.region })),
    ],
    [overview.regions],
  );
  const rows = useMemo(
    () => countryRows(overview, sort).filter((r) => region === 'all' || r.region === region),
    [overview, sort, region],
  );
  const shown = all ? rows : rows.slice(0, 15);
  return (
    <section className="cfx-card" aria-labelledby="cfx-table-h">
      <div className="cfx-card-head">
        <h2 className="cfx-card-title" id="cfx-table-h">
          Countries, last 12 months
        </h2>
        <div className="cfx-controls">
          <Seg label="Sort by" options={SORTS} value={sort} onChange={setSort} />
          <label className="cfx-select">
            <span className="cfx-sr">Region</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="cfx-table" role="table" aria-labelledby="cfx-table-h">
        <div className="cfx-tr cfx-th" role="row">
          <span role="columnheader">Country</span>
          <span role="columnheader">Deaths</span>
          <span role="columnheader">Change</span>
          <span role="columnheader">Events</span>
          <span role="columnheader">Civilians</span>
          <span role="columnheader">Main type</span>
          <span role="columnheader">Deadliest conflict</span>
        </div>
        {shown.map((r) => (
          <button
            key={r.iso3}
            type="button"
            role="row"
            className={`cfx-tr${selected === r.iso3 ? ' is-on' : ''}`}
            aria-selected={selected === r.iso3}
            onClick={() => onPick(r.iso3)}
          >
            <span role="cell" className="cfx-tname">
              <b>{r.country}</b>
              <small>{r.region}</small>
            </span>
            <span role="cell" className="cfx-mono" title={`Range ${fmt(r.low)} to ${fmt(r.high)}`}>
              {fmt(r.best)}
            </span>
            <span
              role="cell"
              className={`cfx-mono ${r.change == null ? '' : r.change >= 0 ? 'is-worse' : 'is-better'}`}
            >
              {changeText(r.change)}
            </span>
            <span role="cell" className="cfx-mono">
              {fmt(r.events)}
            </span>
            <span role="cell" className="cfx-mono">
              {fmt(r.civilians)}
            </span>
            <span role="cell" className={`cfx-type is-${r.dominant?.tone || 'none'}`}>
              {r.dominant?.label || 'n/a'}
            </span>
            <span role="cell" className="cfx-tconf">
              {r.top_conflict || 'n/a'}
            </span>
          </button>
        ))}
      </div>
      {rows.length > 15 ? (
        <button type="button" className="cfx-more" onClick={() => setAll((v) => !v)}>
          {all ? 'Show the top 15' : `Show all ${rows.length} countries`}
        </button>
      ) : null}
    </section>
  );
}
