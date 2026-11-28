/**
 * Chart model -> Vega-Lite v5 spec with inline data (pure). For clients that
 * render charts themselves (notebooks, IDE previews, LLM tools that emit
 * Vega-Lite). Colours follow the chosen theme.
 */
import { THEMES } from './models';

const SCHEMA = 'https://vega.github.io/schema/vega-lite/v5.json';

export function toVegaLite(model, theme = 'dark') {
  const t = THEMES[theme] || THEMES.dark;
  const base = {
    $schema: SCHEMA,
    title: { text: model.title, subtitle: model.subtitle, color: t.text, subtitleColor: t.muted },
    background: t.bg,
    config: {
      axis: { labelColor: t.muted, titleColor: t.muted, gridColor: t.grid, domainColor: t.grid },
      view: { stroke: null },
    },
    usermeta: { unit: model.unit, source: model.source },
  };
  if (model.kind === 'heatmap') {
    const values = [];
    model.rows.forEach((r, i) =>
      model.cols.forEach((c, j) => values.push({ row: r, col: c, value: model.values[i][j] })),
    );
    return {
      ...base,
      data: { values },
      mark: { type: 'rect', cornerRadius: 3 },
      encoding: {
        x: { field: 'col', type: 'ordinal', sort: model.cols, title: null },
        y: { field: 'row', type: 'ordinal', sort: model.rows, title: null },
        color: {
          field: 'value',
          type: 'quantitative',
          scale: model.diverging
            ? { domainMid: 0, range: [t.negative, t.panel, t.positive] }
            : { range: [t.panel, t.positive] },
          legend: { title: model.unit },
        },
        tooltip: [{ field: 'row' }, { field: 'col' }, { field: 'value', format: ',.0f' }],
      },
    };
  }
  if (model.kind === 'line') {
    return {
      ...base,
      data: { values: model.points },
      mark: { type: 'line', color: t.positive, strokeWidth: 2 },
      encoding: {
        x: { field: 'x', type: 'temporal', title: null },
        y: {
          field: 'y',
          type: 'quantitative',
          title: model.unit,
          ...(model.yDomain ? { scale: { domain: model.yDomain } } : {}),
        },
      },
    };
  }
  const values = model.categories.map((c, i) => ({ category: c, value: model.values[i] }));
  const cat = { field: 'category', type: 'nominal', sort: model.categories, title: null };
  const val = { field: 'value', type: 'quantitative', title: model.unit };
  return {
    ...base,
    data: { values },
    mark: { type: 'bar', cornerRadius: 3 },
    encoding: {
      ...(model.horizontal ? { y: cat, x: val } : { x: cat, y: val }),
      color: {
        condition: { test: 'datum.value < 0', value: t.negative },
        value: t.positive,
      },
      tooltip: [{ field: 'category' }, { field: 'value', format: ',.2f' }],
    },
  };
}
