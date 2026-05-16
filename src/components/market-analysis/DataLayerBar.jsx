'use client';

import { useEffect } from 'react';
import { useGlobalPowerMap } from '@/hooks/useGlobalPowerMap';

const DATA_LAYERS = [
  { key: 'gdp', icon: 'bi-cash-stack', label: 'GDP', color: '#10b981' },
  { key: 'debt', icon: 'bi-credit-card-2-back', label: 'DEBT', color: '#ef4444' },
  { key: 'population', icon: 'bi-people-fill', label: 'POPULATION', color: '#8b5cf6' },
  { key: 'births', icon: 'bi-heart-pulse-fill', label: 'BIRTHS', color: '#ec4899' },
  { key: 'wealth', icon: 'bi-coin', label: 'WEALTH', color: '#f59e0b' },
  { key: 'billionaires', icon: 'bi-trophy-fill', label: 'BILLIONAIRES', color: '#FFD700' },
];

export function DataLayerBar({ billionaireScores, billionaireLoading }) {
  const selectedLayers = useGlobalPowerMap((s) => s.selectedLayers);
  const toggleLayer = useGlobalPowerMap((s) => s.toggleLayer);
  const recomputeScores = useGlobalPowerMap((s) => s.recomputeScores);

  useEffect(() => {
    if (
      billionaireScores &&
      typeof window !== 'undefined' &&
      selectedLayers.includes('billionaires')
    ) {
      window.__liveBillionaireScores = billionaireScores;
      recomputeScores();
    }
  }, [billionaireScores, selectedLayers, recomputeScores]);

  const handleToggle = (layerKey) => {
    if (
      layerKey === 'billionaires' &&
      billionaireScores &&
      typeof window !== 'undefined' &&
      !selectedLayers.includes(layerKey)
    ) {
      window.__liveBillionaireScores = billionaireScores;
    }
    toggleLayer(layerKey);
  };

  return (
    <div className="ma-data-layer-bar">
      <div className="ma-data-layer-label">
        <i className="bi bi-layers" />
        DATA LAYERS
      </div>
      <div className="ma-data-layer-buttons">
        {DATA_LAYERS.map((layer) => {
          const isActive = selectedLayers.includes(layer.key);
          const isLoading = layer.key === 'billionaires' && billionaireLoading;
          return (
            <button
              key={layer.key}
              type="button"
              className={`ma-data-layer-btn ${isActive ? 'ma-data-layer-btn--active' : ''}`}
              onClick={() => handleToggle(layer.key)}
              disabled={isLoading}
              style={{
                '--layer-color': layer.color,
                '--layer-glow': `${layer.color}40`,
              }}
              title={isLoading ? 'Loading billionaire data…' : `Toggle ${layer.label} heatmap`}
            >
              <i className={`bi ${layer.icon}`} />
              <span>{isLoading ? '…' : layer.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
