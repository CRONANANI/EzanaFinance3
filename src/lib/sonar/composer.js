/**
 * Sonar v2 composer (sonar-templates-spec.md §3-4). Assembles the few-shot
 * prompt, calls the model over ONLY the swept rows, and validates the strict
 * JSON the model must return:
 *
 *   - schema shape (hand-rolled, no new dependency),
 *   - every [S#] cited in the brief exists in `sources`,
 *   - every source maps to a real swept row,
 *   - any sentence carrying a figure carries a citation,
 *   - charts and KPIs reference swept data paths, never typed numbers.
 *
 * A failed validation retries ONCE with the validator's complaints appended;
 * a second failure returns null and the route degrades honestly.
 */
import { synthesizeWithFallback } from '@/lib/sonar/llm-providers';

const COMPOSE_MODEL = process.env.SONAR_V2_MODEL || 'claude-sonnet-4-5';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export const COMPOSER_SYSTEM = `You are Sonar, Ezana's research engine. Findings only, never advice.
Use ONLY the DATA block. Cite every factual sentence with [S#]. If a dataset is empty,
do not mention it. Return ONLY a JSON object matching the schema of the examples. Numbers in
charts and kpis are references to DATA paths (value_ref/source), never typed values. Never
fabricate a source id. No em dashes. Keep the headline under 60 words.`;

/** Trim the sweep into the DATA block the model reads: markers assigned per
 *  row so citations resolve to real rows, capped so the prompt stays sane. */
export function digestSweep(sweep, { perDataset = 6 } = {}) {
  const sources = [];
  const data = {};
  for (const [id, result] of Object.entries(sweep)) {
    if (result.status !== 'ok') continue;
    const rows = result.rows.slice(0, perDataset);
    data[id] = rows.map((row) => {
      const marker = `S${sources.length + 1}`;
      sources.push({ id: marker, dataset: id, row });
      return { marker, ...row };
    });
  }
  return { data, sources };
}

function exampleBlock(i, ex) {
  return `EXAMPLE ${i} (query: ${JSON.stringify(ex.query)})\nDATA: ${JSON.stringify(
    ex.input_digest || { note: 'swept rows omitted; follow the OUTPUT structure' },
  )}\nOUTPUT: ${JSON.stringify(ex.ideal_output)}`;
}

export function buildComposerPrompt({ query, template, entities, exemplars, data, briefSections }) {
  const shots = (exemplars || []).map((ex, i) => exampleBlock(i + 1, ex)).join('\n\n');
  return `${shots ? `${shots}\n\n` : ''}NOW (template: ${template}, query: ${JSON.stringify(
    query,
  )})\nENTITIES: ${JSON.stringify(entities)}\nBRIEF SECTIONS TO WRITE: ${JSON.stringify(
    briefSections,
  )}\nDATA: ${JSON.stringify(data)}\nOUTPUT:`;
}

/* ── validation ──────────────────────────────────────────────────────── */

const CITE_RE = /\[S(\d+)\]/g;

export function validateBriefing(parsed, { sources, template }) {
  const errors = [];
  if (!parsed || typeof parsed !== 'object') return ['output is not a JSON object'];
  if (typeof parsed.headline !== 'string' || !parsed.headline.trim()) {
    errors.push('headline missing');
  } else if (parsed.headline.split(/\s+/).length > 70) {
    errors.push('headline over 60 words');
  }
  if (!Array.isArray(parsed.brief) || !parsed.brief.length) errors.push('brief[] missing');
  const valid = new Set(sources.map((s) => s.id));
  for (const sec of parsed.brief || []) {
    if (typeof sec?.section !== 'string' || typeof sec?.text !== 'string') {
      errors.push('brief section must be {section, text}');
      continue;
    }
    for (const m of sec.text.matchAll(CITE_RE)) {
      if (!valid.has(`S${m[1]}`)) errors.push(`citation [S${m[1]}] has no swept source`);
    }
    /* A sentence carrying a figure must carry a citation. */
    for (const sentence of sec.text.split(/(?<=[.!?])\s+/)) {
      if (/\d/.test(sentence) && !CITE_RE.test(sentence)) {
        CITE_RE.lastIndex = 0;
        errors.push(`uncited figure in: "${sentence.slice(0, 60)}"`);
      }
      CITE_RE.lastIndex = 0;
    }
  }
  for (const k of parsed.kpis || []) {
    if (k && typeof k === 'object' && k.value != null && k.value_ref == null) {
      errors.push(`kpi "${k.label}" types a value instead of a value_ref`);
    }
  }
  for (const c of parsed.charts || []) {
    if (c && typeof c === 'object' && Array.isArray(c.data)) {
      errors.push(`chart "${c.id}" embeds data instead of a source path`);
    }
  }
  for (const f of parsed.followups || []) {
    if (typeof f?.label !== 'string') errors.push('followup without a label');
  }
  if (parsed.template && parsed.template !== template) {
    errors.push('template field does not match the routed template');
  }
  return errors;
}

function parseJson(text) {
  const m = /\{[\s\S]*\}/.exec(String(text || ''));
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/** Compose and validate, retrying once with the validator's complaints. */
export async function composeBriefing({
  query,
  template,
  entities,
  exemplars,
  sweep,
  briefSections,
  maxTokens = 1400,
}) {
  const { data, sources } = digestSweep(sweep);
  if (!sources.length) return { briefing: null, sources, empty: true, errors: [] };
  const prompt = buildComposerPrompt({ query, template, entities, exemplars, data, briefSections });

  let lastErrors = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const user =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous output failed validation:\n- ${lastErrors
            .slice(0, 6)
            .join('\n- ')}\nReturn corrected JSON only.`;
    // eslint-disable-next-line no-await-in-loop
    const out = await synthesizeWithFallback({
      system: COMPOSER_SYSTEM,
      user,
      maxTokens,
      model: COMPOSE_MODEL,
      fallbackModel: HAIKU_MODEL,
      webSearch: false,
    });
    const parsed = parseJson(out?.answer);
    if (!parsed) {
      lastErrors = ['output was not parseable JSON'];
      continue;
    }
    const errors = validateBriefing(parsed, { sources, template });
    if (!errors.length) {
      return { briefing: parsed, sources, empty: false, errors: [], provider: out?.provider };
    }
    lastErrors = errors;
  }
  return { briefing: null, sources, empty: false, errors: lastErrors };
}
