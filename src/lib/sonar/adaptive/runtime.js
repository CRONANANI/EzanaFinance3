/**
 * Sonar adaptive research: the runtime wiring shared by the landing route and the production
 * validation route (Nov 2026), so validation exercises exactly what users get.
 */
import { getDailyOhlcv } from '@/lib/prices/daily-bars';
import { newsEvidence } from '@/lib/sonar/landing-research';
import { synthesizeWithFallback } from '@/lib/sonar/llm-providers';
import { retrieve as retrieveMarkets } from '@/lib/research-copilot/retrievers/markets';
import { adaptiveDataDeps } from './data-deps';

/** Per-scenario time budget for one adaptive run, in milliseconds. */
export const ADAPTIVE_BUDGET_MS = {
  B01: 14_000,
  A02: 45_000,
  A03: 45_000,
  A05: 30_000,
  B02: 40_000,
  B03: 22_000,
  B05: 40_000,
  B06: 14_000,
  B07: 14_000,
  C02: 14_000,
  A04: 14_000,
  B04: 14_000,
  B08: 14_000,
  B10: 14_000,
  C01: 14_000,
  C04: 14_000,
  C05: 14_000,
  C09: 12_000,
  C03: 40_000,
  C08: 12_000,
  A07: 45_000,
  A08: 45_000,
  A10: 45_000,
  C10: 45_000,
  A01: 45_000,
  A06: 45_000,
  A09: 14_000,
  B09: 16_000,
  C06: 14_000,
  C07: 14_000,
};

/** The readers, retrievers and model an adaptive run uses. */
export function adaptiveRunDeps(admin) {
  return {
    admin,
    getOhlcv: getDailyOhlcv,
    news: async (args) =>
      (await newsEvidence(admin, args)).map((a) => ({ ...a, publisher: a.source })),
    retrieveMarkets,
    synthesize: synthesizeWithFallback,
    ...adaptiveDataDeps(admin),
  };
}
