/**
 * Anthropic model ids used by the research and analysis routes.
 *
 * Nov 19th, 2026: `claude-sonnet-4-20250514` was retired by Anthropic and
 * every call to it returned 404 not_found_error, which /api/ai-stock-analysis
 * surfaced as "Internal server error" on the GRPV and 3-Statement models.
 * One constant now, so the next retirement is a one-line change (or an env
 * override without a deploy of code).
 */
export const RESEARCH_MODEL = process.env.RESEARCH_AI_MODEL || 'claude-sonnet-4-5';
