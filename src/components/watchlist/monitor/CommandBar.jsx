'use client';

/**
 * Watchlist command bar (Market Monitor 2.0, Nov 2026): the one list
 * selector (the active list's name as a Dropdown trigger), the Smart badge
 * when an enabled rule fills the list, and the page actions. No page title:
 * the list name is the control. Styles: watchlist.css (wlm-cmd).
 */
import { Dropdown, MenuItem } from '@/components/ds';

/**
 * lists        useWatchlists().watchlists
 * activeList   the list on screen
 * smartActive  true when an enabled smart rule fills the active list
 */
export function CommandBar({
  lists,
  activeList,
  smartActive,
  onListChange,
  onCreateList,
  onAddAsset,
  onCreateRule,
}) {
  const count = activeList?.stocks?.length || 0;
  return (
    <div className="wlm-cmd">
      <div className="wlm-cmd__list">
        <Dropdown
          trigger={
            <span
              className="wlm-cmd__trigger"
              aria-label={`Watchlist: ${activeList?.label || 'none'}. Switch list`}
            >
              <span className="wlm-cmd__name">{activeList?.label || 'Watchlist'}</span>
              <span className="wlm-num wlm-muted wlm-cmd__count">{count}</span>
              <i className="bi bi-chevron-down" aria-hidden="true" />
            </span>
          }
        >
          {lists.map((l) => (
            <MenuItem
              key={l.id}
              icon={
                l.id === activeList?.id
                  ? 'bi-check-lg'
                  : l.smart
                    ? 'bi-lightning-charge'
                    : undefined
              }
              onClick={() => onListChange(l.id)}
            >
              {l.label} <span className="wlm-num wlm-muted">({l.stocks?.length || 0})</span>
            </MenuItem>
          ))}
        </Dropdown>
        {smartActive ? (
          <span className="wlm-badge">
            <i className="bi bi-lightning-charge" aria-hidden="true" /> Smart
          </span>
        ) : null}
      </div>
      <div className="wlm-cmd__actions">
        <button
          type="button"
          className="wlm-btn wlm-btn--text"
          data-task-target="watchlist-create-list"
          onClick={onCreateList}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> Create list
        </button>
        <button type="button" className="wlm-btn wlm-btn--text" onClick={onCreateRule}>
          <i className="bi bi-lightning-charge" aria-hidden="true" /> Create smart rule
        </button>
        <button
          type="button"
          className="wlm-btn wlm-btn--accent"
          data-task-target="watchlist-add-button"
          onClick={onAddAsset}
        >
          <i className="bi bi-plus-lg" aria-hidden="true" /> Add asset
        </button>
      </div>
    </div>
  );
}

export default CommandBar;
