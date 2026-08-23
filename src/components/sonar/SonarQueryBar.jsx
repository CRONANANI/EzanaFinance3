'use client';

import { Search, Radar, Paperclip } from 'lucide-react';

/**
 * SonarQueryBar — the Ping input pill. Search icon + text input + emerald Ping
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
}) {
  return (
    <form
      className="sonar-qbar"
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading && !disabled && value.trim()) onSubmit(value);
      }}
    >
      <Search className="sonar-qbar-icon" size={18} aria-hidden />
      {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
      <input
        className="sonar-qbar-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Try a person, a bank, a policy, a ticker..."
        aria-label="Sonar query"
        maxLength={300}
        autoFocus={autoFocus}
        disabled={disabled}
      />
      {!compact && (
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
