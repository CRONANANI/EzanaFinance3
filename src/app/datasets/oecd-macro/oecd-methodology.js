/**
 * Methodology copy for the explorer's per-card ⓘ popovers. Copy is authored/
 * approved verbatim — do not extend or paraphrase the claims here.
 */
export const OECD_METHODOLOGY = {
  aggregates: {
    title: 'How the aggregates are built',
    body: 'OECD total, Euro area 17 and World figures come directly from the OECD Economic Outlook database — they are OECD-computed aggregates, not Ezana sums of the country rows. Values for 2024–25 are OECD projections. Aggregates are shown only in this strip and never ranked against individual countries.',
  },
  matrix: {
    title: 'How this matrix is built',
    body: 'Dimension scores come from the Ezana Empire Rankings backbone: raw series from World Bank Open Data are normalized into rank-space per dimension, so scores compare countries rather than measure absolute levels. Selecting a dimension reveals the underlying World Bank metrics with their raw values and observation years. Dimensions without a live data source are disabled rather than estimated. Rows are ordered by score; countries with data for fewer than half the visible columns are listed separately instead of being ranked on partial coverage.',
  },
  matrixOecdFallback: {
    title: 'How this matrix is built',
    body: 'This view shows the latest OECD Economic Outlook value per country per indicator. Cells are tinted by cross-country rank within each column; years marked proj. are OECD projections. Countries with data for fewer than half the visible columns are listed separately instead of being ranked on partial coverage.',
  },
  ranking: {
    title: 'How this ranking is built',
    body: 'Countries are ranked on the selected OECD indicator’s latest value. Signed indicators (surpluses/deficits) diverge around a zero line. Government gross debt is clamped at 150% of GDP for bar scaling — countries beyond the clamp are flagged off-scale so one outlier does not flatten every other bar. The OECD aggregate appears as a reference tick, not a ranked row. Years marked proj. are OECD projections.',
  },
  headToHead: {
    title: 'How this comparison is built',
    body: 'OECD mode compares countries on Economic Outlook indicators, rank-normalized 0–100 across all countries so different units share one radial scale; indicators where lower is better (unemployment, inflation, rates, debt) are inverted so outward always means stronger. Empire mode uses live dimension scores from the Empire Rankings backbone (World Bank sources); dimensions without live data are excluded from the chart and listed as pending. The table shows the raw underlying values — the polygon shows relative rank, the table shows the actual numbers.',
  },
  history: {
    title: 'How this chart is built',
    body: 'Series come from the OECD Economic Outlook database, 1961–2025, synced through Ezana’s BigQuery pipeline. Solid lines are OECD actuals through 2023; dashed segments inside the shaded band are OECD projections for 2024–25. Gaps in a line mean the OECD reports no value for those years — nothing is interpolated.',
  },
  eras: {
    title: 'About these annotations',
    body: 'Era labels are Ezana-added historical context to help read the chart — they are not part of the OECD dataset. Boundaries are approximate by design.',
  },
};
