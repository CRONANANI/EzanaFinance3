/**
 * Ezana API handlers: Options exposure (server only). Keyed by route id;
 * merged into HANDLERS by ../handlers.js. The grid itself is pure
 * (insights/options.js); this file fetches and caches the inputs.
 */
import { insightCache, pathParam } from '../handler-kit';
import { ApiError } from '../query';
import { exposureGrid, joinChain } from '../insights/options';
import { fetchChain, fetchContracts, fetchSpot, optionsFeed } from '../options/alpaca-options';

const isoDay = (d) => d.toISOString().slice(0, 10);

/** Inputs for one underlying and window, cached briefly (60 s). */
async function loadChain(ticker, maxDays) {
  const today = new Date();
  const window = {
    expirationGte: isoDay(today),
    expirationLte: isoDay(new Date(today.getTime() + maxDays * 86400000)),
  };
  return insightCache('options', 'chain', { ticker, ...window }, async () => {
    const [contracts, snapshots, spot] = await Promise.all([
      fetchContracts(ticker, window),
      fetchChain(ticker, window),
      fetchSpot(ticker),
    ]);
    return { chain: joinChain(contracts, snapshots), spot, asOf: window.expirationGte };
  });
}

async function optionsExposure({ params, path }) {
  const ticker = pathParam(String(path.ticker || '').toUpperCase(), /^[A-Z][A-Z.]{0,5}$/, 'ticker');
  const { chain, spot, asOf } = await loadChain(ticker, params.max_days ?? 120);
  if (!chain.length) {
    throw new ApiError(404, 'not_found', `No listed options found for ${ticker} in that window.`);
  }
  const grid = exposureGrid(chain, {
    spot: spot?.price ?? null,
    asOf,
    mode: params.mode || 'net_delta',
    strikes: params.strikes ?? 8,
    expirations: params.expirations ?? 7,
  });
  /* A flat, row-per-cell view for spreadsheets and LLM tools. */
  const table = [];
  grid.strikes.forEach((s, i) =>
    grid.expirations.forEach((e, j) => {
      const c = grid.cells[i][j];
      table.push({
        strike: s,
        expiration: e,
        value: c ? c.value : null,
        contracts: c ? c.contracts : 0,
        open_interest: c ? c.open_interest : 0,
        missing_greeks: c ? c.missing_greeks : 0,
      });
    }),
  );
  return {
    data: { ticker, ...grid, spot_at: spot?.at ?? null, table },
    meta: {
      feed: optionsFeed(),
      limitations: [
        'Open interest is reported once a day, as of the prior session.',
        'Greeks are Alpaca model values; contracts without a greek are counted in missing_greeks.',
        'Open-interest weighting does not know who is long or short: it is not dealer positioning.',
        optionsFeed() === 'indicative'
          ? 'Quotes and greeks use the indicative (delayed) feed.'
          : 'Quotes and greeks use the OPRA feed.',
      ],
    },
  };
}

export const HANDLERS = {
  'options.exposure': optionsExposure,
};
