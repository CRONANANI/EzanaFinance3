'use client';

import { Search, Radar, Paperclip } from 'lucide-react';

/**
 * SonarQueryBar, the Ping input pill. Shares the app-wide search pill design
 * (ds-search: transparent, no outline, blinking | caret at the start while
 * empty). `ghost` (Datasets page) also has no search icon or paperclip.
 * Search icon + text input + emerald Ping
 * button. Used in the hero and, compact, in the sticky results bar. Controlled by
 * the page (the page owns query state + the backend call). The paperclip is a
 * DECORATIVE affordance (aria-hidden, non-focusable) to match the design — Sonar
 * has no file-query path yet, so it is deliberately not an interactive control.
 */
export function SonarQueryBar({
  value,
  onChange,
  onSubmit,
  loading = false,
  disabled = false,
  autoFocus = false,
  compact = false,
  ghost = false,
}) {
  const empty = !value;
  const canSubmit = !loading && !disabled && Boolean(value.trim());
  const submit = (e) => {
    e.preventDefault();
    if (canSubmit) onSubmit(value);
  };

  /* Datasets overview hero (Oct 28 redesign, prefix dsi-; styles in
     app/datasets/sonar/orbital-map.css): the Ping field in a bracket frame
     with a split Ping button. Bootstrap Icons only. The sticky results bar
     (compact) keeps the shared pill below. */
  if (ghost && !compact) {
    return (
      <div className="dsi-pingframe">
        <span className="dsi-pingframe__c dsi-pingframe__c--tl" aria-hidden="true" />
        <span className="dsi-pingframe__c dsi-pingframe__c--tr" aria-hidden="true" />
        <span className="dsi-pingframe__c dsi-pingframe__c--bl" aria-hidden="true" />
        <span className="dsi-pingframe__c dsi-pingframe__c--br" aria-hidden="true" />
        <form className="dsi-ping" role="search" onSubmit={submit}>
          <i className="bi bi-search dsi-ping__icon" aria-hidden="true" />
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            id="dsi-ping-input"
            className="dsi-ping__input"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Try a person, a bank, a policy, a company, or a trend..."
            aria-label="Sonar query"
            maxLength={300}
            autoFocus={autoFocus}
            disabled={disabled}
          />
          <span className="dsi-ping__div" aria-hidden="true" />
          <button
            className="dsi-ping__btn"
            type="submit"
            disabled={!canSubmit}
            aria-label={loading ? 'Sweeping' : 'Ping Sonar'}
          >
            <span className="dsi-ping__main">
              <i className="bi bi-activity" aria-hidden="true" />
              <span>{loading ? 'Sweeping...' : 'Ping'}</span>
            </span>
            <span className="dsi-ping__arrow" aria-hidden="true">
              <i className="bi bi-arrow-right" />
            </span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      className={`sonar-qbar ds-search${ghost ? ' sonar-qbar--ghost' : ''}${ghost && empty ? ' is-empty' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading && !disabled && value.trim()) onSubmit(value);
      }}
    >
      {/* Oct 15: every search pill shares one design (ds-search in ds.css):
          no outline, transparent, and a blinking | where typing starts,
          drawn by .ds-search-input while the field is empty. The ghost bar
          (Datasets) also drops the search icon. */}
      {ghost ? null : <Search className="sonar-qbar-icon" size={18} aria-hidden />}
      {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
      <input
        className="sonar-qbar-input ds-search-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Try a person, a bank, a policy, a ticker..."
        aria-label="Sonar query"
        maxLength={300}
        autoFocus={autoFocus}
        disabled={disabled}
      />
      {!compact && !ghost && (
        <span className="sonar-qbar-attach" aria-hidden>
          <Paperclip size={17} />
        </span>
      )}
      <button
        className="sonar-ping-btn"
        type="submit"
        disabled={loading || disabled || !value.trim()}
      >
        <Radar size={15} aria-hidden />
        {loading ? 'Sweeping...' : 'Ping'}
      </button>
    </form>
  );
}

export default SonarQueryBar;
