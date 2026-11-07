'use client';

/**
 * SonarRunPingBar (Nov 2026): the ping bar on a research answer (standard or deep), so a
 * reader can ask the next question from the results without going back first. Submitting
 * hands the words to the host (SonarExperience), which closes this run and pings through the
 * band, so the new answer loads behind the same Sonar loading screen as every other ping.
 *
 * Borderless per the Sonar card rule; tokens only. Styles in deep-research.css (sdr-ping).
 */
import { useId, useState } from 'react';

export function SonarRunPingBar({
  onPing,
  disabled = false,
  placeholder = 'Ping another question',
}) {
  const [value, setValue] = useState('');
  const id = useId();
  const submit = (e) => {
    e.preventDefault();
    const q = value.trim().slice(0, 600);
    if (!q || disabled) return;
    onPing?.(q);
  };
  return (
    <form className="sdr-ping" role="search" onSubmit={submit}>
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
      <button type="submit" className="sdr-ping-btn" disabled={disabled || !value.trim()}>
        Ping
        <i className="bi bi-arrow-up-right" aria-hidden="true" />
      </button>
    </form>
  );
}

export default SonarRunPingBar;
