'use client';

import { useMemo, useState } from 'react';
import {
  CRYPTO_STATS,
  COMMODITY_STATS,
  CRYPTO_ROWS_TOP20,
  COMMODITY_TABLE_ROWS,
  CRYPTO_WINNERS,
  CRYPTO_LOSERS,
  COMMODITY_WINNERS,
  COMMODITY_LOSERS,
  ONCHAIN,
  CRYPTO_NEWS,
  COMM_NEWS,
  CRYPTO_TABLE_TABS,
  COMMODITY_TABLE_TABS,
} from '@/lib/alternative-markets-mock';

import { MarqueeTicker } from './MarqueeTicker';
import { AmPageHeader } from './AmPageHeader';
import { AmMetricsGrid } from './AmMetricsGrid';
import { AmPricesTable } from './AmPricesTable';
import { AmMovers } from './AmMovers';
import { AmPriceChart } from './AmPriceChart';
import { AmSentiment } from './AmSentiment';
import { AmOnchain } from './AmOnchain';
import { AmNews } from './AmNews';
import { AmPageFooter } from './AmPageFooter';

import {
  enrichHeadlineMetric,
  enrichPricesRow,
  enrichMover,
  buildMarqueeItems,
  deriveOHLC,
  buildChartSeries,
  buildSentimentTopics,
  buildWhaleEvents,
} from './am2-mappers';

import '@/app/(dashboard)/alternative-markets/am2.css';

const METRIC_ACCENTS = { btc: 'gold', eth: 'purple', mcap: 'cyan', fg: 'emerald' };

export function AmPage() {
  const [assetClass, setAssetClass] = useState('crypto');
  const isCrypto = assetClass === 'crypto';

  const headlineStats = useMemo(() => {
    const source = isCrypto ? CRYPTO_STATS : COMMODITY_STATS;
    return source.map((s) => enrichHeadlineMetric(s, METRIC_ACCENTS[s.id] || 'emerald'));
  }, [isCrypto]);

  const pricesRows = useMemo(() => {
    const source = isCrypto ? CRYPTO_ROWS_TOP20 : COMMODITY_TABLE_ROWS;
    return source.map((row, i) => enrichPricesRow(row, i));
  }, [isCrypto]);

  const winners = useMemo(
    () => (isCrypto ? CRYPTO_WINNERS : COMMODITY_WINNERS).map((row, i) => enrichMover(row, i)),
    [isCrypto],
  );

  const losers = useMemo(
    () => (isCrypto ? CRYPTO_LOSERS : COMMODITY_LOSERS).map((row, i) => enrichMover(row, i)),
    [isCrypto],
  );

  const marqueeItems = useMemo(
    () =>
      buildMarqueeItems(
        isCrypto ? CRYPTO_STATS : COMMODITY_STATS,
        pricesRows.slice(0, 12).map((r) => ({
          name: r.name,
          ticker: r.ticker,
          price: r.price,
          chg: `${r.chg24h > 0 ? '+' : ''}${r.chg24h.toFixed(2)}%`,
        })),
      ),
    [isCrypto, pricesRows],
  );

  const chartMeta = useMemo(() => {
    const top = pricesRows[0];
    if (!top) return null;
    const series = buildChartSeries(top.price, top.chg24h, 90);
    return {
      assetName: top.name,
      assetTicker: top.ticker,
      accent: METRIC_ACCENTS[top.ticker?.toLowerCase()] || 'gold',
      currentPrice: top.price,
      delta: top.chg24h,
      deltaAbs: formatDeltaAbs(top.price, top.chg24h),
      series,
      ohlc: deriveOHLC(top.price, series),
    };
  }, [pricesRows]);

  const sentimentTopics = useMemo(buildSentimentTopics, []);
  const whales = useMemo(buildWhaleEvents, []);

  const newsItems = useMemo(() => {
    const source = isCrypto ? CRYPTO_NEWS : COMM_NEWS;
    return source.map((n) => ({
      time: n.time || '—',
      topic: deriveTopic(n.title),
      title: n.title,
      source: n.source,
    }));
  }, [isCrypto]);

  const btcStats = ONCHAIN.btc || [];
  const ethStats = ONCHAIN.eth || [];

  const handleExport = () => {
    const rows = pricesRows.map((r) => ({
      rank: r.rank,
      asset: r.name,
      price: r.price,
      '24h_pct': r.chg24h,
      '7d_pct': r.chg7d,
      mcap: r.mcap,
    }));
    const csv = [
      Object.keys(rows[0] || {}).join(','),
      ...rows.map((r) => Object.values(r).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alternative-markets-${assetClass}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddWatchlist = () => {
    window.location.href = '/watchlist';
  };

  return (
    <div className="am2-page">
      <MarqueeTicker items={marqueeItems} />

      <div className="am2-content">
        <AmPageHeader
          assetClass={assetClass}
          onAssetClassChange={setAssetClass}
          onExport={handleExport}
          onAddWatchlist={handleAddWatchlist}
        />

        <AmMetricsGrid stats={headlineStats} />

        <div className="am2-row-wide">
          <AmPricesTable
            rows={pricesRows}
            title={isCrypto ? 'Crypto prices' : 'Commodity prices'}
            subtitle={formatDate()}
            tabs={isCrypto ? CRYPTO_TABLE_TABS : COMMODITY_TABLE_TABS}
          />
          <AmMovers winners={winners} losers={losers} />
        </div>

        <div className="am2-row-wide">
          {chartMeta && <AmPriceChart {...chartMeta} />}
          <AmSentiment topics={sentimentTopics} />
        </div>

        {isCrypto && <AmOnchain btcStats={btcStats} ethStats={ethStats} whales={whales} />}

        <AmNews items={newsItems} />

        <AmPageFooter />
      </div>
    </div>
  );
}

function formatDeltaAbs(priceStr, pct) {
  const num = parseFloat(String(priceStr).replace(/[$,]/g, '')) || 0;
  const abs = (num * pct) / 100;
  const sign = abs < 0 ? '−' : '+';
  return `${sign}$${Math.abs(abs).toFixed(2)}`;
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function deriveTopic(title) {
  const t = String(title).toLowerCase();
  if (/etf|sec|approv|regul/.test(t)) return 'Policy';
  if (/protocol|chain|stake|staking|merge|fork/.test(t)) return 'Protocol';
  if (/stable|usdc|usdt|tether/.test(t)) return 'Stables';
  if (/on-chain|whale|wallet|address|flow/.test(t)) return 'On-chain';
  return 'Markets';
}
