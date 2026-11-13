'use client';

/**
 * SonarRunPingBar (Nov 2026): the ping bar on a research answer (standard or deep), so a
 * reader can ask the next question from the results without going back first. Submitting
 * hands the words to the host (SonarExperience), which closes this run and pings through the
 * band, so the new answer loads behind the same Sonar loading screen as every other ping.
 *
 * Borderless per the Sonar card rule; tokens only. Styles in deep-research.css (sdr-ping).
 *
 * Nov 7: on a finished research board the bar moves into the sections column (SonarRunNav,
 * the frame's navTop) as a compact, lighter field the width of that column, so it no longer
 * runs dark across the page and the answer moves up.
 *
 * Nov 13 (research workspace): on a finished board the bar is the workspace's query bar at the
 * top of the centre column (variant 'query', SonarAnswerQueryBar); Back stays in the sections
 * column (SonarRunNav). Same submit path as before: the words go to the host.
 */
import { useId, useState } from 'react';
import { SonarAnswerQueryBar } from './SonarAnswerQueryBar';

export function SonarRunPingBar({
  onPing,
  disabled = false,
  placeholder = 'Ping another question',
  /* 'bar' (the run bar), 'nav' (the sections column: icon-only submit) or 'query' (the
     workspace's query bar, holding the run's question). */
  variant = 'bar',
  initial = '',
}) {
  const [value, setValue] = useState('');
  const id = useId();
  if (variant === 'query') {
    return (
      <SonarAnswerQueryBar
        initial={initial}
        pending={disabled}
        onSubmit={(q) => onPing?.(q)}
        label="Ping another question"
      />
    );
  }
  const submit = (e) => {
    e.preventDefault();
    const q = value.trim().slice(0, 600);
    if (!q || disabled) return;
    onPing?.(q);
  };
  return (
    <form
      className={`sdr-ping${variant === 'nav' ? ' sdr-ping--nav' : ''}`}
      role="search"
      onSubmit={submit}
    >
      <label htmlFor={id} className="sdr-ping-label">
        Ping another question
      </label>
      <i className="bi bi-search sdr-ping-icon" aria-hidden="true" />
      <input
        id={id}
        name="q"
        className="sdr-ping-input"
        type="text"
        autoComplete="off"
        maxLength={600}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="submit"
        className="sdr-ping-btn"
        disabled={disabled || !value.trim()}
        aria-label={variant === 'nav' ? 'Ping' : undefined}
      >
        {variant === 'nav' ? null : 'Ping'}
        <i className="bi bi-arrow-up-right" aria-hidden="true" />
      </button>
    </form>
  );
}

/**
 * The top of the sections column on a finished research board, one row: Back (an icon button,
 * same action as the run bar's) and the compact ping bar.
 */
export function SonarRunNav({ onBack = null, onPing = null }) {
  if (!onBack && !onPing) return null;
  return (
    <div className="sdr-runnav">
      {onBack ? (
        <button
          type="button"
          className="sdr-runnav-back"
          onClick={onBack}
          aria-label="Back"
          title="Back"
        >
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </button>
      ) : null}
      {onPing ? <SonarRunPingBar onPing={onPing} variant="nav" placeholder="New question" /> : null}
    </div>
  );
}

export default SonarRunPingBar;
