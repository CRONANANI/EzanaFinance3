/**
 * POST /api/ezanaql/generate — natural language → EzanaQL.
 * Body: { prompt: string, datasetScope?: string }.
 *
 * Sends the sentence + the Catalog schema + few-shot examples to the report-gen
 * model (same Anthropic provider the rest of the app uses), constrained to emit
 * EzanaQL only. The returned text is validated by the same parser/validator
 * before it is handed back — the AI is a convenience layer; the validator is the
 * security boundary (spec §9). Auth required.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { catalogSchemaForPrompt, validateEzanaQL } from '@/lib/ezanaql';

export const dynamic = 'force-dynamic';

const ANTHROPIC_MODEL = 'claude-sonnet-4-5';

const FEW_SHOT = `Example 1
User: Top 10 defense contractors this fiscal year by total award value, with year-over-year change.
EzanaQL:
FROM gov.contracts
WHERE awarding_agency = "DoD" AND fiscal_year = 2026
SELECT recipient, SUM(award_value) AS total, YOY(award_value) AS yoy_change
GROUP BY recipient
ORDER BY total DESC
LIMIT 10;

Example 2
User: Every NASA award over 50 million dollars, newest first.
EzanaQL:
FROM gov.contracts
WHERE awarding_agency = "NASA" AND award_value >= 50M
SELECT recipient, award_value, action_date
ORDER BY action_date DESC
LIMIT 100;`;

function buildSystemPrompt(scope) {
  return `You translate a plain-English report request into a single EzanaQL query.
EzanaQL is a SQL-like, query-only DSL. Output ONLY the EzanaQL query — no prose, no markdown fences, no explanation.

Grammar: FROM dataset [WHERE cond] [SELECT projection] [GROUP BY fields] [HAVING cond] [ORDER BY sort] [LIMIT n [OFFSET m]] [AS csv|json|table]; . FROM is required and first. Strings use double quotes. Money shorthand: 50M, 1.2B. Aggregations: SUM/AVG/MIN/MAX/COUNT/MEDIAN. Functions: YOY, PCT_CHANGE, YEAR, QUARTER, FISCAL_YEAR, ROUND, ABS, UPPER, LOWER, COALESCE. There is NO INSERT/UPDATE/DELETE.

You may ONLY reference these datasets and their exact fields:
${catalogSchemaForPrompt()}

${scope ? `Prefer the dataset "${scope}" unless the request clearly needs another.` : ''}

${FEW_SHOT}`;
}

export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    user = null;
  }
  if (!user)
    return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });

  const rl = await checkRateLimit(`ezanaql:generate:${user.id || getClientIp(request)}`, {
    interval: 60000,
    limit: 15,
  });
  if (!rl.success) return rateLimitResponse(rl);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });
  }
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const scope = typeof body?.datasetScope === 'string' ? body.datasetScope : 'gov.contracts';
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
        system: buildSystemPrompt(scope),
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!resp.ok) {
      return NextResponse.json(
        { ok: false, error: 'The report-generation model is unavailable.' },
        { status: 502 },
      );
    }
    const data = await resp.json();
    query = (data?.content?.[0]?.text || '')
      .trim()
      .replace(/^```[a-z]*\n?/i, '')
      .replace(/```$/i, '')
      .trim();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'The report-generation model is unavailable.' },
      { status: 502 },
    );
  }

  if (!query)
    return NextResponse.json({ ok: false, error: 'The model returned no query.' }, { status: 502 });

  // Validate the generated query so we never hand back something the engine
  // would reject. If invalid, still return the text so the user can edit it.
  const check = validateEzanaQL(query);
  return NextResponse.json({
    ok: true,
    query,
    valid: check.ok,
    validationError: check.ok ? null : check.error,
  });
}
