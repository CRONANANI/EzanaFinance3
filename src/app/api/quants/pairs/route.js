import { NextResponse } from 'next/server';
import { fetchAV } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';

function computeSpreadStats(pricesA, pricesB) {
  const n = Math.min(pricesA.length, pricesB.length);
  if (n < 30) return null;

  const spread = [];
  for (let i = 0; i < n; i++) {
    if (pricesA[i] > 0 && pricesB[i] > 0) {
      spread.push(Math.log(pricesA[i] / pricesB[i]));
    }
  }

  if (spread.length < 30) return null;

  const mean = spread.reduce((a, b) => a + b, 0) / spread.length;
  const variance = spread.reduce((a, b) => a + (b - mean) ** 2, 0) / (spread.length - 1);
  const std = Math.sqrt(variance);
  const currentSpread = spread[spread.length - 1];
  const zScore = std > 0 ? (currentSpread - mean) / std : 0;

  const laggedSpread = spread.slice(0, -1).map((s) => s - mean);
  const currentSpreadDemeaned = spread.slice(1).map((s) => s - mean);
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < laggedSpread.length; i++) {
    sumXY += laggedSpread[i] * currentSpreadDemeaned[i];
    sumX2 += laggedSpread[i] ** 2;
  }
  const phi = sumX2 > 0 ? sumXY / sumX2 : 0;
  const halfLife = phi > 0 && phi < 1 ? -Math.log(2) / Math.log(phi) : null;

  const returnsA = [];
  const returnsB = [];
  for (let i = 1; i < n; i++) {
    if (pricesA[i - 1] > 0 && pricesB[i - 1] > 0) {
      returnsA.push((pricesA[i] - pricesA[i - 1]) / pricesA[i - 1]);
      returnsB.push((pricesB[i] - pricesB[i - 1]) / pricesB[i - 1]);
    }
  }
  const corrN = Math.min(returnsA.length, returnsB.length);
  let corrNum = 0;
  let corrVarA = 0;
  let corrVarB = 0;
  const mA = returnsA.reduce((a, b) => a + b, 0) / corrN;
  const mB = returnsB.reduce((a, b) => a + b, 0) / corrN;
  for (let i = 0; i < corrN; i++) {
    corrNum += (returnsA[i] - mA) * (returnsB[i] - mB);
    corrVarA += (returnsA[i] - mA) ** 2;
    corrVarB += (returnsB[i] - mB) ** 2;
  }
  const correlation =
    Math.sqrt(corrVarA * corrVarB) > 0 ? corrNum / Math.sqrt(corrVarA * corrVarB) : 0;

  let signal = 'no_trade';
  if (zScore > 2) signal = 'short_spread';
  else if (zScore < -2) signal = 'long_spread';
  else if (zScore > 1.5) signal = 'watch_short';
  else if (zScore < -1.5) signal = 'watch_long';

  return {
    spreadMean: parseFloat(mean.toFixed(6)),
    spreadStd: parseFloat(std.toFixed(6)),
    currentSpread: parseFloat(currentSpread.toFixed(6)),
    zScore: parseFloat(zScore.toFixed(3)),
    halfLife: halfLife ? parseFloat(halfLife.toFixed(1)) : null,
    correlation: parseFloat(correlation.toFixed(4)),
    signal,
    dataPoints: spread.length,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const tickerA = (body.tickerA || '').toUpperCase().trim();
    const tickerB = (body.tickerB || '').toUpperCase().trim();
    const days = Math.min(Math.max(body.days || 252, 30), 500);

    if (!tickerA || !tickerB) {
      return NextResponse.json({ error: 'Two tickers required' }, { status: 400 });
    }

    const [dataA, dataB] = await Promise.all([
      fetchAV({ function: 'TIME_SERIES_DAILY_ADJUSTED', symbol: tickerA, outputsize: 'full' }, 600),
      fetchAV({ function: 'TIME_SERIES_DAILY_ADJUSTED', symbol: tickerB, outputsize: 'full' }, 600),
    ]);

    const tsA = dataA?.['Time Series (Daily)'];
    const tsB = dataB?.['Time Series (Daily)'];
    if (!tsA || !tsB) {
      return NextResponse.json({ error: 'Could not fetch price data' }, { status: 404 });
    }

    const datesA = new Set(Object.keys(tsA));
    const datesB = new Set(Object.keys(tsB));
    const commonDates = [...datesA]
      .filter((d) => datesB.has(d))
      .sort()
      .slice(-days);

    const pricesA = commonDates.map((d) =>
      parseFloat(tsA[d]['5. adjusted close'] || tsA[d]['4. close']),
    );
    const pricesB = commonDates.map((d) =>
      parseFloat(tsB[d]['5. adjusted close'] || tsB[d]['4. close']),
    );

    const stats = computeSpreadStats(pricesA, pricesB);
    if (!stats) {
      return NextResponse.json({ error: 'Insufficient overlapping data' }, { status: 404 });
    }

    return NextResponse.json(
      { tickerA, tickerB, days: commonDates.length, ...stats },
      { headers: { 'Cache-Control': 'public, s-maxage=600' } },
    );
  } catch (err) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
