/**
 * Extract structured disclosures from a filing passage (Nov 2026).
 *
 * A small model reads one passage and returns the sentences that state the
 * disclosure, each quoted word for word, with the figures in it. The model
 * never paraphrases into the record: anything that fails validateExtraction
 * (quote not in the filing, a figure not in the quote) is dropped, so what is
 * stored is the company's own words.
 */
import { validateExtraction } from './sections';

export const EXTRACT_SYSTEM = `You read one passage from a company's SEC 10-Q or 10-K and extract what it discloses about one topic. Return ONLY JSON:
{ "items": [ { "quote": string, "party": string|null, "period": string|null, "figures": [ { "label": string, "text": string } ] } ] }
Rules:
- "quote" is one to three consecutive sentences copied EXACTLY from the passage, character for character. Never paraphrase, shorten inside a sentence, or join sentences that are not consecutive.
- "figures": every number the quote states that matters for the topic, each with "text" copied exactly as written in the quote (for example "16%" or "$18.8 billion") and a short "label" ("Direct customer A, share of revenue").
- "party": the customer, supplier or country named, or null ("Customer A", "China").
- "period": the period the quote refers to as written ("second quarter of fiscal year 2027"), or null.
- Return at most four items. If the passage says nothing on the topic, return { "items": [] }.
- Never infer a number, name or period that is not written in the passage.`;

const TOPIC = {
  customer_concentration:
    'customer concentration: customers or end customers that account for a share of revenue or receivables',
  export_risk:
    'export controls: licensing requirements, restrictions on sales to China or other countries, related charges',
  purchase_obligations:
    'purchase, inventory and supply or capacity obligations and commitments, with their amounts',
};

/** Parse the model's JSON, tolerating fences and leading prose. */
export function parseItems(text) {
  const s = String(text || '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return [];
  try {
    const j = JSON.parse(s.slice(a, b + 1));
    return Array.isArray(j?.items) ? j.items : [];
  } catch {
    return [];
  }
}

/**
 * @param {{ kind: string, text: string }} section
 * @param {{ synthesize: Function, model?: string }} deps  synthesize({ system, user, maxTokens, model }) -> { answer }
 * @returns {Promise<{ kept: Array, dropped: Array<{ reason: string }> }>}
 */
export async function extractSection(section, { synthesize, model, deadlineAt = null }) {
  const out = await synthesize({
    system: EXTRACT_SYSTEM,
    user: `Topic: ${TOPIC[section.kind] || section.kind}\n\nPassage:\n${section.text}`,
    maxTokens: 900,
    model,
    fallbackModel: model,
    webSearch: { enabled: false },
    deadlineAt,
  }).catch(() => null);
  const items = parseItems(out?.answer).slice(0, 4);
  const kept = [];
  const dropped = [];
  for (const it of items) {
    const v = validateExtraction(section.text, it);
    if (!v.ok) {
      dropped.push({ reason: v.reason });
      continue;
    }
    kept.push({
      kind: section.kind,
      quote: String(it.quote).trim(),
      party: it.party ? String(it.party).slice(0, 120) : null,
      period: it.period ? String(it.period).slice(0, 120) : null,
      figures: (it.figures || []).map((f) => ({
        label: String(f.label || '').slice(0, 120),
        text: String(f.text).trim(),
      })),
    });
  }
  return { kept, dropped };
}
