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
    <section className="er-card w-full">
      <div className="er-card-header">
        <div className="er-card-header-left">
          <i className="bi bi-graph-up" aria-hidden />
          <div>
            <h3>Asset Performance During Crisis Regimes</h3>
            <p className="er-card-subtitle">What works — and what doesn&apos;t — across macro regimes</p>
          </div>
        </div>
      </div>

      <div className="er-card-body">
        <div className="er-pill-toggle-group">
          {regimes.map((r) => {
            const isOn = active === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setActive(r)}
                className={`er-pill-toggle${isOn ? " er-pill-toggle--active" : ""}`}
                style={
                  isOn
                    ? {
                        color: regimeData[r].color,
                        borderColor: `${regimeData[r].color}55`,
                        background: `${regimeData[r].color}14`,
                      }
                    : undefined
                }
              >
                {regimeData[r].label}
              </button>
            );
          })}
        </div>

        <p className="er-analytics-muted" style={{ fontSize: "0.68rem", marginBottom: "0.85rem", fontStyle: "italic" }}>
          {regime.description}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {regime.assets.map((asset) => {
            const isPositive = asset.ret >= 0;
            const barWidth = (Math.abs(asset.ret) / maxAbs) * 50;

            return (
              <div key={asset.name} className="flex items-center gap-3">
                <div className="w-24 flex items-center gap-2 shrink-0">
                  <span className="text-sm">{asset.icon}</span>
                  <span className="text-xs" style={{ color: "#e2e8f0" }}>
                    {asset.name}
                  </span>
                </div>

                <div className="flex-1 flex items-center min-w-0">
                  <div className="w-1/2 flex justify-end pr-1">
                    {!isPositive && (
                      <div
                        className="h-5 rounded-l transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          background: "#EF444466",
                          borderLeft: "2px solid #EF4444",
                        }}
                      />
                    )}
                  </div>
                  <div className="w-px h-5 shrink-0" style={{ background: "rgba(212,175,55,0.15)" }} />
                  <div className="w-1/2 flex justify-start pl-1">
                    {isPositive && (
                      <div
                        className="h-5 rounded-r transition-all duration-500"
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
                  className="w-11 text-right text-xs font-mono shrink-0"
                  style={{ color: isPositive ? "#22C55E" : "#EF4444" }}
                >
                  {isPositive ? "+" : ""}
                  {asset.ret}%
                </span>
              </div>
            );
          })}
        </div>

        <p className="er-analytics-muted" style={{ fontSize: "0.65rem", marginTop: "1rem", marginBottom: 0 }}>
          Returns are historical averages across comparable regimes. Not investment advice.
        </p>
      </div>
    </section>
  );
}
