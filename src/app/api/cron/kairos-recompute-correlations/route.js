import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/plaid';
import { fetchCommodityHistory, computeForwardReturns } from '@/lib/kairos/commodity-prices';
import { fetchWeatherHistory, computeMonthlyAnomalies } from '@/lib/kairos/weather-history';
import { pearson, pValueForPearson, quintileConditionalMeans } from '@/lib/kairos/correlations';
import {
  KAIROS_REGIONS,
  WEATHER_VARIABLES,
  LOOKAHEAD_WINDOWS,
  HISTORY_WINDOW,
} from '@/lib/kairos/regions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 600;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setFullYear(fromDate.getFullYear() - 5);
  const fromIso = fromDate.toISOString().slice(0, 10);
  const toIso = today.toISOString().slice(0, 10);

  let totalUpserts = 0;
  const errors = [];

  for (const region of KAIROS_REGIONS) {
    try {
      const weatherRows = await fetchWeatherHistory(
        region.lat,
        region.lon,
        fromIso,
        toIso,
        WEATHER_VARIABLES
      );
      if (weatherRows.length < 365) {
        errors.push({ region: region.id, error: `Only ${weatherRows.length} weather rows` });
        continue;
      }

      const anomalies = {};
      for (const v of WEATHER_VARIABLES) {
        anomalies[v] = computeMonthlyAnomalies(weatherRows, v);
      }

      for (const commoditySymbol of region.commodities) {
        const prices = await fetchCommodityHistory(commoditySymbol, fromIso, toIso);
        if (prices.length < 365) {
          errors.push({
            region: region.id,
            commodity: commoditySymbol,
            error: `Only ${prices.length} price rows`,
          });
          continue;
        }

        for (const variable of WEATHER_VARIABLES) {
          for (const lookahead of LOOKAHEAD_WINDOWS) {
            const forwardReturns = computeForwardReturns(prices, lookahead);

            const xs = [];
            const ys = [];
            const anomMap = anomalies[variable];
            for (const [date, anom] of anomMap.entries()) {
              if (forwardReturns.has(date)) {
                xs.push(anom);
                ys.push(forwardReturns.get(date));
              }
            }

            if (xs.length < 30) continue;

            const r = pearson(xs, ys);
            if (r == null) continue;

            const p = pValueForPearson(r, xs.length);
            const { topQuintileMean, bottomQuintileMean } = quintileConditionalMeans(xs, ys);

            const { error: upErr } = await supabaseAdmin.from('kairos_correlations').upsert(
              {
                region_id: region.id,
                commodity_symbol: commoditySymbol,
                weather_variable: variable,
                lookahead_days: lookahead,
                pearson_r: Number(r.toFixed(4)),
                p_value: p != null ? Number(p.toFixed(6)) : null,
                sample_count: xs.length,
                top_quintile_mean_return:
                  topQuintileMean != null ? Number(topQuintileMean.toFixed(4)) : null,
                bottom_quintile_mean_return:
                  bottomQuintileMean != null ? Number(bottomQuintileMean.toFixed(4)) : null,
                history_window: HISTORY_WINDOW,
                computed_at: new Date().toISOString(),
              },
              {
                onConflict: 'region_id,commodity_symbol,weather_variable,lookahead_days,history_window',
              }
            );

            if (upErr) {
              errors.push({
                region: region.id,
                commodity: commoditySymbol,
                error: upErr.message,
              });
            } else {
              totalUpserts += 1;
            }
          }
        }
      }
    } catch (e) {
      errors.push({ region: region.id, error: e.message });
    }
  }

  return NextResponse.json({
    success: true,
    totalUpserts,
    errors: errors.slice(0, 20),
  });
}

export async function GET(request) {
  return run(request);
}

export async function POST(request) {
  return run(request);
}
