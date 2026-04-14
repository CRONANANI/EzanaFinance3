'use client';

/**
 * ComparisonTableVisual — styled side-by-side comparison (HTML, not SVG).
 *
 * Props:
 *   columns: Array<{ label: string, color?: string }>  — typically 2 columns
 *   rows: Array<{ attribute: string, values: string[] }>  — one string per column
 */

const DEFAULT_COLORS = ['#10b981', '#3b82f6', '#a78bfa', '#fbbf24'];

export default function ComparisonTableVisual({ columns = [], rows = [] }) {
  if (!columns.length || !rows.length) return null;

  return (
    <div className="course-visual-table-wrap">
      <table className="course-visual-table">
        <thead>
          <tr>
            <th />
            {columns.map((col, i) => (
              <th
                key={i}
                style={{
                  borderBottomColor: col.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td className="course-visual-table-attr">{row.attribute}</td>
              {row.values.map((v, ci) => (
                <td key={ci}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
