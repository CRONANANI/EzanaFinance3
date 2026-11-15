'use client';

/**
 * Watchlist securities (Market Monitor 2.0, Nov 2026): one table for the
 * active list's items in the active class. Replaces the quote strip, "Also
 * in this watchlist" and the item rows that used to sit in My watchlists.
 *
 * Rows come from the pure helpers in watchlist-view.js:
 *   paginate(sortItems(filterItems(items, { q, starredOnly, smartOnly }), key, dir), page)
 * The Added column is addedLabel(item): "Manual", or the stored smart reason,
 * never one composed here. Sparklines come from useSparklines.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dropdown, EmptyState, MenuItem } from '@/components/ds';
import { displayTicker } from '@/lib/watchlist/asset-classes';
import {
  addedLabel,
  filterItems,
  fmtUSD,
  paginate,
  sonarPrompt,
  sortItems,
} from '@/lib/watchlist/watchlist-view';
import { AssetAvatar, Change, Sparkline } from './MonitorParts';

const PRICED_COLS = [
  { key: 'ticker', label: 'Ticker', left: true },
  { key: 'name', label: 'Name', left: true },
  { key: 'price', label: 'Price' },
  { key: 'changePct', label: 'Day change' },
];

/** Mock trading supports stocks and bond ETFs only. */
export const canPaperTrade = (item) => item?.type === 'stock' || item?.type === 'bond_etf';

const partyName = (p) => (p === 'D' ? 'Democrat' : p === 'R' ? 'Republican' : p || 'N/A');
const chamberName = (c) => (c === 'senate' ? 'Senate' : c === 'house' ? 'House' : 'N/A');

function SortHead({ col, sort, onSort }) {
  const on = sort.key === col.key;
  return (
    <th
      scope="col"
      className={col.left ? 'is-left' : undefined}
      aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" className="wlm-sort" onClick={() => onSort(col.key)}>
        {col.label}
        <i
          className={`bi ${on && sort.dir === 'desc' ? 'bi-caret-down-fill' : 'bi-caret-up-fill'}${on ? ' is-on' : ''}`}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

function RowActions({ item, lists, activeListId, onMove, onStar, onRemove }) {
  const label = item.type === 'politician' ? item.name : displayTicker(item.ticker);
  const others = lists.filter((l) => l.id !== activeListId);
  return (
    <div className="wlm-row-actions">
      {item.type === 'stock' ? (
        <Link
          href={`/company-research?ticker=${encodeURIComponent(item.ticker)}`}
          className="wlm-icon-btn wlm-icon-btn--sm"
          aria-label={`Open ${label} in research`}
          title="Open in research"
        >
          <i className="bi bi-bar-chart-line" aria-hidden="true" />
        </Link>
      ) : null}
      {others.length ? (
        <Dropdown
          align="right"
          trigger={
            <span
              className="wlm-icon-btn wlm-icon-btn--sm"
              aria-label={`Move ${label} to another list`}
              title="Move to list"
            >
              <i className="bi bi-arrow-left-right" aria-hidden="true" />
            </span>
          }
        >
          {others.map((l) => (
            <MenuItem key={l.id} icon="bi-folder" onClick={() => onMove(item, l.id)}>
              {l.label}
            </MenuItem>
          ))}
        </Dropdown>
      ) : null}
      <Dropdown
        align="right"
        trigger={
          <span className="wlm-icon-btn wlm-icon-btn--sm" aria-label={`More actions for ${label}`}>
            <i className="bi bi-three-dots" aria-hidden="true" />
          </span>
        }
      >
        <MenuItem
          icon="bi-activity"
          onClick={() => {
            window.location.assign(`/sonar?q=${encodeURIComponent(sonarPrompt(item))}`);
          }}
        >
          Ping Sonar
        </MenuItem>
        {canPaperTrade(item) ? (
          <MenuItem
            icon="bi-graph-up-arrow"
            onClick={() => {
              window.location.assign(`/trading/mock?symbol=${encodeURIComponent(item.ticker)}`);
            }}
          >
            Open in mock trading
          </MenuItem>
        ) : null}
        <MenuItem
          icon={item.starredAt ? 'bi-star-fill' : 'bi-star'}
          onClick={() => onStar(item, !item.starredAt)}
        >
          {item.starredAt ? 'Unstar' : 'Star'}
        </MenuItem>
        <MenuItem icon="bi-trash3" danger onClick={() => onRemove(item)}>
          Remove
        </MenuItem>
      </Dropdown>
    </div>
  );
}

/**
 * items          itemsForClass(activeList, classId, quotes)
 * listEmpty      the active list has no items in any class
 * smartOnly      the smart-only filter (set by the pulse row and smart card)
 */
export function SecuritiesTable({
  cls,
  items,
  listEmpty,
  loading,
  sparks,
  politicians,
  selectedKey,
  lists,
  activeListId,
  smartOnly,
  onSmartOnly,
  onSelect,
  onStar,
  onMove,
  onRemove,
  onAdd,
  onCreateRule,
}) {
  const [q, setQ] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [page, setPage] = useState(1);
  const isPol = cls.id === 'politicians';

  useEffect(() => setPage(1), [q, starredOnly, smartOnly, sort, cls.id, activeListId]);
  useEffect(() => {
    setQ('');
    setSort({ key: null, dir: 'asc' });
  }, [cls.id, activeListId]);

  const onSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const view = paginate(
    sortItems(filterItems(items, { q, starredOnly, smartOnly }), sort.key, sort.dir),
    page,
  );

  let body;
  if (loading) {
    body = (
      <div className="wlm-skel-stack" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="wlm-skel wlm-skel--row" />
        ))}
      </div>
    );
  } else if (listEmpty) {
    body = (
      <EmptyState
        icon={null}
        className="wlm-empty-state"
        description="Add an asset to start monitoring, or let a smart rule find matches for you."
        action={
          <span className="wlm-row">
            <button type="button" className="wlm-btn wlm-btn--accent" onClick={onAdd}>
              <i className="bi bi-plus-lg" aria-hidden="true" /> Add asset
            </button>
            <button type="button" className="wlm-btn wlm-btn--text" onClick={onCreateRule}>
              <i className="bi bi-lightning-charge" aria-hidden="true" /> Create smart watchlist
            </button>
          </span>
        }
      />
    );
  } else if (!items.length) {
    body = <EmptyClass cls={cls} onAdd={onAdd} />;
  } else if (!view.total) {
    body = (
      <p className="wlm-empty">
        No rows match.{' '}
        <button
          type="button"
          className="wlm-link"
          onClick={() => {
            setQ('');
            setStarredOnly(false);
            onSmartOnly(false);
          }}
        >
          Clear filters
        </button>
      </p>
    );
  } else {
    body = (
      <>
        <div className="wlm-table-scroll">
          <table className="wlm-table wlm-table--sec">
            <caption className="wlm-sr">
              {cls.label} in this watchlist, sortable by ticker, name, price and day change
            </caption>
            <thead>
              <tr>
                {isPol ? (
                  <>
                    <SortHead col={PRICED_COLS[1]} sort={sort} onSort={onSort} />
                    <th scope="col" className="is-left">
                      Party
                    </th>
                    <th scope="col" className="is-left">
                      Chamber
                    </th>
                    <th scope="col" className="is-left">
                      Latest disclosure
                    </th>
                  </>
                ) : (
                  <>
                    {PRICED_COLS.map((c) => (
                      <SortHead key={c.key} col={c} sort={sort} onSort={onSort} />
                    ))}
                    <th scope="col">
                      <span aria-hidden="true">1M trend</span>
                      <span className="wlm-sr">One month trend</span>
                    </th>
                  </>
                )}
                <th scope="col">
                  <span className="wlm-sr">Starred</span>
                  <i className="bi bi-star" aria-hidden="true" />
                </th>
                <th scope="col" className="is-left">
                  Added
                </th>
                <th scope="col">
                  <span className="wlm-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {view.rows.map((it) => {
                const key = `${it.type}:${it.ticker}`;
                const on = key === selectedKey;
                const added = addedLabel(it);
                const pol = politicians?.[it.ticker];
                const last = pol?.trades?.[0];
                const label = it.type === 'politician' ? it.name : displayTicker(it.ticker);
                return (
                  <tr key={key} aria-selected={on} className={on ? 'is-selected' : undefined}>
                    {isPol ? (
                      <>
                        <th scope="row" className="is-left">
                          <button
                            type="button"
                            className="wlm-rowbtn"
                            onClick={() => onSelect(it)}
                            aria-label={`Show ${label}`}
                          >
                            <AssetAvatar item={it} />
                            <span className="wlm-strong wlm-ellipsis">{it.name}</span>
                          </button>
                        </th>
                        <td className="is-left wlm-soft">{partyName(pol?.party)}</td>
                        <td className="is-left wlm-soft">{chamberName(pol?.chamber)}</td>
                        <td className="is-left wlm-num wlm-soft">
                          {last ? `${last.disclosed || last.date}` : 'None on record'}
                        </td>
                      </>
                    ) : (
                      <>
                        <th scope="row" className="is-left">
                          <button
                            type="button"
                            className="wlm-rowbtn"
                            onClick={() => onSelect(it)}
                            aria-label={`Show ${label}`}
                          >
                            <AssetAvatar item={it} />
                            <span className="wlm-num wlm-strong">{label}</span>
                          </button>
                        </th>
                        <td className="is-left wlm-soft">
                          <span className="wlm-ellipsis wlm-sec__name">{it.name || 'N/A'}</span>
                        </td>
                        <td className="wlm-num wlm-strong">{fmtUSD(it.price)}</td>
                        <td>
                          <Change value={it.changePct} />
                        </td>
                        <td>
                          <Sparkline points={sparks?.[it.ticker]} width={72} height={22} />
                        </td>
                      </>
                    )}
                    <td>
                      <button
                        type="button"
                        className="wlm-icon-btn wlm-icon-btn--sm"
                        aria-pressed={!!it.starredAt}
                        aria-label={it.starredAt ? `Unstar ${label}` : `Star ${label}`}
                        onClick={() => onStar(it, !it.starredAt)}
                      >
                        <i
                          className={`bi ${it.starredAt ? 'bi-star-fill is-starred' : 'bi-star'}`}
                          aria-hidden="true"
                        />
                      </button>
                    </td>
                    <td className="is-left">
                      {added.smart ? (
                        <span className="wlm-added is-smart" title={added.text}>
                          <i
                            className="bi bi-lightning-charge"
                            role="img"
                            aria-label="Added by a smart rule"
                          />
                          <span className="wlm-ellipsis">{added.text}</span>
                        </span>
                      ) : (
                        <span className="wlm-added wlm-muted">{added.text}</span>
                      )}
                    </td>
                    <td>
                      <RowActions
                        item={it}
                        lists={lists}
                        activeListId={activeListId}
                        onMove={onMove}
                        onStar={onStar}
                        onRemove={onRemove}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {view.pages > 1 ? (
          <nav className="wlm-pager" aria-label="Table pages">
            <span className="wlm-xs wlm-muted wlm-num">
              Showing {view.from} to {view.to} of {view.total}
            </span>
            <button
              type="button"
              className="wlm-btn wlm-btn--text wlm-btn--sm"
              disabled={view.page <= 1}
              onClick={() => setPage(view.page - 1)}
            >
              <i className="bi bi-chevron-left" aria-hidden="true" /> Previous
            </button>
            <button
              type="button"
              className="wlm-btn wlm-btn--text wlm-btn--sm"
              disabled={view.page >= view.pages}
              onClick={() => setPage(view.page + 1)}
            >
              Next <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </nav>
        ) : null}
      </>
    );
  }

  return (
    <section className="wlm-card wlm-sec" aria-labelledby="wlm-sec-h">
      <header className="wlm-card__head">
        <i className="bi bi-list-ul wlm-card__icon" aria-hidden="true" />
        <h2 id="wlm-sec-h" className="wlm-card__title">
          Watchlist securities
        </h2>
        {!listEmpty && items.length ? (
          <div className="wlm-sec__tools">
            <div className="wlm-search ds-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                className="wlm-input wlm-input--bare ds-search-input"
                placeholder={isPol ? 'Search members' : 'Search ticker or name'}
                aria-label={`Search ${cls.label.toLowerCase()} in this list`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={`wlm-toggle${starredOnly ? ' is-on' : ''}`}
              aria-pressed={starredOnly}
              onClick={() => setStarredOnly((v) => !v)}
            >
              Starred only
            </button>
            <button
              type="button"
              className={`wlm-toggle${smartOnly ? ' is-on' : ''}`}
              aria-pressed={smartOnly}
              onClick={() => onSmartOnly(!smartOnly)}
            >
              Smart matches only
            </button>
          </div>
        ) : null}
      </header>
      {body}
    </section>
  );
}

export function EmptyClass({ cls, onAdd }) {
  return (
    <div className="wlm-empty-class">
      <p className="wlm-muted wlm-sm">No {cls.label.toLowerCase()} in this watchlist yet.</p>
      <button type="button" className="wlm-btn wlm-btn--text" onClick={onAdd}>
        <i className="bi bi-plus-lg" aria-hidden="true" /> Add {cls.singular}
      </button>
    </div>
  );
}

export default SecuritiesTable;
