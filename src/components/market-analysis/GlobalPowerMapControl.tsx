"use client";

import { useGlobalPowerMap, type PowerLayer } from "@/hooks/useGlobalPowerMap";

const POWER_LAYERS: {
  key: PowerLayer;
  icon: string;
  label: string;
  description: string;
}[] = [
  { key: "trade", icon: "🚢", label: "Global Trade Power", description: "Export share, surplus, manufacturing dominance" },
  { key: "conflict", icon: "⚠️", label: "Conflict Risk Index", description: "Economic stress → internal conflict probability" },
  { key: "interest_rates", icon: "📊", label: "Real Interest Rate Regime", description: "Real Rate = Interest Rate – Inflation" },
  { key: "economic", icon: "💹", label: "Economic Power", description: "GDP, growth, manufacturing, global share" },
  { key: "military", icon: "🛡️", label: "Military Power", description: "Defence spending, personnel, nuclear, hardware" },
  { key: "energy", icon: "⚡", label: "Energy Power", description: "Oil, gas, renewables, exports" },
  { key: "demographic", icon: "👥", label: "Demographic Power", description: "Population, workforce growth, education" },
  { key: "governance", icon: "⚖️", label: "Political Stability & Governance", description: "Rule of law, corruption index, stability" },
  { key: "infrastructure", icon: "🏗️", label: "Infrastructure & Industry", description: "Logistics, manufacturing capacity, energy grid" },
];

export default function GlobalPowerMapControl() {
  const { isOpen, selectedLayers, toggleOpen, toggleLayer, clearLayers } =
    useGlobalPowerMap();

  const hasSelection = selectedLayers.length > 0;

  return (
    <div className="ma-power-map-root">
      <button
        type="button"
        className={`ma-view-btn ma-view-btn--gold ma-power-map-trigger ${isOpen || hasSelection ? "ma-power-map-trigger--on" : ""}`}
        onClick={toggleOpen}
        aria-expanded={isOpen}
      >
        <i className="bi bi-globe-americas" style={{ marginRight: 4 }} />
        GLOBAL POWER MAP
        {hasSelection && (
          <span className="ma-power-map-trigger-badge" aria-hidden>
            {selectedLayers.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="ma-power-map-popover" role="dialog" aria-label="Power layers">
          <div className="ma-panel-header ma-power-map-popover-header">
            <span>
              <span className="ma-panel-dot" />
              POWER LAYERS
            </span>
            <div className="ma-panel-actions">
              {hasSelection && (
                <button type="button" onClick={clearLayers} title="Clear all">
                  CLEAR
                </button>
              )}
              <button type="button" onClick={toggleOpen} title="Close">
                ✕
              </button>
            </div>
          </div>

          <div className="ma-panel-list ma-power-map-list">
            {POWER_LAYERS.map((layer) => {
              const selected = selectedLayers.includes(layer.key);
              return (
                <button
                  key={layer.key}
                  type="button"
                  className={`ma-panel-item ma-power-map-row ${selected ? "ma-power-map-row--selected" : ""}`}
                  onClick={() => toggleLayer(layer.key)}
                >
                  <div className="ma-panel-item-row">
                    <span
                      className="ma-power-map-check"
                      aria-hidden
                      data-checked={selected ? "true" : "false"}
                    >
                      {selected ? "✓" : ""}
                    </span>
                    <span className="ma-power-map-emoji">{layer.icon}</span>
                    <div className="ma-panel-item-info">
                      <div className="ma-panel-item-name">{layer.label}</div>
                      <div className="ma-panel-item-region">{layer.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {hasSelection && (
            <div className="ma-power-map-legend">
              <span className="ma-power-map-legend-dot ma-power-map-legend-dot--green" />
              <span>Green = Strong</span>
              <span className="ma-power-map-legend-dot ma-power-map-legend-dot--yellow" />
              <span>Yellow = Mid</span>
              <span className="ma-power-map-legend-dot ma-power-map-legend-dot--red" />
              <span>Red = Weak</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
