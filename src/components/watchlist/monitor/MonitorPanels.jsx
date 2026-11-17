'use client';

/**
 * Watchlist Market Monitor panels (Nov 2026; Market Monitor 2.0): the asset
 * panel (header with actions, institutional holders, chart, politician
 * variant), the "My watchlists" side card (lists only, with rename, list
 * settings and delete) and the add-asset dialog.
 */
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button, Dropdown, Input, MenuDivider, MenuItem, Modal, Toggle } from '@/components/ds';
import { useCompanySearchFinnhub } from '@/hooks/useFinnhub';
import {
  ASSET_CLASSES,
  CLASS_BY_ID,
  FIXED_UNIVERSE,
  classIdOfType,
  displayTicker,
} from '@/lib/watchlist/asset-classes';
import {
  RANGES,
  capBucket,
  fmtSignedUSD,
  fmtTime,
  fmtUSD,
  signOf,
  sonarPrompt,
} from '@/lib/watchlist/watchlist-view';
import { AssetAvatar, Change } from './MonitorParts';
import { canPaperTrade } from './SecuritiesTable';

const StockPriceChart = dynamic(() => import('@/components/research/StockPriceChart'), {
  ssr: false,
});

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const usdShort = (v) => {
  if (!Number.isFinite(v)) return 'N/A';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${Math.round(v)}`;
};
const amountRange = (t) =>
  t.amountMin != null && t.amountMax != null
    ? `${usdShort(t.amountMin)} to ${usdShort(t.amountMax)}`
    : t.amountMin != null
      ? `${usdShort(t.amountMin)}+`
      : 'Undisclosed';

/* ------------------------------------------------------------------ */
/* Asset detail                                                        */
/* ------------------------------------------------------------------ */

function Holders({ inst }) {
  if (inst.status === 'loading') {
    return (
      <div className="wlm-holders" aria-hidden="true">
        <span className="wlm-skel wlm-skel--chip" />
        <span className="wlm-skel wlm-skel--chip" />
      </div>
    );
  }
  if (!inst.holders.length) return null;
  const shown = inst.holders.slice(0, 4);
  const more = Math.max(0, inst.total - shown.length);
  return (
    <div className="wlm-holders">
      <span className="wlm-holders__title">
        <i className="bi bi-bank" aria-hidden="true" /> Top institutional holders
      </span>
      <ul className="wlm-holders__list">
        {shown.map((h) => (
          <li key={h.id || h.name} className="wlm-holder" title={h.name}>
            <span className="wlm-avatar wlm-avatar--xs" aria-hidden="true">
              {(h.name || '?').charAt(0)}
            </span>
            <span className="wlm-ellipsis wlm-xs">{h.name}</span>
            {Number.isFinite(h.valueUsd) ? (
              <span className="wlm-num wlm-xs wlm-muted">{usdShort(h.valueUsd)}</span>
            ) : null}
          </li>
        ))}
        {more > 0 ? <li className="wlm-xs wlm-muted">+{more} more</li> : null}
      </ul>
      <span className="wlm-caption">
        {inst.period ? `Reported for ${inst.period}. ` : ''}Not current ownership.
      </span>
    </div>
  );
}

function PoliticianDetail({ item, politician }) {
  const trades = politician?.trades || [];
  return (
    <div className="wlm-pol">
      {trades.length === 0 ? (
        <p className="wlm-empty">No disclosed trades on record for this member.</p>
      ) : (
        <div className="wlm-table-scroll">
          <table className="wlm-table">
            <caption className="wlm-sr">Recent disclosed trades by {item.name}</caption>
            <thead>
              <tr>
                <th scope="col" className="is-left">
                  Traded
                </th>
                <th scope="col" className="is-left">
                  Asset
                </th>
                <th scope="col" className="is-left">
                  Side
                </th>
                <th scope="col">Amount</th>
                <th scope="col">Disclosed</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={`${t.date}-${t.ticker}-${i}`}>
                  <td className="is-left wlm-num">{t.date}</td>
                  <td className="is-left">
                    {t.ticker ? (
                      <Link
                        href={`/company-research?ticker=${encodeURIComponent(t.ticker)}`}
                        className="wlm-link wlm-num"
                      >
                        {t.ticker}
                      </Link>
                    ) : (
                      <span className="wlm-ellipsis">{t.asset || 'N/A'}</span>
                    )}
                  </td>
                  <td
                    className={`is-left wlm-tone is-${t.side === 'buy' ? 'up' : t.side === 'sell' ? 'down' : 'flat'}`}
                  >
                    {t.side === 'buy' ? 'Buy' : t.side === 'sell' ? 'Sell' : 'Other'}
                  </td>
                  <td className="wlm-num">{amountRange(t)}</td>
                  <td className="wlm-num wlm-muted">{t.disclosed || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Link href={`/inside-the-capitol/${slugify(item.name)}`} className="wlm-link">
        Full trading profile <i className="bi bi-arrow-right" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function AssetDetail({
  item,
  listLabel,
  politician,
  inst,
  range,
  onRange,
  onStar,
  onRemove,
  onMove,
  lists = [],
  activeListId = null,
  updatedAt = null,
  onSendToTeam,
  children,
}) {
  const others = lists.filter((l) => l.id !== activeListId);
  const label = item.type === 'politician' ? item.name : displayTicker(item.ticker);
  const cls = CLASS_BY_ID[classIdOfType(item.type)];
  const isPol = item.type === 'politician';
  const bucket =
    item.type === 'stock' ? capBucket(item.marketCap ?? item.metadata?.marketCap) : null;
  const chips = isPol
    ? [
        politician?.party === 'D'
          ? 'Democrat'
          : politician?.party === 'R'
            ? 'Republican'
            : politician?.party,
        politician?.chamber === 'senate'
          ? 'Senate'
          : politician?.chamber === 'house'
            ? 'House'
            : null,
        politician?.state,
      ].filter(Boolean)
    : [
        cls.label === 'Stocks' ? 'Stock' : cls.singular[0].toUpperCase() + cls.singular.slice(1),
        item.sector,
        bucket,
      ].filter(Boolean);

  return (
    <section className="wl-chart-panel wlm-detail" aria-labelledby="wlm-detail-h">
      <nav className="wlm-crumbs wlm-xs" aria-label="Breadcrumb">
        <span>{listLabel}</span>
        <i className="bi bi-chevron-right" aria-hidden="true" />
        <span>{cls.label}</span>
        <i className="bi bi-chevron-right" aria-hidden="true" />
        <span aria-current="page" className="wlm-soft">
          {isPol ? item.name : displayTicker(item.ticker)}
        </span>
      </nav>

      <header className="wlm-detail__head">
        <div className="wlm-detail__id">
          <AssetAvatar item={item} size={48} />
          <div>
            <h1 id="wlm-detail-h" className="wlm-detail__name">
              {item.name || item.ticker}
              {item.addedBy === 'smart' ? (
                <span
                  className="wlm-badge"
                  title={item.addedReason || 'Added by a smart watchlist'}
                >
                  <i className="bi bi-lightning-charge" aria-hidden="true" /> Smart
                </span>
              ) : null}
            </h1>
            <div className="wlm-detail__sub">
              {!isPol ? (
                <span className="wlm-num wlm-soft">{displayTicker(item.ticker)}</span>
              ) : null}
              {chips.map((c) => (
                <span key={c} className="wlm-chip wlm-chip--static">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="wlm-detail__right">
          {!isPol ? (
            <div className="wlm-detail__px">
              <span className="wlm-num wlm-detail__price">{fmtUSD(item.price)}</span>
              <span className="wlm-detail__chg">
                {item.change != null ? (
                  <span className={`wlm-num wlm-sm wlm-tone is-${signOf(item.change)}`}>
                    {fmtSignedUSD(item.change)}
                  </span>
                ) : null}
                <Change value={item.changePct} className="wlm-sm" />
              </span>
              {updatedAt ? (
                <span className="wlm-xs wlm-muted">Updated {fmtTime(updatedAt)}</span>
              ) : null}
            </div>
          ) : null}
          <div className="wlm-detail__actions">
            <button
              type="button"
              className="wlm-icon-btn"
              aria-pressed={!!item.starredAt}
              aria-label={item.starredAt ? `Unstar ${label}` : `Star ${label}`}
              onClick={() => onStar(item, !item.starredAt)}
            >
              <i
                className={`bi ${item.starredAt ? 'bi-star-fill' : 'bi-star'}`}
                aria-hidden="true"
              />
            </button>
            {item.type === 'stock' ? (
              <Link
                href={`/company-research?ticker=${encodeURIComponent(item.ticker)}`}
                className="wlm-btn wlm-btn--text wlm-btn--sm"
              >
                <i className="bi bi-box-arrow-up-right" aria-hidden="true" /> Open research
              </Link>
            ) : null}
            <Link
              href={`/sonar?q=${encodeURIComponent(sonarPrompt(item))}`}
              className="wlm-btn wlm-btn--text wlm-btn--sm"
            >
              <i className="bi bi-activity" aria-hidden="true" /> Ping Sonar
            </Link>
            {onSendToTeam && item.type === 'stock' ? (
              <button
                type="button"
                className="wlm-btn wlm-btn--text wlm-btn--sm"
                onClick={() => onSendToTeam(item)}
              >
                <i className="bi bi-send" aria-hidden="true" /> Send to team
              </button>
            ) : null}
            <Dropdown
              align="right"
              trigger={
                <span className="wlm-icon-btn" aria-label={`More actions for ${label}`}>
                  <i className="bi bi-three-dots" aria-hidden="true" />
                </span>
              }
            >
              {canPaperTrade(item) ? (
                <MenuItem
                  icon="bi-graph-up-arrow"
                  onClick={() =>
                    window.location.assign(
                      `/trading/mock?symbol=${encodeURIComponent(item.ticker)}`,
                    )
                  }
                >
                  Open in mock trading
                </MenuItem>
              ) : null}
              {others.length ? <MenuDivider /> : null}
              {others.map((l) => (
                <MenuItem key={l.id} icon="bi-arrow-left-right" onClick={() => onMove(item, l.id)}>
                  Move to {l.label}
                </MenuItem>
              ))}
              <MenuDivider />
              <MenuItem icon="bi-trash3" danger onClick={() => onRemove(item)}>
                Remove
              </MenuItem>
            </Dropdown>
          </div>
        </div>
      </header>

      {item.addedBy === 'smart' && item.addedReason ? (
        <p className="wlm-xs wlm-muted wlm-detail__why">
          <i className="bi bi-lightning-charge" aria-hidden="true" /> Added automatically:{' '}
          {item.addedReason}
        </p>
      ) : null}

      {item.type === 'stock' ? <Holders inst={inst} /> : null}

      {isPol ? (
        <PoliticianDetail item={item} politician={politician} />
      ) : (
        <div className="wlm-chart">
          <StockPriceChart
            key={item.ticker}
            symbol={item.ticker}
            livePrice={item.price}
            initialRange={range}
            ranges={RANGES}
            onRangeChange={onRange}
            hideSymbol
            compact
          />
        </div>
      )}

      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* My watchlists                                                       */
/* ------------------------------------------------------------------ */

function RenameListModal({ list, onClose, onRename }) {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (list) {
      setLabel(list.label || '');
      setError(null);
    }
  }, [list]);
  const save = async (e) => {
    e.preventDefault();
    const next = label.trim();
    if (!next || busy) return;
    setBusy(true);
    const r = await onRename(list.id, next);
    setBusy(false);
    if (r && r.ok === false) setError('Could not rename the list. Try again.');
    else onClose();
  };
  return (
    <Modal
      open={Boolean(list)}
      onClose={onClose}
      title="Rename list"
      size="420px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="wlm-rename-form" loading={busy} disabled={!label.trim()}>
            Save
          </Button>
        </>
      }
    >
      <form id="wlm-rename-form" onSubmit={save}>
        <Input
          id="wlm-rename-input"
          label="List name"
          value={label}
          maxLength={60}
          onChange={(e) => setLabel(e.target.value)}
          error={error}
        />
      </form>
    </Modal>
  );
}

/* Until server-side alerts ship, big moves are checked by the open page. */
const BIG_MOVE_COPY =
  'A notification when an item in this list moves 5% or more in a day. Checked while Ezana is open in this browser.';

function ListSettingsModal({ list, alertsOn, onAlertsChange, onClose }) {
  return (
    <Modal
      open={Boolean(list)}
      onClose={onClose}
      title={list ? `${list.label} settings` : ''}
      size="440px"
    >
      {list ? (
        <div className="wlm-settings">
          <Toggle
            label="Big-move alerts"
            checked={alertsOn}
            onChange={(e) => onAlertsChange(list.id, e.target.checked)}
          />
          <p className="wlm-sm wlm-muted">{BIG_MOVE_COPY}</p>
        </div>
      ) : null}
    </Modal>
  );
}

function DeleteListModal({ list, onClose, onDelete }) {
  const [busy, setBusy] = useState(false);
  const n = list?.stocks?.length || 0;
  return (
    <Modal
      open={Boolean(list)}
      onClose={onClose}
      title={list ? `Delete ${list.label}?` : ''}
      size="420px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await onDelete(list);
              setBusy(false);
              onClose();
            }}
          >
            Delete list
          </Button>
        </>
      }
    >
      {list ? (
        <p className="wlm-sm wlm-soft">
          This removes the list and its {n} {n === 1 ? 'item' : 'items'}. It cannot be undone.
        </p>
      ) : null}
    </Modal>
  );
}

/**
 * My watchlists: list rows only (name, item count, Smart marker, active
 * state) with a per-row menu. The items live in the securities table.
 *   alertsFor(listId) -> boolean; onAlertsChange(listId, on)
 */
export function MyWatchlistsCard({
  lists,
  activeList,
  smartListIds,
  onListChange,
  onNewList,
  onRename,
  onDelete,
  alertsFor,
  onAlertsChange,
  loading,
}) {
  const [renaming, setRenaming] = useState(null);
  const [settings, setSettings] = useState(null);
  const [deleting, setDeleting] = useState(null);

  return (
    <section className="wlm-card wlm-mylists" aria-labelledby="wlm-my-h">
      <header className="wlm-card__head">
        <i className="bi bi-list-ul wlm-card__icon" aria-hidden="true" />
        <h2 id="wlm-my-h" className="wlm-card__title">
          My watchlists
        </h2>
        <button type="button" className="wlm-btn wlm-btn--text wlm-btn--sm" onClick={onNewList}>
          <i className="bi bi-plus-lg" aria-hidden="true" /> New list
        </button>
      </header>

      {loading ? (
        <div className="wlm-skel-stack" aria-hidden="true">
          <span className="wlm-skel wlm-skel--row" />
          <span className="wlm-skel wlm-skel--row" />
        </div>
      ) : lists.length === 0 ? (
        <p className="wlm-empty">
          No lists yet.{' '}
          <button type="button" className="wlm-link" onClick={onNewList}>
            Create one
          </button>
        </p>
      ) : (
        <ul className="wlm-mylists__rows">
          {lists.map((l) => {
            const on = l.id === activeList?.id;
            const smart = smartListIds?.has(l.id);
            return (
              <li key={l.id} className={`wlm-mylists__row${on ? ' is-on' : ''}`}>
                <button
                  type="button"
                  className="wlm-rowbtn"
                  onClick={() => onListChange(l.id)}
                  aria-current={on || undefined}
                >
                  <span className="wlm-strong wlm-ellipsis">{l.label}</span>
                  {smart ? (
                    <i
                      className="bi bi-lightning-charge wlm-mylists__smart"
                      role="img"
                      aria-label="Smart list"
                    />
                  ) : null}
                  <span className="wlm-num wlm-xs wlm-muted wlm-mylists__count">
                    {l.stocks?.length || 0}
                  </span>
                </button>
                <Dropdown
                  align="right"
                  trigger={
                    <span
                      className="wlm-icon-btn wlm-icon-btn--sm"
                      aria-label={`Actions for ${l.label}`}
                    >
                      <i className="bi bi-three-dots-vertical" aria-hidden="true" />
                    </span>
                  }
                >
                  <MenuItem icon="bi-pencil" onClick={() => setRenaming(l)}>
                    Rename
                  </MenuItem>
                  <MenuItem icon="bi-gear" onClick={() => setSettings(l)}>
                    List settings
                  </MenuItem>
                  <MenuItem icon="bi-trash3" danger onClick={() => setDeleting(l)}>
                    Delete
                  </MenuItem>
                </Dropdown>
              </li>
            );
          })}
        </ul>
      )}

      <RenameListModal list={renaming} onClose={() => setRenaming(null)} onRename={onRename} />
      <ListSettingsModal
        list={settings}
        alertsOn={settings ? alertsFor(settings.id) : false}
        onAlertsChange={onAlertsChange}
        onClose={() => setSettings(null)}
      />
      <DeleteListModal list={deleting} onClose={() => setDeleting(null)} onDelete={onDelete} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Add asset                                                           */
/* ------------------------------------------------------------------ */

function usePoliticianSearch(q, enabled) {
  const [state, setState] = useState({ loading: false, results: [] });
  useEffect(() => {
    if (!enabled || q.trim().length < 2) {
      setState({ loading: false, results: [] });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      fetch(`/api/watchlist/politicians?q=${encodeURIComponent(q.trim())}`, {
        credentials: 'include',
      })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((d) => !cancelled && setState({ loading: false, results: d.results || [] }))
        .catch(() => !cancelled && setState({ loading: false, results: [] }));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, enabled]);
  return state;
}

export function AddAssetDialog({ open, onClose, initialClass, listLabel, existing, onAdd }) {
  const [classId, setClassId] = useState(initialClass || 'stocks');
  const [q, setQ] = useState('');
  const company = useCompanySearchFinnhub();
  const pols = usePoliticianSearch(q, classId === 'politicians');

  useEffect(() => {
    if (open) {
      setClassId(initialClass || 'stocks');
      setQ('');
      company.setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialClass]);

  const cls = CLASS_BY_ID[classId];
  const results = useMemo(() => {
    if (classId === 'stocks') {
      return (company.suggestions || [])
        .filter((s) => s.symbol && !s.symbol.includes(':'))
        .slice(0, 10)
        .map((s) => ({ type: 'stock', ticker: s.symbol.toUpperCase(), name: s.name }));
    }
    if (classId === 'politicians') {
      return pols.results.map((p) => ({
        type: 'politician',
        ticker: p.id,
        name: p.name,
        sub: [
          p.party,
          p.chamber === 'senate' ? 'Senate' : p.chamber === 'house' ? 'House' : null,
          p.state,
        ]
          .filter(Boolean)
          .join(' · '),
        metadata: { party: p.party, chamber: p.chamber, state: p.state },
      }));
    }
    const s = q.trim().toLowerCase();
    return (FIXED_UNIVERSE[cls.type] || [])
      .filter((u) => !s || `${u.name} ${u.ticker} ${u.display || ''}`.toLowerCase().includes(s))
      .map((u) => ({ type: cls.type, ticker: u.ticker, name: u.name }));
  }, [classId, company.suggestions, pols.results, q, cls.type]);

  const loading =
    classId === 'stocks' ? company.loading : classId === 'politicians' ? pols.loading : false;
  const needsQuery = classId === 'stocks' || classId === 'politicians';

  return (
    <Modal open={open} onClose={onClose} size="520px" title={`Add to ${listLabel || 'watchlist'}`}>
      <div className="wlm-add">
        <div className="wlm-chips__row" role="group" aria-label="Asset class">
          {ASSET_CLASSES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`wlm-chip${classId === c.id ? ' is-on' : ''}`}
              aria-pressed={classId === c.id}
              onClick={() => {
                setClassId(c.id);
                setQ('');
                company.setQuery('');
              }}
            >
              <i className={`bi ${c.icon}`} aria-hidden="true" /> {c.label}
            </button>
          ))}
        </div>
        <div className="wlm-search ds-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            type="search"
            className="wlm-input wlm-input--bare ds-search-input"
            aria-label={`Search ${cls.label.toLowerCase()}`}
            placeholder={
              classId === 'politicians'
                ? 'Search members of Congress'
                : `Search ${cls.label.toLowerCase()}`
            }
            value={classId === 'stocks' ? company.query : q}
            onChange={(e) =>
              classId === 'stocks' ? company.setQuery(e.target.value) : setQ(e.target.value)
            }
          />
        </div>
        <ul className="wlm-add__results" aria-busy={loading}>
          {loading ? <li className="wlm-xs wlm-muted">Searching…</li> : null}
          {!loading &&
          needsQuery &&
          (classId === 'stocks' ? company.query : q).trim().length < 2 ? (
            <li className="wlm-xs wlm-muted">Type at least two characters.</li>
          ) : null}
          {!loading &&
            results.map((r) => {
              const has = existing.has(`${r.type}:${r.ticker}`);
              return (
                <li key={`${r.type}:${r.ticker}`} className="wlm-add__row">
                  <AssetAvatar item={r} />
                  <span className="wlm-add__names">
                    <span className="wlm-strong wlm-ellipsis">
                      {r.type === 'politician' ? r.name : displayTicker(r.ticker)}
                    </span>
                    <span className="wlm-xs wlm-muted wlm-ellipsis">
                      {r.type === 'politician' ? r.sub : r.name}
                    </span>
                  </span>
                  <button
                    type="button"
                    className={`wlm-btn wlm-btn--sm${has ? '' : ' wlm-btn--accent'}`}
                    disabled={has}
                    onClick={() => onAdd(r)}
                  >
                    {has ? 'Added' : 'Add'}
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
    </Modal>
  );
}
