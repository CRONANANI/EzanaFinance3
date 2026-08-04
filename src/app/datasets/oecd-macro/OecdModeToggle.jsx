'use client';

/**
 * Head-to-head card mode toggle: OECD indicators (20) vs Empire dimensions (18).
 * Independent of the lens pills — the lens drives OECD mode only. Rendered in the
 * radar card header and in the empire-unavailable card so the control is always
 * reachable regardless of empire data state.
 */
export default function OecdModeToggle({ mode, onMode }) {
  return (
    <div className="oecd-modeseg" role="group" aria-label="Head-to-head comparison mode">
      <button
        type="button"
        className={mode === 'oecd' ? 'is-active' : ''}
        aria-pressed={mode === 'oecd'}
        onClick={() => mode !== 'oecd' && onMode('oecd')}
      >
        OECD INDICATORS · 20
      </button>
      <button
        type="button"
        className={mode === 'empire' ? 'is-active' : ''}
        aria-pressed={mode === 'empire'}
        onClick={() => mode !== 'empire' && onMode('empire')}
      >
        EMPIRE DIMENSIONS · 18
      </button>
    </div>
  );
}
