import { create } from "zustand";

export type PowerLayer =
  | "trade"
  | "conflict"
  | "interest_rates"
  | "economic"
  | "military"
  | "energy"
  | "demographic"
  | "governance"
  | "infrastructure";

export interface CountryScore {
  iso: string;
  name: string;
  score: number;
}

interface GlobalPowerMapState {
  isOpen: boolean;
  selectedLayers: PowerLayer[];
  countryScores: CountryScore[];
  toggleOpen: () => void;
  toggleLayer: (layer: PowerLayer) => void;
  clearLayers: () => void;
}

const layerScores: Record<PowerLayer, Record<string, number>> = {
  trade: {
    US: 94,
    CN: 92,
    DE: 78,
    JP: 74,
    KR: 68,
    NL: 65,
    GB: 62,
    FR: 60,
    IN: 52,
    BR: 45,
    MX: 42,
    RU: 38,
    CA: 72,
    AU: 55,
    IT: 57,
    SG: 80,
    SA: 48,
    AE: 58,
    CH: 70,
    SE: 62,
    NO: 60,
    TR: 44,
    ID: 46,
    TH: 50,
  },
  conflict: {
    US: 72,
    CN: 68,
    DE: 85,
    JP: 88,
    KR: 62,
    IN: 55,
    RU: 30,
    BR: 42,
    NG: 22,
    SD: 15,
    SY: 5,
    IQ: 18,
    AF: 8,
    ET: 25,
    MM: 20,
    ML: 18,
    GB: 80,
    FR: 78,
    AU: 84,
    CA: 82,
    SE: 88,
    NO: 90,
    FI: 92,
    CH: 90,
  },
  interest_rates: {
    US: 60,
    CN: 70,
    DE: 55,
    JP: 30,
    KR: 65,
    BR: 40,
    TR: 20,
    AR: 10,
    GB: 58,
    AU: 62,
    CA: 60,
    MX: 45,
    IN: 50,
    RU: 35,
    ZA: 38,
    NG: 25,
    CH: 72,
    SE: 58,
    NO: 64,
    DK: 60,
    NZ: 62,
    SG: 68,
  },
  economic: {
    US: 96,
    CN: 88,
    DE: 80,
    JP: 78,
    GB: 74,
    FR: 72,
    IN: 62,
    KR: 70,
    AU: 68,
    CA: 72,
    BR: 48,
    RU: 42,
    MX: 45,
    IT: 60,
    ES: 58,
    NL: 74,
    CH: 76,
    SE: 70,
    NO: 72,
    SG: 80,
    SA: 58,
    AE: 65,
    TR: 44,
    ID: 50,
  },
  military: {
    US: 99,
    CN: 85,
    RU: 80,
    IN: 68,
    GB: 65,
    FR: 64,
    JP: 58,
    DE: 55,
    KR: 62,
    IL: 70,
    SA: 52,
    TR: 55,
    PK: 45,
    BR: 42,
    AU: 50,
    CA: 48,
    IT: 50,
    ES: 48,
    NO: 46,
    SE: 52,
    PL: 55,
    UA: 58,
  },
  energy: {
    SA: 95,
    US: 88,
    RU: 90,
    CN: 72,
    NO: 80,
    CA: 78,
    AE: 85,
    QA: 90,
    AU: 70,
    BR: 60,
    NG: 55,
    IQ: 58,
    KZ: 60,
    MX: 50,
    GB: 48,
    DE: 40,
    IR: 65,
    KW: 80,
    LY: 58,
    VE: 45,
    IN: 42,
    ID: 50,
  },
  demographic: {
    IN: 88,
    CN: 75,
    US: 72,
    NG: 80,
    ID: 78,
    BR: 65,
    PK: 70,
    ET: 72,
    BD: 60,
    MX: 62,
    PH: 68,
    VN: 64,
    EG: 62,
    DE: 42,
    JP: 35,
    IT: 38,
    GB: 55,
    FR: 58,
    AU: 60,
    CA: 58,
    TR: 62,
    SA: 58,
  },
  governance: {
    FI: 98,
    DK: 97,
    NZ: 96,
    SE: 95,
    NO: 94,
    SG: 92,
    CH: 90,
    NL: 89,
    DE: 85,
    AU: 83,
    CA: 82,
    GB: 80,
    JP: 78,
    US: 72,
    FR: 70,
    KR: 68,
    IT: 58,
    ES: 60,
    PL: 62,
    CZ: 65,
    IL: 64,
    TW: 70,
  },
  infrastructure: {
    JP: 95,
    DE: 92,
    SG: 94,
    KR: 90,
    US: 88,
    CN: 84,
    FR: 82,
    GB: 80,
    AU: 78,
    CA: 76,
    NL: 80,
    CH: 88,
    AE: 82,
    SE: 84,
    FI: 82,
    AT: 80,
    DK: 82,
    NO: 78,
    IT: 70,
    ES: 68,
    PL: 60,
    IN: 50,
    BR: 48,
    TR: 52,
  },
};

const countryNames: Record<string, string> = {
  US: "United States",
  CN: "China",
  DE: "Germany",
  JP: "Japan",
  GB: "United Kingdom",
  FR: "France",
  IN: "India",
  KR: "South Korea",
  AU: "Australia",
  CA: "Canada",
  BR: "Brazil",
  RU: "Russia",
  MX: "Mexico",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  SA: "Saudi Arabia",
  AE: "UAE",
  NO: "Norway",
  SE: "Sweden",
  FI: "Finland",
  DK: "Denmark",
  CH: "Switzerland",
  SG: "Singapore",
  NG: "Nigeria",
  ZA: "South Africa",
  TR: "Turkey",
  PK: "Pakistan",
  ID: "Indonesia",
  AR: "Argentina",
  IL: "Israel",
  EG: "Egypt",
  SD: "Sudan",
  SY: "Syria",
  IQ: "Iraq",
  AF: "Afghanistan",
  ET: "Ethiopia",
  MM: "Myanmar",
  ML: "Mali",
  BD: "Bangladesh",
  PH: "Philippines",
  VN: "Vietnam",
  KZ: "Kazakhstan",
  QA: "Qatar",
  AT: "Austria",
  NZ: "New Zealand",
  PL: "Poland",
  UA: "Ukraine",
  CZ: "Czech Republic",
  IR: "Iran",
  KW: "Kuwait",
  LY: "Libya",
  VE: "Venezuela",
  TW: "Taiwan",
  TH: "Thailand",
  MY: "Malaysia",
  HK: "Hong Kong",
  MA: "Morocco",
  KE: "Kenya",
  CO: "Colombia",
  CL: "Chile",
  PE: "Peru",
};

function computeCompositeScores(layers: PowerLayer[]): CountryScore[] {
  if (layers.length === 0) return [];

  const allCountries = new Set<string>();
  layers.forEach((layer) => {
    Object.keys(layerScores[layer]).forEach((iso) => allCountries.add(iso));
  });

  const scores: CountryScore[] = [];

  allCountries.forEach((iso) => {
    let total = 0;
    let count = 0;
    layers.forEach((layer) => {
      const v = layerScores[layer][iso];
      if (v !== undefined) {
        total += v;
        count += 1;
      }
    });
    if (count > 0) {
      scores.push({
        iso,
        name: countryNames[iso] || iso,
        score: Math.round(total / count),
      });
    }
  });

  return scores.sort((a, b) => b.score - a.score);
}

export const useGlobalPowerMap = create<GlobalPowerMapState>((set, get) => ({
  isOpen: false,
  selectedLayers: [],
  countryScores: [],
  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  toggleLayer: (layer) => {
    const current = get().selectedLayers;
    const next = current.includes(layer)
      ? current.filter((l) => l !== layer)
      : [...current, layer];
    set({ selectedLayers: next, countryScores: computeCompositeScores(next) });
  },
  clearLayers: () => set({ selectedLayers: [], countryScores: [] }),
}));
