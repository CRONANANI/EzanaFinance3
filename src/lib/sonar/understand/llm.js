/**
 * The optional fast understanding call (spec A2.3). Runs only when
 * SONAR_UNDERSTAND_MODEL is set and only for pings the deterministic rules
 * left as open questions; capped at 1200 ms. Returns { intent, display } or
 * null. It never touches entities, so it cannot override a cued ticker or a
 * high-confidence geography reading.
 */
import { synthesizeWithFallback } from '@/lib/sonar/llm-providers';
import { EXAMPLES } from '@/lib/sonar/understand/examples';

const TIMEOUT_MS = 1200;

export async function callUnderstandModel(det) {
  const model = process.env.SONAR_UNDERSTAND_MODEL;
  if (!model) return null;
  const shots = EXAMPLES.map(
    (e) => `QUERY: ${e.raw}\nOUT: ${JSON.stringify({ intent: e.intent, display: null })}`,
  ).join('\n');
  const call = synthesizeWithFallback({
    system:
      'Classify a finance research query. Respond with ONLY JSON {"intent":"<one of industry_layout, industry_country, company, ticker_lookup, politician, fund, country, policy, ranking, comparison, theme, commodity, event, open_question>","display":"<short clean title>"}.',
    user: `${shots}\nQUERY: ${det.corrected}\nENTITIES: ${JSON.stringify(
      det.entities.map((e) => `${e.kind}:${e.label}`),
    )}\nOUT:`,
    maxTokens: 120,
    model,
    fallbackModel: model,
    webSearch: false,
  });
  const out = await Promise.race([
    call,
    new Promise((resolve) => {
      setTimeout(() => resolve(null), TIMEOUT_MS);
    }),
  ]);
  const m = /\{[\s\S]*\}/.exec(String(out?.answer || ''));
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]);
    return typeof parsed?.intent === 'string' ? parsed : null;
  } catch {
    return null;
  }
}
