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
    <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-lg font-semibold">
            Global Economic Leadership Timeline
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Century-long shifts in dominant economic powers
          </p>
        </div>
        <span className="text-xs text-gray-500 bg-gray-800 px-3 py-1 rounded-full">
          Inspired by Dalio
        </span>
      </div>

      <div className="relative">
        {timelineData.map((item, i) => (
          <div key={item.era} className="flex items-stretch gap-4 mb-2 group">
            <div className="w-24 shrink-0 flex items-center justify-end">
              <span className="text-xs text-gray-500 text-right leading-tight">
                {item.era}
              </span>
            </div>

            <div className="flex flex-col items-center w-6 shrink-0">
              <div
                className="w-3 h-3 rounded-full border-2 shrink-0 mt-1"
                style={{ borderColor: item.color, background: `${item.color}33` }}
              />
              {i < timelineData.length - 1 && (
                <div className="w-0.5 flex-1 mt-1" style={{ background: `${item.color}44` }} />
              )}
            </div>

            <div
              className="flex-1 rounded-lg p-3 mb-1 border transition-all duration-200 group-hover:border-opacity-60"
              style={{
                background: `${item.color}10`,
                borderColor: `${item.color}33`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.flag}</span>
                  <span className="text-white text-sm font-medium">
                    {item.leader}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(item.gdpShare / 40) * 100}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono" style={{ color: item.color }}>
                    ~{item.gdpShare}%
                  </span>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-1">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
        <span className="w-3 h-0.5 bg-gray-600 inline-block" />
        Bar width = estimated share of global GDP at peak
      </div>
    </div>
  );
}
