import { NextResponse } from 'next/server';
import { withApiGuard, safeErrorResponse } from '@/lib/api-guard';
import { getDailyOhlcv } from '@/lib/prices/daily-bars';
import { DEFAULT_HORIZONS, eventStudy } from '@/lib/quants/event-study';
import { EVENT_DATASETS, loadStudyEvents } from '@/lib/quants/event-sources';
import { cleanTicker } from '@/lib/quants/strategy-spec';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const NO_STORE = { headers: { 'Cache-Control': 'private, no-store' } };
const BENCHMARK = 'SPY';
const MAX_TICKERS = 120;
const CONCURRENCY = 12;

/** Run `task` over `items`, at most `limit` at a time, keeping order. */
async function pooled(items, limit, task) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      out[i] = await task(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * POST /api/quants/event-study  { dataset, years?, ticker?, minAmount? }
 *
 * What a stock did, against the market, after a kind of trade was made
 * public. Events are dated by their public disclosure, and the entry is the
 * open of the next session. Nothing is stored.
 */
export const POST = withApiGuard(
  async (request) => {
    try {
      const body = await request.json().catch(() => ({}));
      const dataset = String(body?.dataset || '');
      if (!EVENT_DATASETS[dataset]) {
        return NextResponse.json({ error: 'Choose a dataset' }, { status: 400 });
      }
      const years = Math.min(Math.max(Math.round(Number(body?.years) || 2), 1), 5);
      const ticker = body?.ticker ? cleanTicker(body.ticker) : null;
      if (body?.ticker && !ticker) {
        return NextResponse.json({ error: 'That ticker is not valid' }, { status: 400 });
      }
      const minAmount = Math.min(Math.max(Number(body?.minAmount) || 0, 0), 1e9);

      const to = new Date().toISOString().slice(0, 10);
      const from = `${Number(to.slice(0, 4)) - years}${to.slice(4)}`;
      const loaded = await loadStudyEvents(dataset, {
        from,
        to,
        ticker,
        minAmount,
        maxTickers: MAX_TICKERS,
      });
      if (!loaded.events.length) {
        return NextResponse.json(
          {
            empty: true,
            dataset,
            label: EVENT_DATASETS[dataset].label,
            from,
            to,
            undated: loaded.undated,
          },
          NO_STORE,
        );
      }

      /* A few sessions before the first event, for the run-up; through today. */
      const priceFrom = new Date(Date.parse(from) - 15 * 86400000).toISOString().slice(0, 10);
      const load = async (t) => {
        try {
          return (await getDailyOhlcv(t, priceFrom, to)).bars || [];
        } catch {
          return [];
        }
      };
      const [benchmark, series] = await Promise.all([
        load(BENCHMARK),
        pooled(loaded.tickers, CONCURRENCY, load),
      ]);
      const bars = {};
      loaded.tickers.forEach((t, i) => {
        bars[t] = series[i];
      });

      const study = eventStudy({
        events: loaded.events,
        bars,
        benchmark,
        horizons: DEFAULT_HORIZONS,
      });
      const notes = [...study.notes];
      if (loaded.undated) {
        notes.unshift(
          `${loaded.undated} rows in this window have no public date on record and were left out. A date is never guessed.`,
        );
      }
      if (loaded.recordsStart && loaded.recordsStart > from) {
        notes.unshift(
          `Records for this dataset start on ${loaded.recordsStart}, so the study covers less than the ${years} year window asked for.`,
        );
      }
      if (loaded.beyondCap) {
        notes.unshift(
          `This study covers the ${loaded.tickers.length} tickers with the most events. ${loaded.beyondCap} events in less active tickers were not included, so the result describes heavily traded names.`,
        );
      }
      if (loaded.hitReadLimit) {
        notes.unshift(
          'There are more events in this window than one study reads. The oldest ones were not included; narrow the window or pick one ticker.',
        );
      }
      return NextResponse.json(
        {
          dataset,
          label: EVENT_DATASETS[dataset].label,
          benchmark: BENCHMARK,
          from,
          to,
          ticker,
          minAmount,
          belowMinimum: loaded.belowMinimum,
          ...study,
          notes,
        },
        NO_STORE,
      );
    } catch (err) {
      return safeErrorResponse(err, { context: 'quants/event-study' });
    }
  },
  { requireAuth: true, strict: true },
);
