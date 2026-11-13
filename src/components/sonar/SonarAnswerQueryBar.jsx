'use client';

/**
 * SonarAnswerQueryBar (Sonar research workspace, Nov 13 2026): the one query bar at the top of the
 * centre column on every answered Sonar page, the band's answer boards on /datasets and a
 * standard or deep research run alike. Presentation only: the host owns the submit path
 * (auth, quota and the loader stay exactly where they were), so this is never a second search
 * mechanism.
 *
 * 920px wide at most, centred, 56px tall, an emerald border with a soft glow (the one Sonar
 * surface that keeps a border), the question in a 16px semibold field, Clear (empties the
 * field and focuses it) and Ping inside the bar. Enter or Ping submits; while a ping is in
 * flight Ping shows the loading state and is disabled. Styles: sonar-answer-query-bar.css (sqb-).
 */

import { useId, useRef, useState } from 'react';
import './sonar-answer-query-bar.css';

/**
 * value / onChange  a controlled field (the band); leave both out for an uncontrolled one
 * initial           the uncontrolled field's first value (the run's question)
 * onSubmit(q)       the host's ping path, with the trimmed question
 * pending           a ping is in flight
 * inputRef          the host's ref to the field (focus on an empty submit)
 */
export function SonarAnswerQueryBar({
  value,
  onChange,
  initial = '',
  onSubmit,
  pending = false,
  inputRef = null,
  label = 'Ask Sonar a question',
  placeholder = 'Ask about a company, person, country or policy',
  maxLength = 600,
}) {
  const id = useId();
  const own = useRef(null);
  const ref = inputRef || own;
  const controlled = typeof value === 'string';
  const [local, setLocal] = useState(initial || '');
  const current = controlled ? value : local;
  const set = (v) => (controlled ? onChange?.(v) : setLocal(v));
  const submit = (e) => {
    e.preventDefault();
    const q = String(current || '')
      .trim()
      .slice(0, maxLength);
    if (!q) {
      ref.current?.focus();
      return;
    }
    if (pending) return;
    onSubmit?.(q);
  };
  const clear = () => {
    set('');
    ref.current?.focus();
  };
  return (
    <form className="sqb" role="search" onSubmit={submit}>
      <label htmlFor={id} className="sqb-label">
        {label}
      </label>
      <i className="bi bi-search sqb-icon" aria-hidden="true" />
      <input
        ref={ref}
        id={id}
        name="q"
        className="sqb-input"
        type="text"
        autoComplete="off"
        maxLength={maxLength}
        value={current}
        placeholder={placeholder}
        onChange={(e) => set(e.target.value)}
      />
      {current ? (
        <button type="button" className="sqb-clear" onClick={clear}>
          Clear
        </button>
      ) : null}
      <button
        type="submit"
        className="sqb-ping"
        disabled={pending}
        aria-busy={pending || undefined}
      >
        <i
          className={`bi ${pending ? 'bi-arrow-repeat sqb-spin' : 'bi-broadcast'}`}
          aria-hidden="true"
        />
        {pending ? 'Pinging' : 'Ping'}
      </button>
    </form>
  );
}

export default SonarAnswerQueryBar;
