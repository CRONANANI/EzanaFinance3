'use client';

import { useMemo, useState } from 'react';
import { Button, Table, THead, TBody, TR, TH, TD } from '@/components/ds';

/**
 * A thin wrapper over the design-system table with sorting and pages.
 *
 * columns: [{ key, label, numeric?, sortable?, render?(row), value?(row) }]
 *   `value` returns what a column sorts by; without it the column sorts by
 *   row[key]. Missing values always sort last.
 * rows: plain objects with a stable `id`.
 */
export function QuantDataTable({
  columns,
  rows,
  pageSize = 0,
  initialSort = null,
  caption,
  empty,
}) {
  const [sort, setSort] = useState(initialSort); // { key, dir: 'asc' | 'desc' }
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const read = (r) => (col.value ? col.value(r) : r[col.key]);
    const missing = (v) =>
      v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v));
    return [...rows].sort((a, b) => {
      const x = read(a);
      const y = read(b);
      if (missing(x) && missing(y)) return 0;
      if (missing(x)) return 1;
      if (missing(y)) return -1;
      const cmp =
        typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, columns, sort]);

  const pages = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const current = Math.min(page, pages - 1);
  const shown = pageSize ? sorted.slice(current * pageSize, (current + 1) * pageSize) : sorted;

  const toggle = (key) => {
    setPage(0);
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' },
    );
  };

  if (!rows.length) return empty || null;

  return (
    <>
      <div className="qlx-tw">
        <Table>
          {caption && <caption className="ds-sr-only">{caption}</caption>}
          <THead>
            <TR>
              {columns.map((c) => (
                <TH
                  key={c.key}
                  numeric={c.numeric}
                  scope="col"
                  aria-sort={
                    sort?.key === c.key
                      ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  {c.sortable ? (
                    <button type="button" className="qlx-sort" onClick={() => toggle(c.key)}>
                      {c.label}{' '}
                      {sort?.key === c.key && (
                        <i
                          className={`bi ${sort.dir === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill'}`}
                          aria-hidden
                        />
                      )}
                    </button>
                  ) : (
                    c.label
                  )}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {shown.map((row) => (
              <TR key={row.id}>
                {columns.map((c) => (
                  <TD key={c.key} numeric={c.numeric}>
                    {c.render ? c.render(row) : row[c.key]}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
      {pageSize > 0 && sorted.length > pageSize && (
        <div className="qlx-row qlx-row--between">
          <span className="qlx-sub qlx-num">
            {current * pageSize + 1} to {Math.min((current + 1) * pageSize, sorted.length)} of{' '}
            {sorted.length}
          </span>
          <div className="qlx-row">
            <Button
              variant="secondary"
              size="sm"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

export default QuantDataTable;
