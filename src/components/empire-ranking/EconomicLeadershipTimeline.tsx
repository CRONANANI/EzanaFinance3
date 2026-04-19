"use client";

import { CardControls, ToggleChips } from "./card-controls";
import { useCardConfig } from "@/hooks/useCardConfig";

type EraFilter = "all" | "pre1900" | "1900s" | "modern";

type TimelineEntry = {
  era: string;
  leader: string;
  gdpShare: number;
  color: string;
  description: string;
  flag: string;
  centuryStart: number;
};

const timelineData: TimelineEntry[] = [
  {
    era: "1600s",
    leader: "Netherlands",
    gdpShare: 24,
    color: "#F97316",
    description: "Dutch East India Company, global spice trade dominance",
    flag: "\u{1F1F3}\u{1F1F1}",
    centuryStart: 1600,
  },
  {
    era: "1700s",
    leader: "Britain",
    gdpShare: 32,
    color: "#3B82F6",
    description: "Industrial Revolution, colonial empire, Royal Navy",
    flag: "\u{1F1EC}\u{1F1E7}",
    centuryStart: 1700,
  },
  {
    era: "1800s",
    leader: "Britain",
    gdpShare: 38,
    color: "#3B82F6",
    description: "Peak empire \u2014 25% of world land mass",
    flag: "\u{1F1EC}\u{1F1E7}",
    centuryStart: 1800,
  },
  {
    era: "1900s",
    leader: "United States",
    gdpShare: 40,
    color: "#22C55E",
    description: "Post-WWII Bretton Woods, dollar reserve currency",
    flag: "\u{1F1FA}\u{1F1F8}",
    centuryStart: 1900,
  },
  {
    era: "1970s\u20131990s",
    leader: "United States",
    gdpShare: 35,
    color: "#22C55E",
    description: "Tech boom, Cold War victory, globalisation",
    flag: "\u{1F1FA}\u{1F1F8}",
    centuryStart: 1970,
  },
  {
    era: "2000s",
    leader: "US / China",
    gdpShare: 28,
    color: "#A855F7",
    description: "China manufacturing rise, US financial dominance",
    flag: "\u{1F1FA}\u{1F1F8}\u{1F1E8}\u{1F1F3}",
    centuryStart: 2000,
  },
  {
    era: "2010s",
    leader: "US / China",
    gdpShare: 25,
    color: "#A855F7",
    description: "Belt & Road, tech rivalry, currency competition",
    flag: "\u{1F1FA}\u{1F1F8}\u{1F1E8}\u{1F1F3}",
    centuryStart: 2010,
  },
  {
    era: "2020s",
    leader: "Contested",
    gdpShare: 22,
    color: "#EF4444",
    description: "Multipolar transition \u2014 AI race, de-dollarisation",
    flag: "\u{1F310}",
    centuryStart: 2020,
  },
];

const ERA_OPTIONS: { value: EraFilter; label: string }[] = [
  { value: "all", label: "All eras" },
  { value: "pre1900", label: "Pre-1900" },
  { value: "1900s", label: "1900s" },
  { value: "modern", label: "2000+" },
];

function eraMatches(filter: EraFilter, entry: TimelineEntry): boolean {
  switch (filter) {
    case "all":
      return true;
    case "pre1900":
      return entry.centuryStart < 1900;
    case "1900s":
      return entry.centuryStart >= 1900 && entry.centuryStart < 2000;
    case "modern":
      return entry.centuryStart >= 2000;
    default:
      return true;
  }
}

type SortDir = "chronological" | "dominance";

const SORT_OPTIONS: { value: SortDir; label: string }[] = [
  { value: "chronological", label: "Chronological" },
  { value: "dominance", label: "By GDP share" },
];

type Config = { era: EraFilter; sort: SortDir };

export default function EconomicLeadershipTimeline() {
  const [cfg, setCfg] = useCardConfig<Config>("economic-timeline", {
    era: "all",
    sort: "chronological",
  });

  const filtered = timelineData.filter((d) => eraMatches(cfg.era, d));
  const rows =
    cfg.sort === "dominance"
      ? [...filtered].sort((a, b) => b.gdpShare - a.gdpShare)
      : filtered;

  return (
    <section className="er-card w-full">
      <div className="er-card-header">
        <div className="er-card-header-left">
          <i className="bi bi-clock-history" aria-hidden />
          <div>
            <h3>Global Economic Leadership Timeline</h3>
            <p className="er-card-subtitle">
              Dominant economic powers · {rows.length} of {timelineData.length} era
              {rows.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="er-card-actions">
          <CardControls>
            <ToggleChips
              label="Era"
              options={ERA_OPTIONS}
              value={cfg.era}
              onChange={(v) => setCfg({ era: v as EraFilter })}
            />
            <ToggleChips
              label="Sort"
              options={SORT_OPTIONS}
              value={cfg.sort}
              onChange={(v) => setCfg({ sort: v as SortDir })}
            />
          </CardControls>
        </div>
        <span className="er-analytics-badge">Inspired by Dalio</span>
      </div>

      <div className="er-card-body">
        {rows.length === 0 ? (
          <div className="er-empty">No eras match this filter.</div>
        ) : (
          <div className="relative">
            {rows.map((item, i) => (
              <div
                key={item.era}
                className="flex items-stretch gap-3 mb-2 group"
                style={{ marginBottom: "0.35rem" }}
              >
                <div className="w-20 shrink-0 flex items-center justify-end">
                  <span className="er-analytics-timeline-era">{item.era}</span>
                </div>

                <div className="flex flex-col items-center w-5 shrink-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full border-2 shrink-0 mt-1"
                    style={{ borderColor: item.color, background: `${item.color}33` }}
                  />
                  {i < rows.length - 1 && (
                    <div
                      className="w-px flex-1 mt-1 min-h-[0.5rem]"
                      style={{ background: `${item.color}44` }}
                    />
                  )}
                </div>

                <div
                  className="flex-1 rounded-lg p-3 mb-0.5 border transition-all duration-200"
                  style={{
                    background: `${item.color}12`,
                    borderColor: `${item.color}35`,
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none" data-contrast-ignore>
                        {item.flag}
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--er-text-primary)" }}
                      >
                        {item.leader}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="er-analytics-bar-track w-24">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(item.gdpShare / 40) * 100}%`,
                            background: item.color,
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono shrink-0" style={{ color: item.color }}>
                        ~{item.gdpShare}%
                      </span>
                    </div>
                  </div>
                  <p className="er-analytics-timeline-body">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p
          className="er-analytics-muted"
          style={{ fontSize: "0.7rem", marginTop: "0.75rem", marginBottom: 0 }}
        >
          Bar width = estimated share of global GDP at peak
        </p>
      </div>
    </section>
  );
}
