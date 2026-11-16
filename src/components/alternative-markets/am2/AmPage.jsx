'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useOrg } from '@/contexts/OrgContext';
import { useCouncilAlt } from '@/components/alternative-markets/council/useCouncilAlt';
import {
  CRYPTO_STATS,
  COMMODITY_STATS,
  CRYPTO_ROWS_TOP20,
  COMMODITY_TABLE_ROWS,
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
  buildMarqueeItems,
  deriveOHLC,
  buildChartSeries,
  buildSentimentTopics,
  buildWhaleEvents,
} from './am2-mappers';

import '@/app/(dashboard)/alternative-markets/am2.css';

/* Council cards load on demand, so the retail bundle does not carry them. */
const CouncilWorkspace = dynamic(
  () =>
    import('@/components/alternative-markets/council/CouncilAlt').then((m) => m.CouncilWorkspace),
  { ssr: false, loading: () => null },
);
const CouncilContext = dynamic(
  () => import('@/components/alternative-markets/council/CouncilAlt').then((m) => m.CouncilContext),
  { ssr: false, loading: () => null },
);
const CouncilChartActions = dynamic(
  () =>
    import('@/components/alternative-markets/council/CouncilAlt').then(
      (m) => m.CouncilChartActions,
    ),
  { ssr: false, loading: () => null },
);

const METRIC_ACCENTS = { btc: 'gold', eth: 'purple', mcap: 'cyan', fg: 'emerald' };

/*
 * Every market figure on this page is fixed illustrative data built into the
 * app; nothing claims to be live or delayed. Council members (once their
 * membership is known) also see two council bands and chart actions; the
 * page is otherwise the same for everyone.
 */
export function AmPage() {
  const [assetClass, setAssetClass] = useState('crypto');
  const [picked, setPicked] = useState(null);
  const isCrypto = assetClass === 'crypto';
  const { isOrgUser, isLoading: orgLoading, hasPermission, orgData } = useOrg();
  const councilReady = Boolean(isOrgUser && !orgLoading);
  const council = useCouncilAlt(councilReady);

  const switchClass = (next) => {
    setAssetClass(next);
    setPicked(null);
  };

  const headlineStats = useMemo(() => {
    const source = isCrypto ? CRYPTO_STATS : COMMODITY_STATS;
    return source.map((s) => enrichHeadlineMetric(s, METRIC_ACCENTS[s.id] || 'emerald'));
  }, [isCrypto]);

  const pricesRows = useMemo(() => {
    const source = isCrypto ? CRYPTO_ROWS_TOP20 : COMMODITY_TABLE_ROWS;
    return source.map((row, i) => enrichPricesRow(row, i));
  }, [isCrypto]);

  /* Movers come from the same rows as the table, so a row and its mover agree. */
  const winners = useMemo(
    () =>
      pricesRows
        .filter((r) => r.chg24h > 0)
        .sort((a, b) => b.chg24h - a.chg24h)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [pricesRows],
  );

  const losers = useMemo(
    () =>
      pricesRows
        .filter((r) => r.chg24h < 0)
        .sort((a, b) => a.chg24h - b.chg24h)
        .map((r, i) => ({ ...r, rank: i + 1 })),
    [pricesRows],
  );

  const rowTickers = useMemo(() => pricesRows.map((r) => r.ticker), [pricesRows]);

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

  const selectedRow = useMemo(
    () => pricesRows.find((r) => r.ticker === picked) || pricesRows[0] || null,
    [pricesRows, picked],
  );

  const chartMeta = useMemo(() => {
    const top = selectedRow;
    if (!top) return null;
    const series = buildChartSeries(top.price, top.chg24h, 90);
    return {
      assetName: top.name,
      assetTicker: top.ticker,
      currentPrice: top.price,
      delta: top.chg24h,
      deltaAbs: formatDeltaAbs(top.price, top.chg24h),
      series,
      ohlc: deriveOHLC(top.price, series),
    };
  }, [selectedRow]);

  const sentimentTopics = useMemo(buildSentimentTopics, []);
  const whales = useMemo(buildWhaleEvents, []);

  const newsItems = useMemo(() => {
    const source = isCrypto ? CRYPTO_NEWS : COMM_NEWS;
    return source.map((n) => ({
      time: n.time || '–',
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
      '7d_pct': r.chg7d == null ? 'N/A' : r.chg7d,
      mcap: r.mcap,
    }));
    // Quote + escape every cell (asset names can contain commas) and
    // neutralize spreadsheet formula injection.
    const esc = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      Object.keys(rows[0] || {}).join(','),
      ...rows.map((r) => Object.values(r).map(esc).join(',')),
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
          onAssetClassChange={switchClass}
          onExport={handleExport}
          onAddWatchlist={handleAddWatchlist}
        />

        <AmMetricsGrid stats={headlineStats} />

        {councilReady && (
          <CouncilWorkspace
            council={council}
            mode={assetClass}
            rowTickers={rowTickers}
            councilName={orgData?.org?.name || null}
          />
        )}

        <div className="am2-row-wide">
          <AmPricesTable
            key={assetClass}
            rows={pricesRows}
            title={isCrypto ? 'Crypto prices' : 'Commodity prices'}
            subtitle="Illustrative figures"
            tabs={isCrypto ? CRYPTO_TABLE_TABS : COMMODITY_TABLE_TABS}
            selected={selectedRow?.ticker}
            onRowClick={(r) => setPicked(r.ticker)}
          />
          <AmMovers
            winners={winners}
            losers={losers}
            selected={selectedRow?.ticker}
            onRowClick={(r) => setPicked(r.ticker)}
          />
        </div>

        <div className="am2-row-wide">
          {chartMeta && (
            <AmPriceChart
              {...chartMeta}
              assets={pricesRows}
              onAssetSelect={setPicked}
              actions={
                councilReady ? (
                  <CouncilChartActions
                    council={council}
                    asset={{ ticker: selectedRow.ticker, name: chartMeta.assetName }}
                    canSendToTeam={hasPermission('send_to_team')}
                  />
                ) : null
              }
            />
          )}
          <AmSentiment topics={sentimentTopics} />
        </div>

        {councilReady && <CouncilContext council={council} />}

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

function deriveTopic(title) {
  const t = String(title).toLowerCase();
  if (/etf|sec|approv|regul/.test(t)) return 'Policy';
  if (/protocol|chain|stake|staking|merge|fork/.test(t)) return 'Protocol';
  if (/stable|usdc|usdt|tether/.test(t)) return 'Stables';
  if (/on-chain|whale|wallet|address|flow/.test(t)) return 'On-chain';
  return 'Markets';
}
