import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';
import { HAIKU_MODEL } from '@/lib/sonar/llm-providers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* The same model the Sonar pipeline runs, imported rather than retyped so the
   two cannot drift. The previous value here was a dated Sonnet string; when the
   API rejected it the route returned 502 and the modal showed "unavailable". */
const MODEL = HAIKU_MODEL;

/* The analysis cache lives in its own table, keyed by award id, because the two
   source tables are not symmetrical: gov_contract_recent_awards carries an
   `analysis` column but usaspending_contract_awards does not, so an award opened
   from the explorer had nowhere to cache. Reads still fall back to the old
   column so rows cached before this change are not re-generated. */
const CACHE_TABLE = 'gov_contract_award_analyses';

/* usaspending_contract_awards → the shape buildPrompt expects. The ingest cron
   requests only seven USAspending fields, so `raw` carries no description,
   NAICS or PSC; those come out null and the system prompt's "if the description
   is terse or empty, say so and keep it short" rule handles the thinner record
   honestly. The raw lookups are written for both the snake_case and the
   USAspending title-case spellings so that widening the ingest starts
   populating them without another change here. */
function fromUsaspending(row) {
  const raw = row.raw && typeof row.raw === 'object' ? row.raw : {};
  const pick = (...keys) => {
    for (const k of keys) {
      const v = raw[k];
      if (v != null && v !== '') return v;
    }
    return null;
  };
  return {
    generated_award_id: row.generated_award_id,
    recipient_name: row.recipient_name,
    recipient_parent_name: pick('recipient_parent_name', 'Recipient Parent Name'),
    awarding_agency: row.awarding_agency,
    awarding_sub_agency: row.awarding_sub_agency,
    funding_agency: row.funding_agency,
    award_amount: row.award_amount,
    action_date: row.action_date,
    fiscal_year: row.fiscal_year,
    naics_code: pick('naics', 'naics_code', 'NAICS Code'),
    naics_description: pick('naics_description', 'NAICS Description'),
    psc_code: pick('product_or_service_code', 'psc_code', 'PSC Code'),
    psc_description: pick('product_or_service_description', 'psc_description', 'PSC Description'),
    pop_city: pick('pop_city', 'Place of Performance City Code'),
    pop_state: pick('pop_state', 'Place of Performance State Code'),
    award_id_piid: row.award_id_piid,
    description: pick('description', 'Description', 'transaction_description'),
  };
}

const SYSTEM = `You are a careful government-procurement explainer for a finance platform.
You are given ONE federal contract award's public USAspending record and nothing else.
Explain, in plain language, what the awarding agency is buying, and which sectors or
supply chains the work plausibly touches. Hard rules:
- Base everything ONLY on the fields provided. If the description is terse or empty,
  say so and keep the analysis short — do NOT invent detail.
- Frame sector/supply-chain links as POSSIBILITIES, never predictions.
- State uncertainty explicitly where the record is thin.
- NEVER name a public company as a beneficiary unless the recipient itself is that
  company. NEVER suggest a trade, a direction, a price, or that anything "could benefit"
  a stock. No investment advice of any kind.
Respond with ONLY a JSON object, no prose around it, of the exact shape:
{"summary": string, "sectors": [{"name": string, "why": string}], "uncertainty": string}`;

/** Strip markdown fences and parse defensively; never throw.
    Accepts either the model's raw text or an already-parsed object: the cache
    column is jsonb, so a cached row comes back as an object, while the legacy
    per-row column stored a JSON string. */
function parseAnalysis(input) {
  if (input && typeof input === 'object') {
    return {
      summary: typeof input.summary === 'string' ? input.summary : '',
      sectors: Array.isArray(input.sectors)
        ? input.sectors
            .filter((s) => s && (s.name || s.why))
            .map((s) => ({ name: String(s.name || ''), why: String(s.why || '') }))
        : [],
      uncertainty: typeof input.uncertainty === 'string' ? input.uncertainty : '',
    };
  }
  const cleaned = String(input || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  try {
    const p = JSON.parse(cleaned);
    return {
      summary: typeof p.summary === 'string' ? p.summary : cleaned,
      sectors: Array.isArray(p.sectors)
        ? p.sectors
            .filter((s) => s && (s.name || s.why))
            .map((s) => ({ name: String(s.name || ''), why: String(s.why || '') }))
        : [],
      uncertainty: typeof p.uncertainty === 'string' ? p.uncertainty : '',
    };
  } catch {
    // Model didn't return clean JSON — surface its text as the summary rather
    // than fabricating structure.
    return { summary: cleaned || 'No analysis produced.', sectors: [], uncertainty: '' };
  }
}

function buildPrompt(a) {
  const f = (label, v) => (v == null || v === '' ? null : `${label}: ${v}`);
  const lines = [
    f('Recipient', a.recipient_name),
    f('Recipient parent', a.recipient_parent_name),
    f('Awarding agency', a.awarding_agency),
    f('Awarding sub-agency', a.awarding_sub_agency),
    f('Funding agency', a.funding_agency),
    f(
      'Award amount (USD)',
      Number(a.award_amount) ? Number(a.award_amount).toLocaleString('en-US') : null,
    ),
    f('Action date', a.action_date),
    f('Fiscal year', a.fiscal_year),
    f('NAICS', [a.naics_code, a.naics_description].filter(Boolean).join(' — ')),
    f('PSC (product/service code)', [a.psc_code, a.psc_description].filter(Boolean).join(' — ')),
    f('Place of performance', [a.pop_city, a.pop_state].filter(Boolean).join(', ')),
    f('PIID', a.award_id_piid),
    f('Description', a.description),
  ].filter(Boolean);
  return `Here is the award record:\n\n${lines.join('\n')}\n\nProduce the JSON analysis.`;
}

/* POST /api/gov-contracts/award-analysis
   Body: { generatedAwardId }. The award content is looked up server-side and the
   prompt is built from the DB record — NO client-supplied text reaches the model
   (that would be a prompt-injection surface). Result is cached on the row so a
   repeatedly-opened award costs one model call. Public + rate-limited (strict). */
export const POST = withApiGuard(
  async (request) => {
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const generatedAwardId = body?.generatedAwardId;
    if (!generatedAwardId || typeof generatedAwardId !== 'string') {
      return NextResponse.json({ error: 'generatedAwardId is required' }, { status: 400 });
    }

    const supabase = getAdminClient();

    /* Two sources. The ticker opens awards from gov_contract_recent_awards; the
       explorer table opens them from usaspending_contract_awards. Only the first
       was looked up here, so every award opened from the explorer 404'd and the
       modal showed the same "unavailable" state as a missing API key. */
    let award = null;
    let legacyAnalysis = null;
    const { data: recent } = await supabase
      .from('gov_contract_recent_awards')
      .select('*')
      .eq('generated_award_id', generatedAwardId)
      .maybeSingle();
    if (recent) {
      award = recent;
      legacyAnalysis = recent.analysis || null;
    } else {
      const { data: hosted } = await supabase
        .from('usaspending_contract_awards')
        .select('*')
        .eq('generated_award_id', generatedAwardId)
        .maybeSingle();
      if (hosted) award = fromUsaspending(hosted);
    }
    if (!award) return NextResponse.json({ error: 'Award not found' }, { status: 404 });

    // Cache hit → return the stored analysis, no model call. The shared table
    // first, then the legacy per-row column for anything cached before it.
    const { data: cached } = await supabase
      .from(CACHE_TABLE)
      .select('analysis')
      .eq('generated_award_id', generatedAwardId)
      .maybeSingle();
    if (cached?.analysis) {
      return NextResponse.json({ analysis: parseAnalysis(cached.analysis), cached: true });
    }
    if (legacyAnalysis) {
      return NextResponse.json({ analysis: parseAnalysis(legacyAnalysis), cached: true });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // No fabricated fallback — the client shows an honest error and still
      // renders the facts panel.
      return NextResponse.json({ error: 'Analysis is temporarily unavailable.' }, { status: 503 });
    }

    let text = '';
    try {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 900,
        system: SYSTEM,
        messages: [{ role: 'user', content: buildPrompt(award) }],
      });
      text = response.content?.[0]?.text ?? '';
    } catch {
      return NextResponse.json({ error: 'Analysis generation failed.' }, { status: 502 });
    }

    const analysis = parseAnalysis(text);

    /* Persist for the cache (best-effort; never blocks the response, and never
       fails the request if the table has not been created yet). Works for both
       sources because the cache table is keyed by award id, not by row. */
    try {
      await supabase.from(CACHE_TABLE).upsert(
        {
          generated_award_id: generatedAwardId,
          analysis,
          model: MODEL,
        },
        { onConflict: 'generated_award_id' },
      );
    } catch {
      /* cache write is best-effort */
    }

    return NextResponse.json({ analysis, cached: false });
  },
  { requireAuth: false, strict: true },
);
