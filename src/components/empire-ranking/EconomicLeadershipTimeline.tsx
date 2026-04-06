"use client";

const timelineData = [
  {
    era: "1600s",
    leader: "Netherlands",
    gdpShare: 24,
    color: "#F97316",
    description: "Dutch East India Company, global spice trade dominance",
    flag: "\u{1F1F3}\u{1F1F1}",
  },
  {
    era: "1700s",
    leader: "Britain",
    gdpShare: 32,
    color: "#3B82F6",
    description: "Industrial Revolution, colonial empire, Royal Navy",
    flag: "\u{1F1EC}\u{1F1E7}",
  },
  {
    era: "1800s",
    leader: "Britain",
    gdpShare: 38,
    color: "#3B82F6",
    description: "Peak empire \u2014 25% of world land mass",
    flag: "\u{1F1EC}\u{1F1E7}",
  },
  {
    era: "1900s",
    leader: "United States",
    gdpShare: 40,
    color: "#22C55E",
    description: "Post-WWII Bretton Woods, dollar reserve currency",
    flag: "\u{1F1FA}\u{1F1F8}",
  },
  {
    era: "1970s\u20131990s",
    leader: "United States",
    gdpShare: 35,
    color: "#22C55E",
    description: "Tech boom, Cold War victory, globalisation",
    flag: "\u{1F1FA}\u{1F1F8}",
  },
  {
    era: "2000s",
    leader: "US / China",
    gdpShare: 28,
    color: "#A855F7",
    description: "China manufacturing rise, US financial dominance",
    flag: "\u{1F1FA}\u{1F1F8}\u{1F1E8}\u{1F1F3}",
  },
  {
    era: "2010s",
    leader: "US / China",
    gdpShare: 25,
    color: "#A855F7",
    description: "Belt & Road, tech rivalry, currency competition",
    flag: "\u{1F1FA}\u{1F1F8}\u{1F1E8}\u{1F1F3}",
  },
  {
    era: "2020s",
    leader: "Contested",
    gdpShare: 22,
    color: "#EF4444",
    description: "Multipolar transition \u2014 AI race, de-dollarisation",
    flag: "\u{1F310}",
  },
];

export default function EconomicLeadershipTimeline() {
  return (
    <section className="er-card w-full">
      <div className="er-card-header">
        <div className="er-card-header-left">
          <i className="bi bi-clock-history" aria-hidden />
          <div>
            <h3>Global Economic Leadership Timeline</h3>
            <p className="er-card-subtitle">Century-long shifts in dominant economic powers</p>
          </div>
        </div>
        <span className="er-analytics-badge">Inspired by Dalio</span>
      </div>

      <div className="er-card-body">
        <div className="relative">
          {timelineData.map((item, i) => (
            <div key={item.era} className="flex items-stretch gap-3 mb-2 group" style={{ marginBottom: "0.35rem" }}>
              <div className="w-20 shrink-0 flex items-center justify-end">
                <span className="er-analytics-timeline-era">{item.era}</span>
              </div>

              <div className="flex flex-col items-center w-5 shrink-0">
                <div
                  className="w-2.5 h-2.5 rounded-full border-2 shrink-0 mt-1"
                  style={{ borderColor: item.color, background: `${item.color}33` }}
                />
                {i < timelineData.length - 1 && (
                  <div className="w-px flex-1 mt-1 min-h-[0.5rem]" style={{ background: `${item.color}44` }} />
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
                    <span className="text-base leading-none">{item.flag}</span>
                    <span className="text-sm font-semibold" style={{ color: "#f0f6fc" }}>
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

        <p className="er-analytics-muted" style={{ fontSize: "0.65rem", marginTop: "0.75rem", marginBottom: 0 }}>
          Bar width = estimated share of global GDP at peak
        </p>
      </div>
    </section>
  );
}
