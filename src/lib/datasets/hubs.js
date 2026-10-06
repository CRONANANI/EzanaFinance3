/* Hub page for each dataset dimension. Slugs live here, not in taxonomy.js. */
export const HUB_SLUGS = {
  capitol: 'capitol-watch',
  titans: 'titans-shadow',
  eyes: 'eyes-above',
  whispers: 'consumer-whispers',
  hive: 'the-hive',
  lighthouse: 'global-empire-lighthouse',
  regulatory: 'regulatory-winds',
};
export const hubHref = (dimensionId) => `/datasets/${HUB_SLUGS[dimensionId]}`;
export const dimensionForSlug = (slug) =>
  Object.keys(HUB_SLUGS).find((id) => HUB_SLUGS[id] === slug) || null;
