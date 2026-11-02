/**
 * African Development Bank data portal (dataportal.opendataforafrica.org, built on Knoema).
 * API access is NOT confirmed. Two paths:
 *   1. If AfDB/Knoema grants API credentials, implement fetchBatch against their API with
 *      AFDB_API_CLIENT_ID / AFDB_API_CLIENT_SECRET from env, one request per dataset and
 *      several countries per request where allowed.
 *   2. Otherwise leave DATASETS empty (the cron then skips) and load the portal's CSV exports
 *      with scripts/afdb-csv-import.mjs.
 */
export const DATASETS = [
  // { id: '<dataset id>', name: 'AfDB Socio-Economic Database', countries: ['NGA','ZAF','KEN','EGY','ETH','GHA', ...] },
];

export const afdb = {
  source: 'afdb',
  minIntervalMs: 3000,
  attribution: 'African Development Bank, AfDB Data Portal',
  buildBatches() {
    return DATASETS.map((d) => ({ ...d, label: d.id }));
  },
  async fetchBatch() {
    throw new Error(
      'AfDB API adapter not implemented: confirm API access or use scripts/afdb-csv-import.mjs',
    );
  },
};
