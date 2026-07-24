import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { withApiGuard } from '@/lib/api-guard';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Match the model already used in ai-analyzer/route.js.
const MODEL = 'claude-sonnet-4-20250514';

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

/** Strip markdown fences and parse defensively; never throw. */
function parseAnalysis(text) {
  const cleaned = String(text || '')
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
    f('Award amount (USD)', Number(a.award_amount) ? Number(a.award_amount).toLocaleString('en-US') : null),
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
    const { data: award } = await supabase
      .from('gov_contract_recent_awards')
      .select('*')
      .eq('generated_award_id', generatedAwardId)
      .maybeSingle();
    if (!award) return NextResponse.json({ error: 'Award not found' }, { status: 404 });

    // Cache hit → return the stored analysis, no model call.
    if (award.analysis) {
      return NextResponse.json({ analysis: parseAnalysis(award.analysis), cached: true });
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

    // Persist the raw model JSON for the cache (best-effort; never blocks the
    // response). Stored as text; parsed back on the next hit.
    try {
      await supabase
        .from('gov_contract_recent_awards')
        .update({ analysis: JSON.stringify(analysis), analysis_generated_at: new Date().toISOString() })
        .eq('generated_award_id', generatedAwardId);
    } catch {
      /* cache write is best-effort */
    }

    return NextResponse.json({ analysis, cached: false });
  },
  { requireAuth: false, strict: true },
);
