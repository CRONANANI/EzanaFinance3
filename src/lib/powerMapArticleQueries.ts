import type { PowerLayer } from "@/hooks/useGlobalPowerMap";

export const LAYER_QUERIES: Record<PowerLayer, string> = {
  trade: "global trade export supply chain",
  conflict: "geopolitical conflict risk instability",
  interest_rates: "interest rates inflation monetary policy",
  economic: "economic growth GDP recession",
  military: "military defense spending geopolitics",
  energy: "energy oil gas renewables production",
  demographic: "demographics population workforce",
  governance: "political stability governance corruption",
  infrastructure: "infrastructure investment manufacturing logistics",
};

export function buildArticleQuery(countryName: string, layers: PowerLayer[]): string {
  const layerTerms = layers.map((l) => LAYER_QUERIES[l]).join(" ");
  return `${countryName} ${layerTerms}`.trim();
}
