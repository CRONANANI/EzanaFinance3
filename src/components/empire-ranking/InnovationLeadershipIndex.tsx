"use client";

import { CardControls, ToggleChips } from "./card-controls";
import { useCardConfig } from "@/hooks/useCardConfig";

type Metric = "patents" | "rd_spend" | "ai_pubs" | "startup_funding" | "composite";

const metrics: { key: Metric; label: string; unit: string }[] = [
  { key: "patents", label: "Patents Filed", unit: "K/yr" },
  { key: "rd_spend", label: "R&D Spending", unit: "% GDP" },
  { key: "ai_pubs", label: "AI Publications", unit: "K/yr" },
  { key: "startup_funding", label: "Startup Funding", unit: "$B" },
  { key: "composite", label: "Composite Score", unit: "/100" },
];

const countries: {
  name: string;
  flag: string;
  color: string;
  scores: Record<Metric, number>;
}[] = [
  {
    name: "United States",
    flag: "🇺🇸",
    color: "#3B82F6",
    scores: { patents: 597, rd_spend: 3.5, ai_pubs: 22, startup_funding: 180, composite: 94 },
  },
  {
    name: "China",
    flag: "🇨🇳",
    color: "#EF4444",
    scores: { patents: 1580, rd_spend: 2.4, ai_pubs: 34, startup_funding: 70, composite: 88 },
  },
  {
    name: "South Korea",
    flag: "🇰🇷",
    color: "#22C55E",
    scores: { patents: 238, rd_spend: 4.9, ai_pubs: 5, startup_funding: 14, composite: 76 },
  },
  {
    name: "Germany",
    flag: "🇩🇪",
    color: "#F59E0B",
    scores: { patents: 174, rd_spend: 3.1, ai_pubs: 8, startup_funding: 18, composite: 72 },
  },
  {
    name: "Japan",
    flag: "🇯🇵",
    color: "#A855F7",
    scores: { patents: 289, rd_spend: 3.3, ai_pubs: 7, startup_funding: 12, composite: 70 },
  },
  {
    name: "United Kingdom",
    flag: "🇬🇧",
    color: "#06B6D4",
    scores: { patents: 72, rd_spend: 1.7, ai_pubs: 9, startup_funding: 28, composite: 65 },
  },
  {
    name: "India",
    flag: "🇮🇳",
    color: "#F97316",
    scores: { patents: 61, rd_spend: 0.7, ai_pubs: 8, startup_funding: 22, composite: 52 },
  },
  {
    name: "Israel",
    flag: "🇮🇱",
    color: "#6366F1",
    scores: { patents: 18, rd_spend: 5.4, ai_pubs: 2, startup_funding: 9, composite: 68 },
  },
];

const TOPN_OPTIONS = [
  { value: 5, label: "Top 5" },
  { value: 8, label: "All 8" },
];

const METRIC_OPTIONS = metrics.map((m) => ({ value: m.key, label: m.label }));

type Config = { metric: Metric; topN: number };

export default function InnovationLeadershipIndex() {
  const [cfg, setCfg] = useCardConfig<Config>("innovation-index", {
    metric: "composite",
    topN: 8,
  });

  const metric = metrics.find((m) => m.key === cfg.metric) ?? metrics[0];
  const sorted = [...countries].sort(
    (a, b) => b.scores[cfg.metric] - a.scores[cfg.metric],
  );
  const visible = sorted.slice(0, cfg.topN);
  const maxVal = Math.max(...visible.map((c) => c.scores[cfg.metric]));

  return (
    <section className="er-card w-full">
      <div className="er-card-header">
        <div className="er-card-header-left">
          <i className="bi bi-lightning-charge" aria-hidden />
          <div>
            <h3>Innovation Leadership Index</h3>
            <p className="er-card-subtitle">
              Ranked by {metric.label.toLowerCase()} · {visible.length} of {countries.length}
            </p>
          </div>
        </div>
        <div className="er-card-actions">
          <CardControls>
            <ToggleChips
              label="Metric"
              options={METRIC_OPTIONS}
              value={cfg.metric}
              onChange={(v) => setCfg({ metric: v as Metric })}
            />
            <ToggleChips
              label="Show"
              options={TOPN_OPTIONS}
              value={cfg.topN}
              onChange={(v) => setCfg({ topN: v as number })}
            />
          </CardControls>
        </div>
      </div>

      <div className="er-card-body">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {visible.map((country, rank) => {
            const pct = (country.scores[cfg.metric] / maxVal) * 100;
            const isTopTwo = rank < 2;
            return (
              <div
                key={country.name}
                className="flex items-center gap-3 p-2 rounded-lg transition-all"
                style={{
                  background: "var(--er-surface-inset)",
                  border: "1px solid var(--er-border-soft)",
                }}
              >
                <div className="w-6 shrink-0 text-center">
                  {rank === 0 ? (
                    <span className="text-sm" data-contrast-ignore>🥇</span>
                  ) : rank === 1 ? (
                    <span className="text-sm" data-contrast-ignore>🥈</span>
                  ) : rank === 2 ? (
                    <span className="text-sm" data-contrast-ignore>🥉</span>
                  ) : (
                    <span className="text-xs font-mono er-analytics-muted">#{rank + 1}</span>
                  )}
                </div>

                <div className="w-32 flex items-center gap-2 shrink-0 min-w-0">
                  <span className="text-sm leading-none" data-contrast-ignore>
                    {country.flag}
                  </span>
                  <span
                    className="text-sm truncate font-medium"
                    style={{ color: isTopTwo ? country.color : "var(--er-text-body)" }}
                  >
                    {country.name}
                  </span>
                </div>

                <div className="er-analytics-bar-track flex-1 h-5">
                  <div
                    className="h-full rounded transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: `${country.color}88`,
                      borderRight: `2px solid ${country.color}`,
                    }}
                  />
                </div>

                <div className="w-[5.5rem] text-right shrink-0">
                  <span className="text-xs font-mono" style={{ color: country.color }}>
                    {country.scores[cfg.metric].toLocaleString()} {metric.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="er-analytics-muted" style={{ fontSize: "0.7rem", marginTop: "1rem", marginBottom: 0 }}>
          Data: WIPO patents, OECD R&D, arXiv AI publications, PitchBook funding. ~2023 estimates.
        </p>
      </div>
    </section>
  );
}
