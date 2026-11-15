'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dropdown, MenuDivider, MenuItem, VisuallyHidden } from '@/components/ds';
import { fmtMoney, fmtSignedPct, toneOf } from '@/lib/org-command-center';
import {
  NA,
  filterHoldings,
  fmtShare,
  fmtShares,
  fmtSignedMoney,
  reviewState,
  teamFilters,
} from '@/lib/org-trading-desk';
import {
  Empty,
  Section,
  SectionError,
  Skel,
  TextToggle,
} from '@/components/org/command-center/parts';

const SCOPE_EMPTY = {
  'no-team': 'No team is assigned to your account, so there is no team book to show.',
  'no-coverage': 'No sector coverage is assigned to you yet. Your portfolio manager assigns it.',
};

function Person({ name }) {
  return name ? (
    <span className="otd-person" title={name}>
      {name}
    </span>
  ) : (
    <span className="tcc-na">{NA}</span>
  );
}

function Thesis({ row }) {
  if (!row.thesisKnown) {
    return (
      <span className="tcc-na" title="Shown to members who can flag positions">
        {NA}
      </span>
    );
  }
  return row.thesis ? (
    <span className="otd-thesis" title={row.thesis}>
      Yes
    </span>
  ) : (
    <span className="tcc-na" title="No pitch thesis is on file for this ticker">
      No
    </span>
  );
}

function Review({ row, canFlag, onRaise, onOpenFlags }) {
  const state = reviewState(row.flags);
  if (state) {
    return (
      <button
        type="button"
        className={`tcc-textbtn otd-action otd-review tcc-${state.tone}`}
        onClick={() => onOpenFlags(row)}
        title="Open in the flag queue"
      >
        {state.label}
      </button>
    );
  }
  if (!canFlag) {
    return (
      <span className="tcc-na" title="No open flags. Flagging needs the flag right.">
        None open
      </span>
    );
  }
  return (
    <button
      type="button"
      className="tcc-textbtn tcc-textbtn--accent otd-action otd-review"
      onClick={() => onRaise(row)}
    >
      Raise flag
    </button>
  );
}

function HoldingsTable({ rows, canFlag, canManage, onRaise, onOpenFlags, onDiscuss, onRemove }) {
  return (
    <div className="otd-scroll">
      <table className="otd-table otd-table--holdings">
        <thead>
          <tr>
            <th scope="col">Ticker</th>
            <th scope="col">Sector team</th>
            <th scope="col">Covering analyst</th>
            <th scope="col">Sector head</th>
            <th scope="col">Thesis</th>
            <th scope="col" className="otd-num">
              Shares
            </th>
            <th scope="col" className="otd-num">
              Avg cost
            </th>
            <th scope="col" className="otd-num">
              Price
            </th>
            <th scope="col" className="otd-num">
              Market value
            </th>
            <th scope="col" className="otd-num">
              P/L $
            </th>
            <th scope="col" className="otd-num">
              P/L %
            </th>
            <th scope="col" className="otd-num">
              % of fund
            </th>
            <th scope="col">Review</th>
            <th scope="col" className="otd-menucol">
              <span className="tcc-sr">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id || r.key}>
              <td role="rowheader" className="tcc-mono otd-ticker" title={r.name || undefined}>
                {r.ticker}
              </td>
              <td>{r.teamName || <span className="tcc-na">Unassigned</span>}</td>
              <td>
                <Person name={r.analyst} />
              </td>
              <td>
                <Person name={r.head} />
              </td>
              <td>
                <Thesis row={r} />
              </td>
              <td className="otd-num tcc-mono">{fmtShares(r.shares)}</td>
              <td className="otd-num tcc-mono">{fmtMoney(r.avgCost)}</td>
              <td className="otd-num tcc-mono">
                {r.priced ? (
                  fmtMoney(r.price)
                ) : (
                  <span className="tcc-na" title="Not priced yet. Carried at cost.">
                    {NA}
                  </span>
                )}
              </td>
              <td
                className="otd-num tcc-mono"
                title={r.priced ? undefined : 'Carried at cost until it is priced'}
              >
                {fmtMoney(r.value)}
              </td>
              <td className={`otd-num tcc-mono tcc-${toneOf(r.pl)}`}>{fmtSignedMoney(r.pl)}</td>
              <td className={`otd-num tcc-mono tcc-${toneOf(r.plPct)}`}>{fmtSignedPct(r.plPct)}</td>
              <td className="otd-num tcc-mono">{fmtShare(r.pctFund)}</td>
              <td>
                <Review row={r} canFlag={canFlag} onRaise={onRaise} onOpenFlags={onOpenFlags} />
              </td>
              <td className="otd-menucol">
                <Dropdown
                  align="right"
                  trigger={
                    <span className="otd-menu">
                      <VisuallyHidden>Actions for {r.ticker}</VisuallyHidden>
                      <i className="bi bi-three-dots-vertical" aria-hidden="true" />
                    </span>
                  }
                >
                  {canFlag && (
                    <MenuItem icon="bi-flag" onClick={() => onRaise(r)}>
                      Raise flag
                    </MenuItem>
                  )}
                  <MenuItem icon="bi-chat-left-text" onClick={() => onDiscuss(r)}>
                    Discuss
                  </MenuItem>
                  {canManage && r.id && (
                    <>
                      <MenuDivider />
                      <MenuItem icon="bi-trash" danger onClick={() => onRemove(r)}>
                        Remove position
                      </MenuItem>
                    </>
                  )}
                </Dropdown>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The rest of an analyst's team: read only, as it has always been. */
function TeamReadOnly({ rows }) {
  return (
    <div className="otd-scroll">
      <table className="otd-table otd-table--others">
        <thead>
          <tr>
            <th scope="col">Ticker</th>
            <th scope="col">Sector</th>
            <th scope="col" className="otd-num">
              Shares
            </th>
            <th scope="col">Covering analyst</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id || r.key}>
              <td role="rowheader" className="tcc-mono otd-ticker" title={r.name || undefined}>
                {r.ticker}
              </td>
              <td>{r.sector || <span className="tcc-na">{NA}</span>}</td>
              <td className="otd-num tcc-mono">{fmtShares(r.shares)}</td>
              <td>
                <Person name={r.analyst} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Holdings and accountability: every position in the member's scope with the
 * analyst who covers it, the sector head who answers for it, whether a thesis
 * is on file, and what is open against it.
 */
export function Holdings({
  book,
  scoped,
  scopeLabel,
  onRetry,
  canFlag,
  canManage,
  team,
  onTeam,
  onRaise,
  onOpenFlags,
  onDiscuss,
  onRemove,
  onAdd,
  sample,
}) {
  const [query, setQuery] = useState('');
  const [view, setView] = useState('mine');
  const loading = book.status === 'loading';
  const failed = book.status === 'error';
  const filters = useMemo(() => teamFilters(scoped.mine), [scoped.mine]);
  useEffect(() => {
    if (team !== 'all' && !filters.some((f) => f.value === team)) onTeam('all');
  }, [filters, team, onTeam]);
  useEffect(() => {
    if (scoped.others.length === 0) setView('mine');
  }, [scoped.others.length]);

  const shown = useMemo(
    () => filterHoldings(scoped.mine, { team, query }),
    [scoped.mine, team, query],
  );
  const hasOthers = scoped.others.length > 0;
  const fundEmpty = !loading && !failed && (book.data?.positions || []).length === 0;

  let body;
  if (failed) {
    body = <SectionError message="Could not load holdings." onRetry={onRetry} />;
  } else if (loading) {
    body = (
      <div className="otd-skelrows" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="otd-skelrow">
            <Skel w={56} h={12} />
            <Skel h={12} />
          </div>
        ))}
      </div>
    );
  } else if (fundEmpty) {
    body = (
      <Empty action={canManage ? 'Add position' : null} onAction={canManage ? onAdd : null}>
        No positions yet. Holdings are added by hand, by spreadsheet or from a linked brokerage
        account.
      </Empty>
    );
  } else if (view === 'others') {
    body = <TeamReadOnly rows={scoped.others} />;
  } else if (scoped.state !== 'ok' && scoped.mine.length === 0) {
    body = <Empty>{SCOPE_EMPTY[scoped.state]}</Empty>;
  } else if (scoped.mine.length === 0) {
    body = (
      <Empty>
        {scoped.scope === 'coverage'
          ? 'No positions in the sectors you cover yet.'
          : 'This team has no positions yet.'}
      </Empty>
    );
  } else if (shown.length === 0) {
    body = (
      <Empty
        action="Clear filters"
        onAction={() => {
          setQuery('');
          onTeam('all');
        }}
      >
        No holdings match.
      </Empty>
    );
  } else {
    body = (
      <>
        <HoldingsTable
          rows={shown}
          canFlag={canFlag}
          canManage={canManage}
          onRaise={onRaise}
          onOpenFlags={onOpenFlags}
          onDiscuss={onDiscuss}
          onRemove={onRemove}
        />
        <p className="otd-foot">
          Showing <span className="tcc-mono">{shown.length}</span> of{' '}
          <span className="tcc-mono">{scoped.mine.length}</span>{' '}
          {scoped.mine.length === 1 ? 'position' : 'positions'}.
          {shown.some((r) => !r.priced)
            ? ' A position with no price yet is carried at cost and shows no gain.'
            : ''}
          {sample ? ' Sample content: changes stay on this page.' : ''}
        </p>
      </>
    );
  }

  return (
    <Section
      id="otd-holdings"
      title="Holdings and accountability"
      className="otd-holdings"
      aside={<span className="otd-scope">{scopeLabel}</span>}
    >
      {!failed && !loading && !fundEmpty && (
        <div className="otd-controls">
          <div className="tcc-toggles" role="group" aria-label="Holdings shown">
            {hasOthers && (
              <>
                <TextToggle pressed={view === 'mine'} onClick={() => setView('mine')}>
                  My coverage
                </TextToggle>
                <TextToggle pressed={view === 'others'} onClick={() => setView('others')}>
                  Rest of team (read only)
                  <span className="tcc-mono">{scoped.others.length}</span>
                </TextToggle>
              </>
            )}
            {view === 'mine' && filters.length > 1 && (
              <>
                <TextToggle pressed={team === 'all'} onClick={() => onTeam('all')}>
                  All sectors
                </TextToggle>
                {filters.map((f) => (
                  <TextToggle
                    key={f.value}
                    pressed={team === f.value}
                    onClick={() => onTeam(f.value)}
                  >
                    {f.label}
                  </TextToggle>
                ))}
              </>
            )}
          </div>
          {view === 'mine' && scoped.mine.length > 0 && (
            <label className="otd-search">
              <i className="bi bi-search" aria-hidden="true" />
              <span className="tcc-sr">Search holdings</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ticker, company, analyst or thesis"
              />
            </label>
          )}
        </div>
      )}
      {body}
    </Section>
  );
}
