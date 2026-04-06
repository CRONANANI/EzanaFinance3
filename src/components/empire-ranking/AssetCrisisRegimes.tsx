"use client";

import { useState } from "react";

type Regime = "inflation" | "recession" | "war" | "deflation" | "recovery";

type AssetRow = { name: string; ret: number; icon: string };

const regimeData: Record<
  Regime,
  {
    label: string;
    color: string;
    description: string;
    assets: AssetRow[];
  }
> = {
  inflation: {
    label: "Inflation Spike",
    color: "#F97316",
    description: "CPI > 6%, rising rates environment",
    assets: [
      { name: "Gold", ret: 18, icon: "🥇" },
      { name: "Commodities", ret: 24, icon: "🛢️" },
      { name: "Real Estate", ret: 8, icon: "🏠" },
      { name: "Stocks", ret: -4, icon: "📈" },
      { name: "Bonds", ret: -14, icon: "📄" },
    ],
  },
  recession: {
    label: "Recession",
    color: "#EF4444",
    description: "GDP contraction, rising unemployment",
    assets: [
      { name: "Gold", ret: 12, icon: "🥇" },
      { name: "Bonds", ret: 9, icon: "📄" },
      { name: "Commodities", ret: -18, icon: "🛢️" },
      { name: "Real Estate", ret: -12, icon: "🏠" },
      { name: "Stocks", ret: -22, icon: "📈" },
    ],
  },
  war: {
    label: "Geopolitical War",
    color: "#DC2626",
    description: "Major armed conflict, supply chain disruption",
    assets: [
      { name: "Commodities", ret: 32, icon: "🛢️" },
      { name: "Gold", ret: 22, icon: "🥇" },
      { name: "Real Estate", ret: 4, icon: "🏠" },
      { name: "Stocks", ret: -8, icon: "📈" },
      { name: "Bonds", ret: -6, icon: "📄" },
    ],
  },
  deflation: {
    label: "Deflation",
    color: "#3B82F6",
    description: "Falling prices, debt deflation spiral",
    assets: [
      { name: "Bonds", ret: 18, icon: "📄" },
      { name: "Gold", ret: 6, icon: "🥇" },
      { name: "Stocks", ret: -28, icon: "📈" },
      { name: "Commodities", ret: -24, icon: "🛢️" },
      { name: "Real Estate", ret: -16, icon: "🏠" },
    ],
  },
  recovery: {
    label: "Recovery / Expansion",
    color: "#22C55E",
    description: "Growth accelerating, risk-on environment",
    assets: [
      { name: "Stocks", ret: 28, icon: "📈" },
      { name: "Real Estate", ret: 14, icon: "🏠" },
      { name: "Commodities", ret: 10, icon: "🛢️" },
      { name: "Bonds", ret: 4, icon: "📄" },
      { name: "Gold", ret: -2, icon: "🥇" },
    ],
  },
};

const regimes: Regime[] = ["inflation", "recession", "war", "deflation", "recovery"];

export default function AssetCrisisRegimes() {
  const [active, setActive] = useState<Regime>("inflation");
  const regime = regimeData[active];

  const maxAbs = Math.max(...regime.assets.map((a) => Math.abs(a.ret)));

  return (
    <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-6 w-full">
      <div className="mb-6">
        <h2 className="text-white text-lg font-semibold">
          Asset Performance During Crisis Regimes
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          What works — and what doesn&apos;t — across macro regimes
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {regimes.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setActive(r)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={
              active === r
                ? {
                    background: `${regimeData[r].color}22`,
                    border: `1px solid ${regimeData[r].color}`,
                    color: regimeData[r].color,
                  }
                : {
                    background: "transparent",
                    border: "1px solid #374151",
                    color: "#6B7280",
                  }
            }
          >
            {regimeData[r].label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 mb-4 italic">{regime.description}</p>

      <div className="space-y-3">
        {regime.assets.map((asset) => {
          const isPositive = asset.ret >= 0;
          const barWidth = (Math.abs(asset.ret) / maxAbs) * 50;

          return (
            <div key={asset.name} className="flex items-center gap-3">
              <div className="w-24 flex items-center gap-2 shrink-0">
                <span className="text-base">{asset.icon}</span>
                <span className="text-xs text-gray-300">{asset.name}</span>
              </div>

              <div className="flex-1 flex items-center">
                <div className="w-1/2 flex justify-end pr-1">
                  {!isPositive && (
                    <div
                      className="h-6 rounded-l transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        background: "#EF444466",
                        borderLeft: "2px solid #EF4444",
                      }}
                    />
                  )}
                </div>
                <div className="w-px h-6 bg-gray-700" />
                <div className="w-1/2 flex justify-start pl-1">
                  {isPositive && (
                    <div
                      className="h-6 rounded-r transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        background: "#22C55E66",
                        borderRight: "2px solid #22C55E",
                      }}
                    />
                  )}
                </div>
              </div>

              <span
                className="w-12 text-right text-xs font-mono shrink-0"
                style={{ color: isPositive ? "#22C55E" : "#EF4444" }}
              >
                {isPositive ? "+" : ""}
                {asset.ret}%
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-600">
        Returns are historical averages across comparable regimes. Not investment advice.
      </div>
    </div>
  );
}
