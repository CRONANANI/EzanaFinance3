"use client";

import { useRouter } from "next/navigation";
import { useGlobalPowerMap, type PowerLayer } from "@/hooks/useGlobalPowerMap";
import { Globe, ChevronDown, ChevronUp, X } from "lucide-react";

const layerConfig: {
  key: PowerLayer;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    key: "trade",
    label: "Global Trade Power",
    description: "Export share, surplus, manufacturing dominance",
    icon: "\u{1F6A2}",
  },
  {
    key: "conflict",
    label: "Conflict Risk Index",
    description: "Economic stress to internal conflict probability",
    icon: "\u{26A0}\u{FE0F}",
  },
  {
    key: "interest_rates",
    label: "Real Interest Rate Regime",
    description: "Real Rate = Interest Rate minus Inflation",
    icon: "\u{1F4CA}",
  },
  {
    key: "economic",
    label: "Economic Power",
    description: "GDP, growth, manufacturing, global share",
    icon: "\u{1F4B9}",
  },
  {
    key: "military",
    label: "Military Power",
    description: "Defence spending, personnel, hardware",
    icon: "\u{1F6E1}\u{FE0F}",
  },
  {
    key: "energy",
    label: "Energy Power",
    description: "Oil, gas, renewables, energy exports",
    icon: "\u{26A1}",
  },
  {
    key: "demographic",
    label: "Demographic Power",
    description: "Population, workforce growth, education",
    icon: "\u{1F465}",
  },
  {
    key: "governance",
    label: "Political Stability and Governance",
    description: "Rule of law, corruption index, stability",
    icon: "\u{2696}\u{FE0F}",
  },
  {
    key: "infrastructure",
    label: "Infrastructure and Industrial Capacity",
    description: "Logistics, manufacturing, energy grid",
    icon: "\u{1F3D7}\u{FE0F}",
  },
];

export default function GlobalPowerMapControl() {
  const { isOpen, selectedLayers, toggleOpen, toggleLayer, clearLayers } =
    useGlobalPowerMap();
  const router = useRouter();

  const hasSelection = selectedLayers.length > 0;

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
          hasSelection
            ? "bg-purple-500/10 border-purple-500/50 text-purple-400"
            : "bg-gray-900/80 border-gray-700 text-gray-300 hover:border-gray-500"
        }`}
      >
        <div className="flex items-center gap-2">
          <Globe size={15} />
          <span>Global Power Map</span>
          {hasSelection && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full">
              {selectedLayers.length}
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-[#0d1117] border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Select layers
            </span>
            {hasSelection && (
              <button
                type="button"
                onClick={clearLayers}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <X size={11} /> Clear all
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {layerConfig.map((layer) => {
              const selected = selectedLayers.includes(layer.key);
              return (
                <button
                  key={layer.key}
                  type="button"
                  onClick={() => toggleLayer(layer.key)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-all hover:bg-gray-800/60 border-b border-gray-900 last:border-0 ${
                    selected ? "bg-purple-500/8" : ""
                  }`}
                >
                  <div
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      selected
                        ? "bg-purple-500 border-purple-500"
                        : "bg-transparent border-gray-600"
                    }`}
                  >
                    {selected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 3.5L4 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  <span className="text-base shrink-0">{layer.icon}</span>

                  <div>
                    <p
                      className={`text-sm font-medium leading-tight ${
                        selected ? "text-purple-300" : "text-gray-300"
                      }`}
                    >
                      {layer.label}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {layer.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {hasSelection && (
            <div className="px-3 py-2 border-t border-gray-800 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-600">Map colouring:</span>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500">Strong</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs text-gray-500">Mid</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-gray-500">Weak</span>
              </div>
            </div>
          )}
        </div>
      )}

      {hasSelection && (
        <button
          type="button"
          onClick={() =>
            router.push(`/empire-ranking?layers=${selectedLayers.join(",")}`)
          }
          className="w-full mt-2 text-xs text-center text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-purple-500/10 transition-all border border-transparent hover:border-purple-500/20"
        >
          Show me the data →
        </button>
      )}
    </div>
  );
}
