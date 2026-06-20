'use client';

import { cx } from './tokens';

/**
 * Controlled tab strip. `tabs` is an array of strings or { id, label, icon }.
 *   <Tabs tabs={[{id:'all',label:'All'}]} value={tab} onChange={setTab} />
 */
export function Tabs({ tabs = [], value, onChange, className }) {
  return (
    <div className={cx('ds-tabs', className)} role="tablist">
      {tabs.map((t) => {
        const tab = typeof t === 'string' ? { id: t, label: t } : t;
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className="ds-tab"
            onClick={() => onChange?.(tab.id)}
          >
            {tab.icon && (
              <i className={`bi ${tab.icon}`} aria-hidden="true" style={{ marginRight: 6 }} />
            )}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
