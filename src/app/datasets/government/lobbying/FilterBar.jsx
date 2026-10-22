'use client';

/**
 * The sticky filter bar that drives every card (02-INTERACTIONS.json
 * filter_bar). Desktop: two rows. Phone: scrolling issue chips plus a
 * Filters chip opening a bottom sheet with the rest at 44px targets.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ENTITY_KEYS,
  MIN_STOPS,
  activeFilterCount,
  latestEndedQuarter,
  periodOptions,
  quarterOptions,
  resolvePeriod,
} from '@/lib/lobbying/page-model';
import {
  ENTITY_FILTER_LABEL,
  fmtCount,
  fmtMinStop,
  fmtPeriod,
  fmtQuarter,
} from '@/lib/lobbying/page-format';
import { CloseButton, Overlay, Segmented } from './ui';

const TOP_ISSUES = 12;

function periodSegment(period) {
  return /^\d{4}q[1-4]$/.test(period) ? 'quarter' : period;
}

function PeriodControls({ filters, set, nowMs, size }) {
  const options = periodOptions(nowMs).map((k) => ({
    value: k,
    label: k === 'quarter' ? 'Quarter' : k === '90d' ? '90 days' : fmtPeriod(k, nowMs),
  }));
  const seg = periodSegment(filters.period);
  return (
    <div className="lbx-fb-group">
      <Segmented
        label="Period"
        value={seg}
        options={options}
        size={size}
        onChange={(v) => set({ period: v === 'quarter' ? latestEndedQuarter(nowMs) : v })}
      />
      {seg === 'quarter' ? (
        <label className="lbx-select">
          <span className="lbx-sr">Quarter</span>
          <select
            value={filters.period}
            onChange={(e) => set({ period: e.target.value })}
            className="lbx-mono"
          >
            {quarterOptions(nowMs).map((k) => {
              const r = resolvePeriod(k, nowMs);
              return (
                <option key={k} value={k}>
                  {fmtQuarter(r.year, r.quarters[0])}
                </option>
              );
            })}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function EntityControl({ filters, set, size }) {
  return (
    <Segmented
      label="Government entity group"
      value={filters.entity}
      size={size}
      options={ENTITY_KEYS.map((k) => ({ value: k, label: ENTITY_FILTER_LABEL[k] }))}
      onChange={(v) => set({ entity: v })}
    />
  );
}

/* The slider moves locally and commits after a short pause (or on release),
   so dragging across stops refetches once, not once per stop. */
const MIN_COMMIT_MS = 250;

function MinControl({ filters, set, id }) {
  const committed = Math.max(0, MIN_STOPS.indexOf(filters.min));
  const [idx, setIdx] = useState(committed);
  useEffect(() => setIdx(committed), [committed]);
  useEffect(() => {
    if (idx === committed) return undefined;
    const t = setTimeout(() => set({ min: MIN_STOPS[idx] }), MIN_COMMIT_MS);
    return () => clearTimeout(t);
  }, [idx, committed, set]);
  const commitNow = () => {
    if (idx !== committed) set({ min: MIN_STOPS[idx] });
  };
  return (
    <div className="lbx-fb-min">
      <label className="lbx-kicker" htmlFor={id}>
        Min
      </label>
      <input
        id={id}
        type="range"
        className="lbx-range"
        min={0}
        max={MIN_STOPS.length - 1}
        step={1}
        value={idx}
        aria-valuetext={fmtMinStop(MIN_STOPS[idx])}
        style={{ '--lbx-range-fill': `${(idx / (MIN_STOPS.length - 1)) * 100}%` }}
        onChange={(e) => setIdx(Number(e.target.value))}
        onPointerUp={commitNow}
      />
      <span className="lbx-fb-minval lbx-mono" aria-hidden="true">
        {fmtMinStop(MIN_STOPS[idx])}
      </span>
    </div>
  );
}

function PublicToggle({ filters, set }) {
  return (
    <button
      type="button"
      className={`lbx-chip lbx-toggle${filters.public ? ' is-on' : ''}`}
      aria-pressed={filters.public}
      onClick={() => set({ public: !filters.public })}
    >
      <span className="lbx-switch" aria-hidden="true">
        <span />
      </span>
      Public companies only
    </button>
  );
}

/** Search with a short debounce so typing does not refetch every card. */
function SearchBox({ value, onCommit }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return undefined;
    const t = setTimeout(() => onCommit(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text, value, onCommit]);
  return (
    <label className="lbx-search">
      <i className="bi bi-search" aria-hidden="true" />
      <span className="lbx-sr">Search clients or firms</span>
      <input
        type="search"
        placeholder="Search clients or firms…"
        value={text}
        maxLength={80}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(text.trim());
        }}
      />
    </label>
  );
}

/** Searchable sheet with all 79 issue areas and their live counts. */
function IssueSheet({ issues, selected, onPick, onClose }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t
      ? issues.filter((i) => i.label.toLowerCase().includes(t) || i.code.toLowerCase() === t)
      : issues;
  }, [issues, q]);
  return (
    <Overlay kind="modal" label="All issue areas" onClose={onClose}>
      <div className="lbx-modal-head">
        <h2 className="lbx-title">All {issues.length} issue areas</h2>
        <CloseButton onClose={onClose} />
      </div>
      <label className="lbx-search lbx-search--block">
        <i className="bi bi-search" aria-hidden="true" />
        <span className="lbx-sr">Filter issue areas</span>
        <input
          type="search"
          placeholder="Filter issue areas…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <div className="lbx-issue-list" role="radiogroup" aria-label="Issue area">
        <button
          type="button"
          role="radio"
          aria-checked={!selected}
          className={`lbx-issue-opt${!selected ? ' is-on' : ''}`}
          onClick={() => onPick(null)}
        >
          <span>All issues</span>
        </button>
        {list.map((i) => (
          <button
            key={i.code}
            type="button"
            role="radio"
            aria-checked={selected === i.code}
            className={`lbx-issue-opt${selected === i.code ? ' is-on' : ''}`}
            onClick={() => onPick(i.code)}
          >
            <span>{i.label}</span>
            <span className="lbx-mono">{fmtCount(i.filings)}</span>
          </button>
        ))}
        {!list.length ? <p className="lbx-state">No issue area matches that search.</p> : null}
      </div>
    </Overlay>
  );
}

function IssueChips({ issues, selected, onPick, onPreview, onOpenAll, phone }) {
  const top = issues.slice(0, TOP_ISSUES);
  const extra =
    selected && !top.some((i) => i.code === selected)
      ? issues.find((i) => i.code === selected)
      : null;
  const shown = extra ? [extra, ...top] : top;
  return (
    <div className="lbx-fb-chips" role="radiogroup" aria-label="Issue area">
      <button
        type="button"
        role="radio"
        aria-checked={!selected}
        className={`lbx-chip${!selected ? ' is-on' : ''}`}
        onClick={() => onPick(null)}
      >
        All
      </button>
      {shown.map((i) => (
        <button
          key={i.code}
          type="button"
          role="radio"
          aria-checked={selected === i.code}
          className={`lbx-chip${selected === i.code ? ' is-on' : ''}`}
          onClick={() => onPick(i.code)}
          onPointerEnter={onPreview ? () => onPreview(i.code) : undefined}
          onFocus={onPreview ? () => onPreview(i.code) : undefined}
        >
          {i.label}
          {!phone ? <span className="lbx-mono">{fmtCount(i.filings)}</span> : null}
        </button>
      ))}
      {issues.length > TOP_ISSUES ? (
        <button type="button" className="lbx-chip" aria-haspopup="dialog" onClick={onOpenAll}>
          All {issues.length} issues…
        </button>
      ) : null}
    </div>
  );
}

/**
 * @param {{ filters, set:(patch)=>void, reset:()=>void, nowMs:number,
 *   issues:{code,label,filings}[], onPreviewIssue?:(code)=>void,
 *   filingCount:number|null }} props
 */
export default function FilterBar({
  filters,
  set,
  reset,
  nowMs,
  issues,
  onPreviewIssue,
  filingCount,
}) {
  const [sheet, setSheet] = useState(false);
  const [allIssues, setAllIssues] = useState(false);
  const count = activeFilterCount(filters, nowMs);
  const commitQ = useMemo(() => (q) => set({ q }), [set]);
  const pickIssue = (code) => {
    set({ issue: code });
    setAllIssues(false);
  };

  return (
    <div className="lbx-fb" role="region" aria-label="Filing filters">
      {/* desktop and tablet */}
      <div className="lbx-fb-desk">
        <div className="lbx-fb-row">
          <PeriodControls filters={filters} set={set} nowMs={nowMs} />
          <EntityControl filters={filters} set={set} />
          <MinControl filters={filters} set={set} id="lbx-min-desk" />
          <PublicToggle filters={filters} set={set} />
          <SearchBox value={filters.q} onCommit={commitQ} />
          <button type="button" className="lbx-link lbx-fb-reset" onClick={reset} disabled={!count}>
            Reset
          </button>
        </div>
        <IssueChips
          issues={issues}
          selected={filters.issue}
          onPick={pickIssue}
          onPreview={onPreviewIssue}
          onOpenAll={() => setAllIssues(true)}
        />
      </div>

      {/* phone */}
      <div className="lbx-fb-phone">
        <IssueChips
          issues={issues}
          selected={filters.issue}
          onPick={pickIssue}
          onPreview={onPreviewIssue}
          onOpenAll={() => setAllIssues(true)}
          phone
        />
        <button
          type="button"
          className="lbx-chip lbx-fb-open"
          aria-haspopup="dialog"
          onClick={() => setSheet(true)}
        >
          <i className="bi bi-sliders" aria-hidden="true" />
          Filters
          {count ? <span className="lbx-mono">{count}</span> : null}
        </button>
      </div>

      {sheet ? (
        <Overlay kind="sheet" label="Filters" onClose={() => setSheet(false)}>
          <div className="lbx-modal-head">
            <h2 className="lbx-title">Filters</h2>
            <CloseButton onClose={() => setSheet(false)} />
          </div>
          <div className="lbx-sheet-body">
            <p className="lbx-kicker">Period</p>
            <PeriodControls filters={filters} set={set} nowMs={nowMs} size="lg" />
            <p className="lbx-kicker">Government entity</p>
            <EntityControl filters={filters} set={set} size="lg" />
            <MinControl filters={filters} set={set} id="lbx-min-sheet" />
            <PublicToggle filters={filters} set={set} />
            <SearchBox value={filters.q} onCommit={commitQ} />
          </div>
          <div className="lbx-sheet-foot">
            <button
              type="button"
              className="lbx-btn lbx-btn--ghost"
              onClick={reset}
              disabled={!count}
            >
              Reset
            </button>
            <button type="button" className="lbx-btn" onClick={() => setSheet(false)}>
              {filingCount != null ? `Show ${fmtCount(filingCount)} filings` : 'Show filings'}
            </button>
          </div>
        </Overlay>
      ) : null}

      {allIssues ? (
        <IssueSheet
          issues={issues}
          selected={filters.issue}
          onPick={pickIssue}
          onClose={() => setAllIssues(false)}
        />
      ) : null}
    </div>
  );
}
