import { NextResponse } from 'next/server';
import { fetchAV, getAlphaVantageApiKey } from '@/lib/alpha-vantage';

export const dynamic = 'force-dynamic';

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(_req, context) {
  const symbol = String(context?.params?.symbol ?? '')
    .trim()
    .toUpperCase();
  if (!symbol || !getAlphaVantageApiKey()) {
    return NextResponse.json({ error: 'Invalid symbol or no AV key' }, { status: 400 });
  }

  try {
    const [rsiData, macdData, bbandsData, sma50Data, sma200Data, adxData] = await Promise.all([
      fetchAV(
        { function: 'RSI', symbol, interval: 'daily', time_period: 14, series_type: 'close' },
        300,
      ),
      fetchAV({ function: 'MACD', symbol, interval: 'daily', series_type: 'close' }, 300),
      fetchAV(
        { function: 'BBANDS', symbol, interval: 'daily', time_period: 20, series_type: 'close' },
        300,
      ),
      fetchAV(
        { function: 'SMA', symbol, interval: 'daily', time_period: 50, series_type: 'close' },
        300,
      ),
      fetchAV(
        { function: 'SMA', symbol, interval: 'daily', time_period: 200, series_type: 'close' },
        300,
      ),
      fetchAV({ function: 'ADX', symbol, interval: 'daily', time_period: 14 }, 300),
    ]);

    const latestRsi = Object.values(rsiData?.['Technical Analysis: RSI'] || {})[0];
    const latestMacd = Object.values(macdData?.['Technical Analysis: MACD'] || {})[0];
    const latestBbands = Object.values(bbandsData?.['Technical Analysis: BBANDS'] || {})[0];
    const latestSma50 = Object.values(sma50Data?.['Technical Analysis: SMA'] || {})[0];
    const latestSma200 = Object.values(sma200Data?.['Technical Analysis: SMA'] || {})[0];
    const latestAdx = Object.values(adxData?.['Technical Analysis: ADX'] || {})[0];

    const rsi = num(latestRsi?.RSI);
    const macdVal = num(latestMacd?.MACD);
    const macdSignal = num(latestMacd?.MACD_Signal);
    const macdHist = num(latestMacd?.MACD_Hist);
    const bbUpper = num(latestBbands?.['Real Upper Band']);
    const bbMiddle = num(latestBbands?.['Real Middle Band']);
    const bbLower = num(latestBbands?.['Real Lower Band']);
    const sma50 = num(latestSma50?.SMA);
    const sma200 = num(latestSma200?.SMA);
    const adx = num(latestAdx?.ADX);

    const quote = await fetchAV({ function: 'GLOBAL_QUOTE', symbol }, 60);
    const price = num(quote?.['Global Quote']?.['05. price']);

    const indicators = [
      {
        name: 'RSI (14)',
        value: rsi,
        formatted: rsi?.toFixed(1),
        signal: rsi != null ? (rsi < 30 ? 'buy' : rsi > 70 ? 'sell' : 'neutral') : 'neutral',
        detail: rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral zone',
      },
      {
        name: 'MACD',
        value: macdHist,
        formatted: macdHist?.toFixed(4),
        signal: macdHist > 0 ? 'buy' : macdHist < 0 ? 'sell' : 'neutral',
        detail:
          macdHist > 0
            ? 'Histogram positive (bullish momentum)'
            : 'Histogram negative (bearish momentum)',
      },
      {
        name: 'Bollinger Bands',
        value: price,
        formatted: price?.toFixed(2),
        signal:
          price && bbLower && price < bbLower
            ? 'buy'
            : price && bbUpper && price > bbUpper
              ? 'sell'
              : 'neutral',
        detail:
          price < bbLower
            ? 'Below lower band (oversold)'
            : price > bbUpper
              ? 'Above upper band (overbought)'
              : 'Within bands',
      },
      {
        name: 'SMA 50/200 Cross',
        value: sma50 && sma200 ? sma50 - sma200 : null,
        formatted: sma50 && sma200 ? (sma50 > sma200 ? 'Golden Cross' : 'Death Cross') : '—',
        signal: sma50 && sma200 ? (sma50 > sma200 ? 'buy' : 'sell') : 'neutral',
        detail:
          sma50 && sma200
            ? `SMA50: $${sma50.toFixed(2)} | SMA200: $${sma200.toFixed(2)}`
            : 'Insufficient data',
      },
      {
        name: 'Price vs SMA 50',
        value: price && sma50 ? price - sma50 : null,
        formatted: price && sma50 ? `${(((price - sma50) / sma50) * 100).toFixed(1)}%` : '—',
        signal: price && sma50 ? (price > sma50 ? 'buy' : 'sell') : 'neutral',
        detail: price > sma50 ? 'Price above SMA 50 (uptrend)' : 'Price below SMA 50 (downtrend)',
      },
      {
        name: 'ADX (14)',
        value: adx,
        formatted: adx?.toFixed(1),
        signal: adx > 25 ? 'buy' : 'neutral',
        detail:
          adx > 40
            ? 'Very strong trend'
            : adx > 25
              ? 'Strong trend'
              : adx > 20
                ? 'Developing trend'
                : 'Weak/no trend',
      },
    ];

    const buyCount = indicators.filter((i) => i.signal === 'buy').length;
    const sellCount = indicators.filter((i) => i.signal === 'sell').length;
    const aggregate =
      buyCount > sellCount + 1
        ? 'Strong Buy'
        : buyCount > sellCount
          ? 'Buy'
          : sellCount > buyCount + 1
            ? 'Strong Sell'
            : sellCount > buyCount
              ? 'Sell'
              : 'Neutral';

    return NextResponse.json(
      {
        symbol,
        price,
        indicators,
        aggregate,
        buyCount,
        sellCount,
        neutralCount: indicators.length - buyCount - sellCount,
        raw: { rsi, macdVal, macdSignal, macdHist, bbUpper, bbMiddle, bbLower, sma50, sma200, adx },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=300' } },
    );
  } catch (err) {
    console.error(`[quants/indicators] ${symbol}:`, err);
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
