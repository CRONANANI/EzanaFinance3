'use client';

import { useCallback, useMemo, useState } from 'react';

/**
 * SortableTable — minimal headless sortable table primitive.
 *
 * Modeled after the sortable open-positions table in /trading/mock so the
 * same UX can be reused for the watchlist holdings table, community
 * leaderboard, and learning progress tables.
 *
 * Column shape
 *   {
 *     key:       string                    — unique column id (used for sort state + React key)
 *     label:     ReactNode                 — header content
 *     sortable:  boolean                   — defaults true; false locks the column (e.g. Asset)
 *     align:     'left' | 'right' | 'center'
 *     accessor:  (row) => sortableValue    — what to compare during sort (defaults to row[key])
 *     render:    (row, index) => ReactNode — cell body (defaults to row[key])
 *   }
 *
 * Props
 * - columns:        Column[]
 * - data:           object[]
 * - defaultSortKey: string?
 * - defaultSortDir: 'asc' | 'desc'                       (defaults to 'desc')
 * - emptyState:     ReactNode                            — rendered when data is empty
 * - getRowKey:      (row, index) => string|number
 * - className:      string                               — wrapper <table> class
 */
export function SortableTable({
  columns,
  data,
  defaultSortKey = null,
  defaultSortDir = 'desc',
  emptyState = null,
  getRowKey,
  className,
}) {
  const [sort, setSort] = useState({ key: defaultSortKey, dir: defaultSortDir });

  const toggleSort = useCallback((key) => {
    setSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const sortedRows = useMemo(() => {
    const list = Array.isArray(data) ? [...data] : [];
    if (!sort.key) return list;

    const col = columns.find((c) => c.key === sort.key);
    if (!col || col.sortable === false) return list;

    const accessor = col.accessor || ((row) => row?.[sort.key]);

    list.sort((a, b) => {
      const aVal = accessor(a);
      const bVal = accessor(b);

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sort.dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const aNum = aVal == null ? -Infinity : Number(aVal);
      const bNum = bVal == null ? -Infinity : Number(bVal);
      if (aNum < bNum) return sort.dir === 'asc' ? -1 : 1;
      if (aNum > bNum) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [data, sort, columns]);

  if (!sortedRows.length && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <table className={className}>
      <thead>
        <tr>
          {columns.map((col) => {
            const sortable = col.sortable !== false;
            const active = sort.key === col.key;
            const arrow = active ? (sort.dir === 'desc' ? '▼' : '▲') : '▼';
            return (
              <th
                key={col.key}
                onClick={sortable ? () => toggleSort(col.key) : undefined}
                style={{
                  cursor: sortable ? 'pointer' : 'default',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  textAlign: col.align || 'left',
                }}
              >
                {col.label}
                {sortable && (
                  <>
                    {' '}
                    <span style={{ fontSize: '0.6rem', opacity: active ? 1 : 0.3 }}>{arrow}</span>
                  </>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row, idx) => {
          const key = getRowKey ? getRowKey(row, idx) : row?.id ?? idx;
          return (
            <tr key={key}>
              {columns.map((col) => {
                const cell = col.render ? col.render(row, idx) : row?.[col.key];
                return (
                  <td key={col.key} style={col.align ? { textAlign: col.align } : undefined}>
                    {cell}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default SortableTable;
