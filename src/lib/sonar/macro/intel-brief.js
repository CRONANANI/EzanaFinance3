/**
 * Country & Currency Intelligence brief: prompt, parser, validator and renderings
 * (Nov 2026). Pure.
 *
 * The model writes the judgement and narrative as JSON; code computed every number
 * (currency.js) and the validator keeps only claims whose numbers appear in the evidence or
 * the computed statements. Findings only: no advice, no probabilities, no forecasts.
 */
import { MACRO_LENS, frameworkPrompt, PRESSURE_LABEL } from './playbook.js';
import { numbersIn } from './brief.js';

/** The JSON the model returns. */
export const INTEL_FIELDS = [
  'answer',
  'assessmentLine',
  'drivers',
  'scenarios',
  'monitor',
  'bottomLine',
];

/**
 * System prompt for a country, currency or named-country macro question.
 * `frameworks` are playbook framework ids (max 3).
 */
export function intelSystemPrompt(frameworks = ['currency']) {
  return `You are Ezana Sonar, a research analyst. Answer the visitor's question about a country's economy or currency from the numbered sources and the computed measures below. Every number you write must appear in a source or a computed measure, with its period.

${frameworkPrompt(frameworks)}

Rules:
- Answer first. The first sentence answers the question directly: "Yes. ...", "Partly. ..." or "No. ...".
- Quantify every claim with the figures given, each with its period. When a currency move is quoted, give both conventions: how much more the dollar costs in local currency and how much of its dollar value the currency lost.
- Call the policy rate minus annual inflation the ex-post real rate, every time.
- Do not call a currency crisis without evidence of disorderly moves, capital flight, reserves running low against obligations, or lost market access. Sustained depreciation is not a crisis.
- Name the levers the central bank is using, as the evidence shows them (rates, reserves, capital measures, letting the currency fall).
- Scenarios are conditional ("If X, then Y"). No probabilities and no forecasts of dates or levels.
- When sources give the same measure for different periods, lead with the most recent observed figure; mention older figures only with their year. Never present a projection as current. Never say the data does not cover a topic when a source for it is given.
- Findings only: no advice, no price targets, no recommendation.
- Never name or cite where this way of reasoning comes from. Reason this way; cite only the numbered sources.
- No em dashes.

Return ONLY JSON, no prose around it:
{"answer":"1-2 sentences, the direct answer","assessmentLine":"one line separating sustained pressure from an acute crisis","drivers":[{"title":"short","text":"the mechanism with its numbers","refs":["S1"]}],"scenarios":[{"name":"short","conditions":"If ...","implication":"then ..."}],"monitor":[{"indicator":"what to watch","why":"why it matters"}],"bottomLine":"2-3 sentences: what the evidence means, what it does not establish, what matters most over the next 6 to 12 months"}
3 or 4 drivers, exactly 3 scenarios, 4 or 5 indicators to monitor.`;
}

/** First JSON object in a model reply, parsed, or null. */
export function parseIntelBrief(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(s.slice(start, end + 1));
    return j && typeof j === 'object' ? j : null;
  } catch {
    return null;
  }
}

const str = (v, max = 600) =>
  typeof v === 'string'
    ? v
        .replace(/\s*[—]\s*/g, ', ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
    : '';

/* Numbers in `text` that the allowed texts do not support (1% or 0.05 tolerance). Small
   counts (1 to 12: "3 months", "6 to 12 months", "two") and years are allowed. */
export function unsupported(text, allowedTexts) {
  const allowed = numbersIn(allowedTexts.join(' '));
  return numbersIn(String(text || '').replace(/\[S\d+\]/g, ' ')).filter(
    (v) =>
      !(Number.isInteger(v) && v >= 0 && v <= 12) &&
      !(Number.isInteger(v) && v >= 1980 && v <= 2040) &&
      !allowed.some((a) => Math.abs(v - a) <= Math.max(0.05, Math.abs(a) * 0.01)),
  );
}

const CRISIS_CLAIM =
  /\b(currency crisis (is|has) (under ?way|begun|started)|in (a|an acute) (currency )?crisis|crisis is (under ?way|unfolding))\b/i;

/**
 * Keep only what the evidence supports. Returns { brief, dropped, ok }.
 *   ok false: the answer itself is unsupported, missing, or calls a crisis the data does not
 *   show (the caller falls back to the deterministic brief).
 */
export function validateIntelBrief(raw, { allowedTexts = [], picture = null } = {}) {
  if (!raw || typeof raw !== 'object') return { brief: null, dropped: ['unparseable'], ok: false };
  const dropped = [];
  const keep = (label, text) => {
    const bad = unsupported(text, allowedTexts);
    if (bad.length) dropped.push(`${label}: ${bad.slice(0, 3).join(', ')}`);
    return !bad.length;
  };
  const answer = str(raw.answer, 400);
  const crisisShown =
    picture?.assessment?.components?.some((c) => c.id === 'depreciation' && c.level === 'severe') &&
    picture?.assessment?.components?.some((c) => c.id === 'external' && c.level === 'severe');
  const allText = [raw.answer, raw.assessmentLine, raw.bottomLine]
    .map((x) => str(x, 900))
    .join(' ');
  if (!answer || !keep('answer', answer)) return { brief: null, dropped, ok: false };
  if (CRISIS_CLAIM.test(allText) && !crisisShown) {
    dropped.push('crisis claim without qualifying evidence');
    return { brief: null, dropped, ok: false };
  }
  const assessmentLine = str(raw.assessmentLine, 300);
  const drivers = (Array.isArray(raw.drivers) ? raw.drivers : [])
    .map((d) => ({
      title: str(d?.title, 90),
      text: str(d?.text, 500),
      refs: (Array.isArray(d?.refs) ? d.refs : [])
        .map((r) => str(r, 6))
        .filter((r) => /^S\d+$/.test(r)),
    }))
    .filter((d) => d.title && d.text && keep(`driver ${d.title}`, `${d.title} ${d.text}`))
    .slice(0, 4);
  const scenarios = (Array.isArray(raw.scenarios) ? raw.scenarios : [])
    .map((x) => ({
      name: str(x?.name, 80),
      conditions: str(x?.conditions, 300),
      implication: str(x?.implication, 300),
    }))
    .filter(
      (x) =>
        x.name &&
        x.conditions &&
        x.implication &&
        !/\d+\s*%\s*(chance|probability|likel)/i.test(`${x.conditions} ${x.implication}`),
    )
    .filter((x) => keep(`scenario ${x.name}`, `${x.conditions} ${x.implication}`))
    .slice(0, 3);
  const monitor = (Array.isArray(raw.monitor) ? raw.monitor : [])
    .map((m) => ({ indicator: str(m?.indicator, 120), why: str(m?.why, 240) }))
    .filter((m) => m.indicator && keep(`monitor ${m.indicator}`, `${m.indicator} ${m.why}`))
    .slice(0, 5);
  const bottomLine = keep('bottomLine', raw.bottomLine) ? str(raw.bottomLine, 700) : '';
  const brief = {
    answer,
    assessmentLine: keep('assessmentLine', assessmentLine) ? assessmentLine : '',
    drivers,
    scenarios,
    monitor,
    bottomLine,
    crisisEstablished: Boolean(crisisShown && CRISIS_CLAIM.test(allText)),
  };
  return { brief, dropped, ok: drivers.length >= 2 };
}

/** The brief as plain paragraphs (the answer text every client renders). */
export function intelBriefText(brief, { label = null } = {}) {
  if (!brief) return null;
  const paras = [brief.answer];
  if (brief.assessmentLine)
    paras.push(`${label ? `${label} by Ezana's thresholds. ` : ''}${brief.assessmentLine}`);
  if (brief.drivers?.length)
    paras.push(
      `What is driving the pressure: ${brief.drivers
        .map(
          (d, i) =>
            `(${i + 1}) ${d.title}: ${d.text}${d.refs?.length ? ` [${d.refs.join('][')}]` : ''}`,
        )
        .join(' ')}`,
    );
  if (brief.scenarios?.length)
    paras.push(
      `What could happen next (conditional, not forecasts): ${brief.scenarios
        .map((x) => `${x.name}: ${x.conditions} ${x.implication}`)
        .join(' ')}`,
    );
  if (brief.monitor?.length)
    paras.push(
      `What to monitor: ${brief.monitor.map((m, i) => `(${i + 1}) ${m.indicator}, ${m.why}`).join(' ')}`,
    );
  if (brief.bottomLine) paras.push(brief.bottomLine);
  return paras.filter(Boolean).join('\n\n');
}

/**
 * The deterministic brief when the model times out or fails validation: the computed
 * direction line, then the computed measures, with no inline source text.
 */
export function fallbackIntelBrief(intel, { direction } = {}) {
  if (!intel?.picture) return null;
  const lines = intel.picture.statements
    .map((s) => s.replace(/\s*Source:.*$/i, '').trim())
    .filter(Boolean);
  const head = direction || lines.shift();
  if (!head) return null;
  const notHeld = intel.picture.missing?.length
    ? `Not available in Ezana's data: ${intel.picture.missing.join(', ')}.`
    : '';
  return [head, lines.slice(0, 3).join(' '), notHeld].filter(Boolean).join('\n\n');
}

/** The assessment table rows for the layout, plus the crisis row. */
export function assessmentRows(picture, brief) {
  const rows = (picture?.assessment?.components || []).map((c) => ({
    id: c.id,
    label: c.label,
    level: c.level,
    /* Nov 6: the measured inputs, so the "Ezana thresholds" explainer can show this
       country's own reading next to each cut-off. */
    evidence: c.evidence || null,
  }));
  rows.push({
    id: 'crisis',
    label: 'Imminent currency crisis',
    level: brief?.crisisEstablished ? 'evidence present' : 'not established',
  });
  return rows;
}

export { PRESSURE_LABEL, MACRO_LENS };
