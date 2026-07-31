'use client';

import { Search, Radar } from 'lucide-react';

/**
 * SonarQueryBar — the Ping input pill. Search icon + text input + emerald Ping
 * button. Used in the hero and, compact, in the sticky results bar. Controlled by
 * the page (the page owns query state + the backend call). The attach affordance
 * is intentionally omitted — Sonar has no file-query path yet, and a dead button
 * would mislead.
 */
export function SonarQueryBar({ value, onChange, onSubmit, loading = false, autoFocus = false }) {
  return (
    <form
      className="sonar-qbar"
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading && value.trim()) onSubmit(value);
      }}
    >
      <Search className="sonar-qbar-icon" size={18} aria-hidden />
      {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
      <input
        className="sonar-qbar-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ping anything — a person, a bank, a policy, a ticker…"
        aria-label="Sonar query"
        maxLength={800}
        autoFocus={autoFocus}
      />
      <button className="sonar-ping-btn" type="submit" disabled={loading || !value.trim()}>
        <Radar size={15} aria-hidden />
        {loading ? 'Sweeping…' : 'Ping'}
      </button>
    </form>
  );
}

export default SonarQueryBar;
