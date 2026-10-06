/**
 * POST /api/ezanaql/generate — natural language → EzanaQL.
 * Body: { prompt: string, dimension: string, datasetScope?: string }. The
 * prompt carries only the dimension's datasets and few-shots, and the result is
 * validated against the dimension.
 *
 * Sends the sentence + the Catalog schema + few-shot examples to the report-gen
 * model (same Anthropic provider the rest of the app uses), constrained to emit
 * EzanaQL only. The returned text is validated by the same parser/validator
 * before it is handed back — the AI is a convenience layer; the validator is the
 * security boundary (spec §9). Session optional; guests are rate-limited per IP.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { catalogSchemaForPrompt, validateEzanaQL } from '@/lib/ezanaql';
import { requireDimension } from '@/lib/ezanaql/request-scope';
// Pure module so the ezanaql check script can validate the examples.
import { fewShotFor } from './few-shots';

export const dynamic = 'force-dynamic';

// Claude Haiku 4.5: NL→DSL against a tight grammar + few-shots is a
// small-model task — near-Sonnet quality at a fraction of the cost.
// Dated string pinned deliberately; override via env to bump models
// without a deploy.
const ANTHROPIC_MODEL = process.env.EZANAQL_MODEL || 'claude-haiku-4-5-20251001';

/* Dataset-specific guidance, sent only with the Capitol Watch schema. */
const CAPITOL_NOTES = `gov.contracts.ticker is the PARENT company's ticker where known (a subsidiary resolves to its listed parent); is_public = false means a known-private contractor, null means unknown. "Public contractors" → WHERE is_public = TRUE.
"Politicians who own / hold / currently own X" is capitol.holdings (one row per member per ticker still held). "Politicians who traded / bought / sold X" is capitol.congress_trades (one row per trade).`;

const JOIN_NOTES = `Joins: only between datasets the schema marks "joinable with", on the key it names. Use SEMI JOIN when the second dataset only filters the first ("companies that politicians have traded"): it keeps the FROM rows that have a match and adds no fields. Use JOIN when the answer needs the second dataset's fields (which politician, how many members): its fields are addressed as shortname.field (holdings.politician, contracts.parent), or bare when the name is unambiguous. In a JOIN each aggregate sees one side's rows once, so SUM(award_value) and COUNT(DISTINCT holdings.politician) are both correct in the same query; only COUNT() with no field counts pairs, so always count a field.`;

function buildSystemPrompt(dimension, scope) {
  return `You translate a plain-English report request into a single EzanaQL query.
EzanaQL is a SQL-like, query-only DSL. Output ONLY the EzanaQL query — no prose, no markdown fences, no explanation.

Grammar: FROM dataset [[SEMI] JOIN dataset ON key] [WHERE cond] [SELECT projection] [GROUP BY fields] [HAVING cond] [ORDER BY sort] [LIMIT n [OFFSET m]] [AS csv|json|table]; . FROM is required and first. Strings use double quotes. Money shorthand: 50M, 1.2B. Relative dates: LAST 30 DAYS, LAST 6 MONTHS, LAST 5 YEARS, LAST QUARTER, YTD, FY2026. Aggregations: SUM/AVG/MIN/MAX/COUNT()/COUNT(DISTINCT f)/MEDIAN (COUNT takes () or one field, never *). Functions: YOY, PCT_CHANGE, YEAR, QUARTER, FISCAL_YEAR, ROUND, ABS, UPPER, LOWER, COALESCE. There is NO INSERT/UPDATE/DELETE.
${JOIN_NOTES}
${dimension === 'capitol' ? `${CAPITOL_NOTES}\n` : ''}You may ONLY reference these datasets and their exact fields:
${catalogSchemaForPrompt(dimension)}

${scope ? `Prefer the dataset "${scope}" unless the request clearly needs another.` : ''}

${fewShotFor(dimension)}`;
}

export async function POST(request) {
  /* Every live dataset is public data (the catalog's only user_private
     dataset is unavailable, and rlsFilter refuses it without a user anyway),
     so a session is optional: it only widens the rate limit. Guests are
     limited per IP, more tightly because each call spends model credit. */
  let user = null;
  try {
    ({ user } = await requireUser(request));
  } catch {
    user = null;
  }
  const rl = await checkRateLimit(
    user ? `ezanaql:generate:${user.id}` : `ezanaql:generate:ip:${getClientIp(request)}`,
    { interval: 60000, limit: user ? 15 : 6 },
  );
  if (!rl.success) return rateLimitResponse(rl);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });
  }
  const MAX_PROMPT = 600;
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim().slice(0, MAX_PROMPT) : '';
  const dim = requireDimension(body);
  if (dim.response) return dim.response;
  const scope = typeof body?.datasetScope === 'string' ? body.datasetScope : null;
  if (!prompt)
    return NextResponse.json(
      { ok: false, error: 'Describe the report you want.' },
      { status: 400 },
    );

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'The report-generation model is not configured.' },
      { status: 503 },
    );
  }

  let query = '';
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 400,
        temperature: 0,
        system: buildSystemPrompt(dim.dimension, scope),
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      // Server-side only — Vercel function logs. Never returned to the client:
      // provider error bodies can reference account/billing details.
      console.error('[ezanaql:generate] anthropic_error', {
        status: resp.status,
        model: ANTHROPIC_MODEL,
        body: errBody.slice(0, 500),
      });
      const msg =
        resp.status === 429
          ? 'The report model is busy — try again in a moment.'
          : resp.status === 401
            ? 'The report-generation model is misconfigured. (Server logs have details.)'
            : 'The report-generation model is unavailable. (Server logs have details.)';
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }
    const data = await resp.json();
    // 3. Credit spend per generation, visible in Vercel logs.
    console.log('[ezanaql:generate] ok', {
      model: ANTHROPIC_MODEL,
      input_tokens: data?.usage?.input_tokens,
      output_tokens: data?.usage?.output_tokens,
    });
    query = (data?.content?.[0]?.text || '')
      .trim()
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/```$/i, '')
      .trim();
  } catch (err) {
    // Network-level failure (DNS, TLS, abort) — distinguishable in logs from
    // provider rejections, which log anthropic_error above.
    console.error('[ezanaql:generate] fetch_failed', err?.message);
    return NextResponse.json(
      { ok: false, error: 'The report-generation model is unavailable.' },
      { status: 502 },
    );
  }

  if (!query)
    return NextResponse.json({ ok: false, error: 'The model returned no query.' }, { status: 502 });

  // Validate the generated query so we never hand back something the engine
  // would reject. If invalid, still return the text so the user can edit it.
  const check = validateEzanaQL(query, { dimension: dim.dimension });
  return NextResponse.json({
    ok: true,
    query,
    valid: check.ok,
    validationError: check.ok ? null : check.error,
  });
}
