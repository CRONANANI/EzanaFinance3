"use client";

import { useState } from "react";
import {
  Building2,
  Search,
  BarChart3,
  Scale,
  Filter,
  TrendingUp,
  Megaphone,
  Target,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Coins,
  Globe,
} from "lucide-react";
import { FinancialTable, defaultIndices } from "@/components/ui/financial-markets-table";

const NAV_TABS = [
  { id: "markets", label: "Markets", icon: Building2 },
  { id: "indexes", label: "Indexes", icon: Search },
  { id: "rates", label: "Rates", icon: BarChart3 },
  { id: "commodities", label: "Commodities", icon: Coins },
  { id: "global", label: "Global Data", icon: Globe },
];

const SIDEBAR_ITEMS = [
  { id: "search", label: "Search Company", icon: Search },
  { id: "market", label: "Market", icon: BarChart3 },
  { id: "balance", label: "Last Balance Sheet", icon: Scale },
  { id: "filter", label: "Filtering", icon: Filter },
  { id: "analysis", label: "Analysis", icon: TrendingUp },
  { id: "offering", label: "Public Offering", icon: Megaphone },
  { id: "dividend", label: "Dividend", icon: Target },
];

const MARKET_CARDS = [
  { ticker: "XU100", value: "2.31", change: 1.5 },
  { ticker: "XU030", value: "864.66", change: 2.9 },
  { ticker: "SPX", value: "28,990.1", change: 1.5 },
  { ticker: "NASDAQ100", value: "7,993.85", change: 2.5 },
  { ticker: "UK100", value: "866.66", change: 1.5 },
  { ticker: "DAX", value: "28,990.1", change: 1.3 },
  { ticker: "DJI", value: "31,599.2", change: 2.4 },
];

const AGENDA_ITEMS = [
  { time: "10:00 pm", event: "Consumer Price Index (CPI) (Monthly)", value: "3.15%", country: "TR" },
  { time: "10:30 am", event: "Retail Sales (Monthly)", value: "0.4%", country: "US" },
  { time: "11:00 am", event: "Industrial Production (Monthly)", value: "0.2%", country: "US" },
];

const SECTORS_DATA = [
  { name: "Livestock", change: "7.91%", pe: "164.4" },
  { name: "Energy Technologies", change: "5.23%", pe: "22.1" },
  { name: "IT and Software", change: "4.12%", pe: "28.5" },
  { name: "Asset Management", change: "3.89%", pe: "15.2" },
];

const SECTOR_FILTERS = ["Top Sectors", "Top Stocks", "Public Offering", "Boss Sales", "Foreign.."];

function getDateString() {
  const d = new Date();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = days[d.getDay()];
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return `Today is ${day} - ${date}`;
}

export default function MarketAnalysisPage() {
  const [activeTab, setActiveTab] = useState("markets");
  const [sectorFilter, setSectorFilter] = useState("Top Sectors");
  const [agendaDate, setAgendaDate] = useState(new Date());

  const formatAgendaDate = (d) =>
    d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-secondary border-b border-border px-6 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Overview</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{getDateString()}</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            <LayoutGrid className="w-4 h-4" />
            <span>Customize</span>
          </button>
        </div>
      </header>

      {/* Main Nav Tabs */}
      <nav className="bg-card/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 py-3">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Market Index Summary Cards (horizontal scroll) */}
      <section className="px-6 py-4 border-b border-border overflow-x-auto">
        <div className="flex gap-4 min-w-max max-w-7xl">
          {MARKET_CARDS.map((card) => (
            <div
              key={card.ticker}
              className="flex items-center gap-4 px-5 py-3 rounded-xl bg-card/50 border border-border min-w-[180px] shrink-0"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{card.ticker}</div>
                <div className="text-sm text-muted-foreground">{card.value}</div>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                    card.change >= 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {card.change >= 0 ? "+" : ""}
                  {card.change}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content - Three Column Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "indexes" ? (
          /* Expanded Market Indices - FinancialTable */
          <div className="py-4">
            <FinancialTable
              title="Index"
              indices={defaultIndices}
              onIndexSelect={(id) => console.log("Selected index:", id)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <aside className="lg:col-span-3">
              <div className="rounded-xl border border-border bg-card/50 p-4">
                <nav className="space-y-1">
                  {SIDEBAR_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Center - Agenda */}
            <section className="lg:col-span-5">
              <div className="rounded-xl border border-border bg-card/50 p-5 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">
                    Agenda ({formatAgendaDate(agendaDate)})
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setAgendaDate(
                          new Date(agendaDate.getTime() - 24 * 60 * 60 * 1000)
                        )
                      }
                      className="p-1.5 rounded-lg hover:bg-muted"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setAgendaDate(
                          new Date(agendaDate.getTime() + 24 * 60 * 60 * 1000)
                        )
                      }
                      className="p-1.5 rounded-lg hover:bg-muted"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {AGENDA_ITEMS.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="text-sm font-medium text-muted-foreground w-16 shrink-0">
                        {item.time}
                      </div>
                      <div className="flex-1 border-l-2 border-dashed border-border pl-4">
                        <div className="text-sm text-foreground">{item.event}</div>
                        <span className="text-xs text-green-500 font-medium">
                          Exception {item.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Right - Sectors */}
            <section className="lg:col-span-4">
              <div className="rounded-xl border border-border bg-card/50 p-5 h-full">
                <h3 className="font-semibold text-foreground mb-4">Sectors</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {SECTOR_FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setSectorFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        sectorFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="pb-2 font-medium">Sectors Name</th>
                        <th className="pb-2 font-medium">Change</th>
                        <th className="pb-2 font-medium">P/E</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {SECTORS_DATA.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="py-3 text-foreground">{row.name}</td>
                          <td className="py-3 text-green-500">{row.change}</td>
                          <td className="py-3 text-muted-foreground">{row.pe}</td>
                          <td className="py-3">
                            <button className="text-primary text-xs hover:underline">
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
