/**
 * Bootstrap Icons class names for learning tracks — matches partner nav style (bi bi-*).
 */
export const LEARNING_TRACK_BI = {
  stocks: 'bi-bar-chart-line',
  crypto: 'bi-fire',
  betting: 'bi-bullseye',
  commodities: 'bi-graph-up-arrow',
  risk: 'bi-trophy',
};

export function learningTrackBiClass(trackId) {
  return LEARNING_TRACK_BI[trackId] || 'bi-bullseye';
}
