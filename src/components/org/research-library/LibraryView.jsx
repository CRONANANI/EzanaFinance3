'use client';

import {
  FILTER_KEYS,
  FILTER_LABEL,
  LOAD_LIMIT,
  NA,
  VISIBILITY_LABEL,
  docTypeLabel,
  fmtDate,
  fmtInt,
  hasFilters,
  statusLabel,
} from '@/lib/org-research-library-model';
import { Section, SectionError, Skel } from '@/components/org/command-center/parts';
import { DocumentBody } from './DocumentBody';
import { FilterMenu, Flags, Mono, OpenTitle, PinSlot, StatusText } from './parts';

const updatedOf = (n) => n.updated_at || n.created_at;

function optionsFor(key, facets, selected, authorNames) {
  const counts = facets?.[key] || {};
  const label = (v) =>
    key === 'type'
      ? docTypeLabel(v)
      : key === 'status'
        ? statusLabel(v)
        : key === 'author'
          ? authorNames?.[v] || 'Member'
          : v;
  const values = new Set([...Object.keys(counts), ...selected]);
  return [...values]
    .map((v) => ({ value: v, label: label(v), count: counts[v] || 0 }))
    .sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)));
}

/** Borderless search line: an icon and grey placeholder. */
export function SearchLine({ value, onChange }) {
  return (
    <label className="orl-search">
      <i className="bi bi-search" aria-hidden="true" />
      <span className="tcc-sr">Search the library</span>
      <input
        type="search"
        className="orl-search__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search titles, abstracts, bodies, tickers, tags"
        maxLength={200}
      />
    </label>
  );
}

/** Six filters with live counts, the read-only search mode on the right. */
export function FilterRow({ facets, authorNames, filters, onFilters, semantic }) {
  const set = (key, vals) => onFilters({ ...filters, [key]: vals });
  return (
    <div className="orl-filters">
      <div className="orl-filters__menus">
        {FILTER_KEYS.map((k) => (
          <FilterMenu
            key={k}
            label={FILTER_LABEL[k]}
            options={optionsFor(k, facets, filters[k] || [], authorNames)}
            selected={filters[k] || []}
            onToggle={(v) => {
              const cur = filters[k] || [];
              set(k, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]);
            }}
            onClear={() => set(k, [])}
          />
        ))}
        {hasFilters(filters) && (
          <button
            type="button"
            className="tcc-textbtn tcc-textbtn--accent"
            onClick={() => onFilters(Object.fromEntries(FILTER_KEYS.map((k) => [k, []])))}
          >
            Clear filters
          </button>
        )}
      </div>
      <span
        className="orl-mode"
        title={
          semantic?.configured
            ? 'This deployment ranks search results by meaning as well as by keyword. It is a deployment setting.'
            : 'Search matches keywords. Ranking by meaning is not switched on for this deployment.'
        }
      >
        <i className={`bi ${semantic?.configured ? 'bi-stars' : 'bi-search'}`} aria-hidden="true" />
        {semantic?.configured ? 'Semantic search' : 'Keyword search'}
      </span>
    </div>
  );
}

function SkelRows({ n = 5, cols = 'orl-row--lib' }) {
  return Array.from({ length: n }).map((_, i) => (
    <div key={i} className={`orl-row ${cols} orl-row--skel`} aria-hidden="true">
      <Skel w="70%" h={12} />
      <Skel w="70%" h={10} />
      <Skel w="60%" h={10} />
      <Skel w="50%" h={10} />
    </div>
  ));
}

/* ── Needs review (managers) or the viewer's own work in progress ───────── */

export function ReviewShelf({ status, shelves, isManager, onOpen, onRetry, onNew }) {
  const rows = isManager ? shelves?.review || [] : shelves?.mine || [];
  const id = 'orl-review';
  const sub = isManager
    ? `Under review, longest waiting first, ${rows.length} ${rows.length === 1 ? 'document' : 'documents'}`
    : `Your drafts and documents under review, ${rows.length}`;
  return (
    <Section
      id={id}
      title={isManager ? 'Needs review' : 'Your work in progress'}
      className="orl-block"
      aside={status === 'ready' ? <span className="orl-sub">{sub}</span> : null}
    >
      {status === 'error' ? (
        <SectionError message="The review queue could not be loaded." onRetry={onRetry} />
      ) : (
        <div
          className="orl-table"
          role="table"
          aria-labelledby={id}
          aria-busy={status === 'loading'}
        >
          <div className="orl-row orl-row--review orl-row--head" role="row">
            <span role="columnheader">Document</span>
            <span role="columnheader">{isManager ? 'Author' : 'Status'}</span>
            <span role="columnheader" className="orl-num">
              Ver.
            </span>
            <span role="columnheader">Updated</span>
            <span role="columnheader" className="orl-num">
              Open blocks
            </span>
            <span role="columnheader" className="orl-num">
              <span className="tcc-sr">Action</span>
            </span>
          </div>
          {status === 'loading' ? (
            <SkelRows n={3} cols="orl-row--review" />
          ) : rows.length === 0 ? (
            <p className="tcc-state">
              <span>
                {isManager
                  ? 'Nothing is waiting for review.'
                  : 'You have no drafts or documents under review.'}
              </span>
              {!isManager && onNew ? (
                <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onNew}>
                  New note
                </button>
              ) : null}
            </p>
          ) : (
            rows.map((n) => (
              <div key={n.id} className="orl-row orl-row--review" role="row">
                <span role="cell" className="orl-doc">
                  <OpenTitle note={n} onOpen={onOpen} tab={isManager ? 'review' : null} />
                  <span className="orl-docsub">
                    <span>{docTypeLabel(n.doc_type)}</span>
                    {n.ticker && <Mono className="orl-ticker">{n.ticker}</Mono>}
                  </span>
                </span>
                <span role="cell" className="orl-clip">
                  {isManager ? n.author_name || NA : <StatusText status={n.status} />}
                </span>
                <span role="cell" className="orl-num">
                  <Mono>v{n.version || 1}</Mono>
                </span>
                <span role="cell">
                  <Mono>{fmtDate(updatedOf(n))}</Mono>
                </span>
                <span role="cell" className="orl-num">
                  {n.open_blocks > 0 ? (
                    <span className="orl-warn">
                      <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                      <Mono>{n.open_blocks}</Mono> open
                    </span>
                  ) : (
                    <span className="orl-muted">None</span>
                  )}
                </span>
                <span role="cell" className="orl-num">
                  <button
                    type="button"
                    className="tcc-textbtn tcc-textbtn--accent orl-rowact"
                    onClick={() => onOpen(n.id, isManager ? 'review' : null)}
                  >
                    {isManager ? 'Review' : 'Open'}
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </Section>
  );
}

/* ── The library ─────────────────────────────────────────────────────────── */

export function LibraryTable({
  status,
  notes,
  query,
  filtered,
  truncated,
  onOpen,
  onRetry,
  onNew,
  onClear,
  summary,
}) {
  const id = 'orl-library';
  return (
    <Section
      id={id}
      title="Research library"
      className="orl-block"
      aside={
        status === 'ready' ? (
          <span className="orl-sub">
            <Mono>{fmtInt(notes.length)}</Mono> {notes.length === 1 ? 'document' : 'documents'},
            pinned first, then {query ? 'by relevance' : 'newest first'}
          </span>
        ) : null
      }
    >
      {summary}
      {status === 'error' ? (
        <SectionError message="Could not load the library." onRetry={onRetry} />
      ) : (
        <div
          className="orl-table"
          role="table"
          aria-labelledby={id}
          aria-busy={status === 'loading'}
        >
          <div className="orl-row orl-row--lib orl-row--head" role="row">
            <span role="columnheader">Document</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Visibility</span>
            <span role="columnheader">Term</span>
            <span role="columnheader" className="orl-num">
              Ver.
            </span>
            <span role="columnheader" className="orl-num">
              Files
            </span>
            <span role="columnheader" className="orl-num">
              Comments
            </span>
            <span role="columnheader" className="orl-num">
              Updated
            </span>
          </div>
          {status === 'loading' ? (
            <SkelRows n={7} />
          ) : notes.length === 0 ? (
            filtered ? (
              <p className="tcc-state">
                <span>No documents match your search and filters.</span>
                <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onClear}>
                  Clear filters
                </button>
              </p>
            ) : (
              <p className="tcc-state">
                <span>The library is empty.</span>
                <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onNew}>
                  New note
                </button>
              </p>
            )
          ) : (
            notes.map((n) => (
              <div key={n.id} className="orl-row orl-row--lib" role="row">
                <span role="cell" className="orl-doc orl-doc--pin">
                  <PinSlot pinned={n.pinned} />
                  <span className="orl-doc__text">
                    <OpenTitle note={n} onOpen={onOpen} />
                    <span className="orl-docsub">
                      <span>{docTypeLabel(n.doc_type)}</span>
                      {n.ticker && <Mono className="orl-ticker">{n.ticker}</Mono>}
                      <span className="orl-clip">{n.author_name || NA}</span>
                      <Flags note={n} />
                    </span>
                  </span>
                </span>
                <span role="cell">
                  <StatusText status={n.status} />
                </span>
                <span role="cell" className="orl-clip">
                  {VISIBILITY_LABEL[n.visibility] || NA}
                </span>
                <span role="cell" className="orl-clip">
                  <Mono>{n.term || NA}</Mono>
                </span>
                <span role="cell" className="orl-num">
                  <Mono>v{n.version || 1}</Mono>
                </span>
                <span role="cell" className="orl-num">
                  <Mono>{n.file_count ?? 0}</Mono>
                </span>
                <span role="cell" className="orl-num">
                  <Mono>{n.comment_count ?? 0}</Mono>
                </span>
                <span role="cell" className="orl-num">
                  <Mono>{fmtDate(updatedOf(n))}</Mono>
                </span>
              </div>
            ))
          )}
        </div>
      )}
      {status === 'ready' && truncated && (
        <p className="orl-foot">
          The library loads the newest <Mono>{fmtInt(LOAD_LIMIT)}</Mono> documents (pinned first).
          Older documents are not listed; search and filters work within these.
        </p>
      )}
    </Section>
  );
}

/** Summarize this set: the assistant's synthesis of up to 40 listed documents. */
export function SetSummary({ state, count, onRun, onClose }) {
  if (count === 0 && !state) return null;
  return (
    <div className="orl-setsum">
      {!state || state.status === 'idle' ? (
        <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onRun}>
          <i className="bi bi-stars" aria-hidden="true" />
          Summarize this set
          <span className="orl-muted">
            (first <Mono>{Math.min(count, 40)}</Mono> listed)
          </span>
        </button>
      ) : state.status === 'loading' ? (
        <p className="tcc-state" role="status">
          <i className="bi bi-arrow-repeat orl-spin" aria-hidden="true" />
          <span>Writing a summary of the listed documents</span>
        </p>
      ) : state.status === 'error' ? (
        <p className="tcc-state tcc-state--error" role="alert">
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          <span>{state.text}</span>
          {state.retry ? (
            <button type="button" className="tcc-textbtn tcc-textbtn--accent" onClick={onRun}>
              Retry
            </button>
          ) : null}
          <button type="button" className="tcc-textbtn" onClick={onClose}>
            Dismiss
          </button>
        </p>
      ) : (
        <div className="orl-aibox" role="region" aria-label="Summary of the listed documents">
          <div className="orl-aibox__head">
            <span>
              <i className="bi bi-stars" aria-hidden="true" /> Summary of the listed documents,
              written by Ezana&apos;s assistant on request and not saved
            </span>
            <button type="button" className="tcc-textbtn" onClick={onClose}>
              Dismiss
            </button>
          </div>
          <DocumentBody text={state.text} />
        </div>
      )}
    </div>
  );
}

/* ── Published exemplars ─────────────────────────────────────────────────── */

export function Exemplars({ status, rows, canMark, onOpen, onRetry }) {
  const id = 'orl-exemplars';
  return (
    <Section
      id={id}
      title="Published exemplars"
      className="orl-block"
      aside={
        status === 'ready' ? (
          <span className="orl-sub">
            Marked by managers for new members, <Mono>{rows.length}</Mono>
          </span>
        ) : null
      }
    >
      {status === 'error' ? (
        <SectionError message="Exemplars could not be loaded." onRetry={onRetry} />
      ) : (
        <div
          className="orl-table"
          role="table"
          aria-labelledby={id}
          aria-busy={status === 'loading'}
        >
          <div className="orl-row orl-row--ex orl-row--head" role="row">
            <span role="columnheader">Document</span>
            <span role="columnheader">Type</span>
            <span role="columnheader">Ticker</span>
            <span role="columnheader">Term</span>
            <span role="columnheader" className="orl-num">
              Updated
            </span>
          </div>
          {status === 'loading' ? (
            <SkelRows n={2} cols="orl-row--ex" />
          ) : rows.length === 0 ? (
            <p className="tcc-state">
              <span>
                {canMark
                  ? 'No exemplars yet. Open a published document and choose Mark exemplar.'
                  : 'No exemplars yet. Managers mark them from published documents.'}
              </span>
            </p>
          ) : (
            rows.map((n) => (
              <div key={n.id} className="orl-row orl-row--ex" role="row">
                <span role="cell" className="orl-doc orl-doc--pin">
                  <span className="orl-pin orl-gold" aria-hidden="true">
                    <i className="bi bi-award" />
                  </span>
                  <span className="orl-doc__text">
                    <OpenTitle note={n} onOpen={onOpen} />
                    <span className="orl-docsub">
                      <span className="orl-clip">{n.author_name || NA}</span>
                    </span>
                  </span>
                </span>
                <span role="cell" className="orl-clip">
                  {docTypeLabel(n.doc_type)}
                </span>
                <span role="cell">
                  <Mono className="orl-ticker">{n.ticker || NA}</Mono>
                </span>
                <span role="cell" className="orl-clip">
                  <Mono>{n.term || NA}</Mono>
                </span>
                <span role="cell" className="orl-num">
                  <Mono>{fmtDate(updatedOf(n))}</Mono>
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </Section>
  );
}
