/**
 * Bootstrap Icons class names for learning tracks — matches partner nav style (bi bi-*).
 */
export const LEARNING_TRACK_BI = {
  stocks: 'bi-graph-up-arrow',
  crypto: 'bi-currency-bitcoin',
  betting: 'bi-bullseye',
  commodities: 'bi-droplet-half',
  risk: 'bi-heart-pulse',
};

export function learningTrackBiClass(trackId) {
  return LEARNING_TRACK_BI[trackId] || 'bi-journal-bookmark';
}
