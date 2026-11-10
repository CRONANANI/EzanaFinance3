'use client';

/**
 * Watchlist Market Monitor panels (Nov 2026): the asset detail (header,
 * chips, institutional holders, chart, politician variant), the "My
 * watchlists" side card and the add-asset dialog.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Modal } from '@/components/ds';
import { useCompanySearchFinnhub } from '@/hooks/useFinnhub';
import {
  ASSET_CLASSES,
  CLASS_BY_ID,
  FIXED_UNIVERSE,
  classIdOfType,
  displayTicker,
} from '@/lib/watchlist/asset-classes';
import { RANGES, capBucket, fmtUSD } from '@/lib/watchlist/watchlist-view';
import { AssetAvatar, Change, Sparkline } from './MonitorParts';

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
      <span className="wlm-eyebrow">
        Top institutional holders{inst.period ? `, ${inst.period}` : ''}
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
  onSendToTeam,
  children,
}) {
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
                  <i className="bi bi-stars" aria-hidden="true" /> Smart
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
              <Change value={item.changePct} className="wlm-sm" />
            </div>
          ) : null}
          <div className="wlm-detail__actions">
            <button
              type="button"
              className="wlm-icon-btn"
              aria-pressed={!!item.starredAt}
              aria-label={item.starredAt ? 'Unstar' : 'Star'}
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
                className="wlm-icon-btn"
                aria-label={`Research ${item.ticker}`}
              >
                <i className="bi bi-search" aria-hidden="true" />
              </Link>
            ) : null}
            {onSendToTeam && item.type === 'stock' ? (
              <button
                type="button"
                className="wlm-icon-btn"
                aria-label="Send to team"
                onClick={() => onSendToTeam(item)}
              >
                <i className="bi bi-send" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              className="wlm-icon-btn"
              aria-label="Remove from watchlist"
              onClick={() => onRemove(item)}
            >
              <i className="bi bi-trash3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {item.addedBy === 'smart' && item.addedReason ? (
        <p className="wlm-xs wlm-muted wlm-detail__why">
          <i className="bi bi-stars" aria-hidden="true" /> Added automatically: {item.addedReason}
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

function RowMenu({ item, lists, currentId, onMove, onRemove }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const others = lists.filter((l) => l.id !== currentId);
  return (
    <div className="wlm-menu" ref={ref}>
      <button
        type="button"
        className="wlm-icon-btn wlm-icon-btn--sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${item.name || item.ticker}`}
        onClick={() => setOpen((o) => !o)}
      >
        <i className="bi bi-three-dots" aria-hidden="true" />
      </button>
      {open ? (
        <div className="wlm-menu__pop" role="menu">
          {others.length ? <span className="wlm-menu__label wlm-eyebrow">Move to</span> : null}
          {others.map((l) => (
            <button
              key={l.id}
              type="button"
              role="menuitem"
              className="wlm-menu__item"
              onClick={() => {
                setOpen(false);
                onMove(item, l.id);
              }}
            >
              <i className="bi bi-folder" aria-hidden="true" /> {l.label}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="wlm-menu__item is-danger"
            onClick={() => {
              setOpen(false);
              onRemove(item);
            }}
          >
            <i className="bi bi-trash3" aria-hidden="true" /> Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function MyWatchlistsCard({
  lists,
  activeList,
  onListChange,
  items,
  sparks,
  selectedKey,
  onSelect,
  onStar,
  onMove,
  onRemove,
  onNewList,
  onAdd,
  alertsOn,
  onAlertsChange,
  loading,
}) {
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((i) => `${i.name || ''} ${i.ticker}`.toLowerCase().includes(s));
  }, [items, q]);

  return (
    <section className="wlm-card wlm-mylists" aria-labelledby="wlm-my-h">
      <header className="wlm-card__head">
        <i className="bi bi-list-stars wlm-card__icon" aria-hidden="true" />
        <h2 id="wlm-my-h" className="wlm-card__title">
          My watchlists
        </h2>
        <button type="button" className="wlm-btn wlm-btn--sm" onClick={onNewList}>
          <i className="bi bi-plus-lg" aria-hidden="true" /> New list
        </button>
      </header>

      <div className="wlm-mylists__bar">
        <label className="wlm-sr" htmlFor="wlm-list-select">
          Watchlist
        </label>
        <select
          id="wlm-list-select"
          className="wlm-input wlm-input--sm"
          value={activeList?.id || ''}
          onChange={(e) => onListChange(e.target.value)}
        >
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.smart ? '✦ ' : ''}
              {l.label} ({l.stocks?.length || 0})
            </option>
          ))}
        </select>
        <label
          className="wlm-check wlm-xs"
          title="Notify me when an item in this list moves 5% or more in a day"
        >
          <input
            type="checkbox"
            checked={alertsOn}
            onChange={(e) => onAlertsChange(e.target.checked)}
          />
          <span>Big-move alerts</span>
        </label>
      </div>

      <div className="wlm-search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          className="wlm-input wlm-input--bare"
          placeholder="Search this list"
          aria-label="Search this list"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="wlm-skel-stack" aria-hidden="true">
          <span className="wlm-skel wlm-skel--row" />
          <span className="wlm-skel wlm-skel--row" />
          <span className="wlm-skel wlm-skel--row" />
        </div>
      ) : shown.length === 0 ? (
        <p className="wlm-empty">
          {q ? 'No matches in this list.' : 'Nothing in this tab yet.'}{' '}
          {!q ? (
            <button type="button" className="wlm-link" onClick={onAdd}>
              Add an asset
            </button>
          ) : null}
        </p>
      ) : (
        <ul className="wlm-mylists__rows">
          {shown.map((it) => {
            const key = `${it.type}:${it.ticker}`;
            return (
              <li key={key} className={`wlm-mylists__row${key === selectedKey ? ' is-on' : ''}`}>
                <button
                  type="button"
                  className="wlm-icon-btn wlm-icon-btn--sm"
                  aria-pressed={!!it.starredAt}
                  aria-label={
                    it.starredAt ? `Unstar ${it.name || it.ticker}` : `Star ${it.name || it.ticker}`
                  }
                  onClick={() => onStar(it, !it.starredAt)}
                >
                  <i
                    className={`bi ${it.starredAt ? 'bi-star-fill is-starred' : 'bi-star'}`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  className="wlm-rowbtn"
                  onClick={() => onSelect(it)}
                  aria-current={key === selectedKey || undefined}
                >
                  <span className="wlm-mylists__names">
                    <span className="wlm-strong wlm-ellipsis">
                      {it.type === 'politician' ? it.name : displayTicker(it.ticker)}
                      {it.addedBy === 'smart' ? (
                        <i className="bi bi-stars wlm-mylists__smart" aria-label="Auto-added" />
                      ) : null}
                    </span>
                    <span className="wlm-xs wlm-muted wlm-ellipsis">
                      {it.type === 'politician' ? 'Politician' : it.name}
                    </span>
                  </span>
                  {it.type !== 'politician' ? (
                    <>
                      <Sparkline points={sparks?.[it.ticker]} width={44} height={18} />
                      <span className="wlm-mylists__px">
                        <span className="wlm-num wlm-sm">{fmtUSD(it.price)}</span>
                        <Change value={it.changePct} className="wlm-xs" />
                      </span>
                    </>
                  ) : null}
                </button>
                <RowMenu
                  item={it}
                  lists={lists}
                  currentId={activeList?.id}
                  onMove={onMove}
                  onRemove={onRemove}
                />
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className="wlm-btn wlm-btn--block" onClick={onAdd}>
        <i className="bi bi-plus-lg" aria-hidden="true" /> Add to watchlist
      </button>
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
        <div className="wlm-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            type="search"
            className="wlm-input wlm-input--bare"
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
