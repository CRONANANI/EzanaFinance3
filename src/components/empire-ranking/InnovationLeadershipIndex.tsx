"use client";

import { useState } from "react";

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

export default function InnovationLeadershipIndex() {
  const [activeMetric, setActiveMetric] = useState<Metric>("composite");

  const metric = metrics.find((m) => m.key === activeMetric)!;
  const maxVal = Math.max(...countries.map((c) => c.scores[activeMetric]));

  const sorted = [...countries].sort(
    (a, b) => b.scores[activeMetric] - a.scores[activeMetric]
  );

  return (
    <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-6 w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-white text-lg font-semibold">
            Innovation Leadership Index
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Countries ranked by technological innovation capacity
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {metrics.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setActiveMetric(m.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={
              activeMetric === m.key
                ? {
                    background: "#6366F122",
                    border: "1px solid #6366F1",
                    color: "#6366F1",
                  }
                : {
                    background: "transparent",
                    border: "1px solid #374151",
                    color: "#6B7280",
                  }
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((country, rank) => {
          const pct = (country.scores[activeMetric] / maxVal) * 100;
          const isTopTwo = rank < 2;
          return (
            <div
              key={country.name}
              className="flex items-center gap-3 p-2 rounded-lg transition-all hover:bg-gray-900"
            >
              <div className="w-6 shrink-0">
                {rank === 0 ? (
                  <span className="text-sm">🥇</span>
                ) : rank === 1 ? (
                  <span className="text-sm">🥈</span>
                ) : rank === 2 ? (
                  <span className="text-sm">🥉</span>
                ) : (
                  <span className="text-xs text-gray-600 font-mono">#{rank + 1}</span>
                )}
              </div>

              <div className="w-36 flex items-center gap-2 shrink-0">
                <span className="text-base">{country.flag}</span>
                <span
                  className="text-sm truncate"
                  style={{ color: isTopTwo ? country.color : "#D1D5DB" }}
                >
                  {country.name}
                </span>
              </div>

              <div className="flex-1 h-5 bg-gray-900 rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: `${country.color}99`,
                    borderRight: `2px solid ${country.color}`,
                  }}
                />
              </div>

              <div className="w-20 text-right shrink-0">
                <span className="text-xs font-mono" style={{ color: country.color }}>
                  {country.scores[activeMetric].toLocaleString()} {metric.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-gray-600">
        Data: WIPO patents, OECD R&D, arXiv AI publications, PitchBook funding. ~2023 estimates.
      </div>
    </div>
  );
}
