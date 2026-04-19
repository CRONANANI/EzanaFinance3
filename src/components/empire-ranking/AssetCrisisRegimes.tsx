"use client";

import { CardControls, ToggleChips, DeltaText } from "./card-controls";
import { useCardConfig } from "@/hooks/useCardConfig";

type Regime = "inflation" | "recession" | "war" | "deflation" | "recovery";
type AssetClass = "all" | "equities" | "income" | "real" | "alts";

type AssetRow = { name: string; ret: number; icon: string; bucket: Exclude<AssetClass, "all"> };

const regimeData: Record<
  Regime,
  { label: string; color: string; description: string; assets: AssetRow[] }
> = {
  inflation: {
    label: "Inflation Spike",
    color: "#F97316",
    description: "CPI > 6%, rising rates environment",
    assets: [
      { name: "Gold", ret: 18, icon: "🥇", bucket: "alts" },
      { name: "Commodities", ret: 24, icon: "🛢️", bucket: "alts" },
      { name: "Real Estate", ret: 8, icon: "🏠", bucket: "real" },
      { name: "Stocks", ret: -4, icon: "📈", bucket: "equities" },
      { name: "Bonds", ret: -14, icon: "📄", bucket: "income" },
    ],
  },
  recession: {
    label: "Recession",
    color: "#EF4444",
    description: "GDP contraction, rising unemployment",
    assets: [
      { name: "Gold", ret: 12, icon: "🥇", bucket: "alts" },
      { name: "Bonds", ret: 9, icon: "📄", bucket: "income" },
      { name: "Commodities", ret: -18, icon: "🛢️", bucket: "alts" },
      { name: "Real Estate", ret: -12, icon: "🏠", bucket: "real" },
      { name: "Stocks", ret: -22, icon: "📈", bucket: "equities" },
    ],
  },
  war: {
    label: "Geopolitical War",
    color: "#DC2626",
    description: "Major armed conflict, supply chain disruption",
    assets: [
      { name: "Commodities", ret: 32, icon: "🛢️", bucket: "alts" },
      { name: "Gold", ret: 22, icon: "🥇", bucket: "alts" },
      { name: "Real Estate", ret: 4, icon: "🏠", bucket: "real" },
      { name: "Stocks", ret: -8, icon: "📈", bucket: "equities" },
      { name: "Bonds", ret: -6, icon: "📄", bucket: "income" },
    ],
  },
  deflation: {
    label: "Deflation",
    color: "#3B82F6",
    description: "Falling prices, debt deflation spiral",
    assets: [
      { name: "Bonds", ret: 18, icon: "📄", bucket: "income" },
      { name: "Gold", ret: 6, icon: "🥇", bucket: "alts" },
      { name: "Stocks", ret: -28, icon: "📈", bucket: "equities" },
      { name: "Commodities", ret: -24, icon: "🛢️", bucket: "alts" },
      { name: "Real Estate", ret: -16, icon: "🏠", bucket: "real" },
    ],
  },
  recovery: {
    label: "Recovery / Expansion",
    color: "#22C55E",
    description: "Growth accelerating, risk-on environment",
    assets: [
      { name: "Stocks", ret: 28, icon: "📈", bucket: "equities" },
      { name: "Real Estate", ret: 14, icon: "🏠", bucket: "real" },
      { name: "Commodities", ret: 10, icon: "🛢️", bucket: "alts" },
      { name: "Bonds", ret: 4, icon: "📄", bucket: "income" },
      { name: "Gold", ret: -2, icon: "🥇", bucket: "alts" },
    ],
  },
};

const REGIME_OPTIONS = (Object.keys(regimeData) as Regime[]).map((k) => ({
  value: k,
  label: regimeData[k].label,
}));

const ASSET_CLASS_OPTIONS: { value: AssetClass; label: string }[] = [
  { value: "all", label: "All" },
  { value: "equities", label: "Equities" },
  { value: "income", label: "Fixed Income" },
  { value: "real", label: "Real Estate" },
  { value: "alts", label: "Alternatives" },
];

type Config = { regime: Regime; assetClass: AssetClass };

export default function AssetCrisisRegimes() {
  const [cfg, setCfg] = useCardConfig<Config>("asset-crisis-regimes", {
    regime: "inflation",
    assetClass: "all",
  });

  const regime = regimeData[cfg.regime];
  const filtered =
    cfg.assetClass === "all"
      ? regime.assets
      : regime.assets.filter((a) => a.bucket === cfg.assetClass);
  const maxAbs = Math.max(1, ...filtered.map((a) => Math.abs(a.ret)));

  return (
    <section className="er-card w-full">
      <div className="er-card-header">
        <div className="er-card-header-left">
          <i className="bi bi-graph-up" aria-hidden />
          <div>
            <h3>Asset Performance During Crisis Regimes</h3>
            <p className="er-card-subtitle">
              {regime.label} · {filtered.length} asset{filtered.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="er-card-actions">
          <CardControls>
            <ToggleChips
              label="Regime"
              options={REGIME_OPTIONS}
              value={cfg.regime}
              onChange={(v) => setCfg({ regime: v as Regime })}
            />
            <ToggleChips
              label="Class"
              options={ASSET_CLASS_OPTIONS}
              value={cfg.assetClass}
              onChange={(v) => setCfg({ assetClass: v as AssetClass })}
            />
          </CardControls>
        </div>
      </div>

      <div className="er-card-body">
        <p
          className="er-analytics-muted"
          style={{ fontSize: "0.72rem", marginBottom: "0.85rem", fontStyle: "italic" }}
        >
          {regime.description}
        </p>

        {filtered.length === 0 ? (
          <div className="er-empty">No assets in that class for this regime.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {filtered.map((asset) => {
              const isPositive = asset.ret >= 0;
              const barWidth = (Math.abs(asset.ret) / maxAbs) * 50;

              return (
                <div key={asset.name} className="flex items-center gap-3">
                  <div className="w-24 flex items-center gap-2 shrink-0">
                    <span className="text-sm" data-contrast-ignore>
                      {asset.icon}
                    </span>
                    <span className="text-xs" style={{ color: "var(--er-text-body)" }}>
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
                    <div className="w-px h-5 shrink-0" style={{ background: "rgba(212,175,55,0.2)" }} />
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

                  <DeltaText value={asset.ret} className="w-11 text-right text-xs font-mono shrink-0">
                    {isPositive ? "+" : ""}
                    {asset.ret}%
                  </DeltaText>
                </div>
              );
            })}
          </div>
        )}

        <p className="er-analytics-muted" style={{ fontSize: "0.7rem", marginTop: "1rem", marginBottom: 0 }}>
          Returns are historical averages across comparable regimes. Not investment advice.
        </p>
      </div>
    </section>
  );
}
