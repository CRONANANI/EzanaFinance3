'use client';

/** Wrap a legacy settings panel so it fits inside the Ledger shell. */
export function wrapLegacyPanel(Panel) {
  function Wrapped(props) {
    return (
      <div className="sl-legacy-panel sl-legacy-panel--hide-header">
        <Panel {...props} />
      </div>
    );
  }
  Wrapped.displayName = `Ledger(${Panel.displayName || Panel.name || 'Panel'})`;
  return Wrapped;
}
