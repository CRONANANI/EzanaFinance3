import type { PowerLayer } from "@/hooks/useGlobalPowerMap";

/**
 * Each power layer maps to a set of keywords used for soft scoring.
 * The first keyword in each list is the most-canonical term for that layer.
 * Articles matching any keyword in any selected layer get a relevance boost.
 */
export const LAYER_QUERIES: Record<PowerLayer, string[]> = {
  trade: ["trade", "tariff", "export", "import", "supply chain", "wto"],
  conflict: ["conflict", "war", "geopolitical", "instability", "tension", "sanctions"],
  interest_rates: ["interest rate", "inflation", "monetary policy", "central bank", "federal reserve", "ecb"],
  economic: ["gdp", "economy", "recession", "growth", "stimulus", "fiscal"],
  military: ["military", "defense", "army", "armed forces", "missile", "weapons"],
  energy: ["energy", "oil", "gas", "petroleum", "renewables", "opec", "lng"],
  demographic: ["demographics", "population", "workforce", "labor", "immigration"],
  governance: ["governance", "election", "corruption", "regime", "political stability", "democracy"],
  infrastructure: ["infrastructure", "manufacturing", "logistics", "construction", "transportation"],
};

/**
 * Country-name aliases: many news sources use shorter or alternate forms.
 * Articles matching any alias count as "about" that country.
 */
export const COUNTRY_ALIASES: Record<string, string[]> = {
  "United States": ["united states", "u.s.", "us", "usa", "america", "american", "washington"],
  "United Kingdom": ["united kingdom", "u.k.", "uk", "britain", "british", "england", "london"],
  "Russia": ["russia", "russian", "moscow", "kremlin", "putin"],
  "China": ["china", "chinese", "beijing", "xi jinping"],
  "Japan": ["japan", "japanese", "tokyo"],
  "Germany": ["germany", "german", "berlin"],
  "France": ["france", "french", "paris", "macron"],
  "South Korea": ["south korea", "korean", "seoul"],
  "North Korea": ["north korea", "pyongyang", "kim jong"],
  "India": ["india", "indian", "new delhi", "modi"],
  "Brazil": ["brazil", "brazilian", "brasilia"],
  "Mexico": ["mexico", "mexican"],
  "Canada": ["canada", "canadian", "ottawa"],
  "Australia": ["australia", "australian", "canberra"],
  "Saudi Arabia": ["saudi arabia", "saudi", "riyadh"],
  "Iran": ["iran", "iranian", "tehran"],
  "Israel": ["israel", "israeli", "jerusalem", "tel aviv"],
  "Turkey": ["turkey", "turkish", "ankara", "istanbul", "erdogan"],
  "Ukraine": ["ukraine", "ukrainian", "kyiv", "kiev", "zelensky"],
  "Italy": ["italy", "italian", "rome"],
  "Spain": ["spain", "spanish", "madrid"],
  "Netherlands": ["netherlands", "dutch", "amsterdam"],
  "Singapore": ["singapore"],
  "Indonesia": ["indonesia", "indonesian", "jakarta"],
  "Thailand": ["thailand", "thai", "bangkok"],
  "United Arab Emirates": ["united arab emirates", "uae", "dubai", "abu dhabi"],
  "Switzerland": ["switzerland", "swiss", "bern"],
  "Sweden": ["sweden", "swedish", "stockholm"],
  "Norway": ["norway", "norwegian", "oslo"],
  "Egypt": ["egypt", "egyptian", "cairo"],
  "Nigeria": ["nigeria", "nigerian", "abuja"],
  "South Africa": ["south africa", "south african", "johannesburg", "pretoria"],
  "Pakistan": ["pakistan", "pakistani", "islamabad"],
  "Vietnam": ["vietnam", "vietnamese", "hanoi"],
  "Argentina": ["argentina", "argentine", "buenos aires"],
  "Poland": ["poland", "polish", "warsaw"],
  "Greece": ["greece", "greek", "athens"],
  "Portugal": ["portugal", "portuguese", "lisbon"],
};

/**
 * Returns the lowercase keyword list to match against article text for a country.
 * Falls back to the country name itself (lowercased) if no aliases are defined.
 */
export function countryKeywords(countryName: string): string[] {
  const aliases = COUNTRY_ALIASES[countryName];
  if (aliases && aliases.length > 0) return aliases;
  return [countryName.toLowerCase()];
}

/**
 * Returns flat keyword list across all selected layers.
 * Empty array if no layers selected.
 */
export function layerKeywords(layers: readonly PowerLayer[] | readonly string[]): string[] {
  return layers.flatMap((l) => LAYER_QUERIES[l as PowerLayer] ?? []);
}

/**
 * Legacy single-string query for backward compat with anything still using it.
 * New code should use countryKeywords() + layerKeywords() separately so the
 * server can apply different match rules (country = required, layers = scoring).
 */
export function buildArticleQuery(countryName: string, layers: PowerLayer[]): string {
  const layerTerms = layers.flatMap((l) => LAYER_QUERIES[l] ?? []).join(" ");
  return `${countryName} ${layerTerms}`.trim();
}
