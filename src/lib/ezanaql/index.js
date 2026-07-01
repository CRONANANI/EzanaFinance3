/**
 * EzanaQL public entry point — the pipeline described in the language spec §10:
 *   text → parse → validate → (RLS inject + execute) → format
 *
 * The validator is the security boundary; the AI layer (NL→EzanaQL) is only a
 * convenience — its output is validated here before it can run.
 */
import { parse, EzanaQLError } from './parser';
import { validate } from './validator';
import { execute } from './executor';
import { format } from './formatter';

export { EzanaQLError } from './parser';
export { CATALOG, CATALOG_GAPS, CATALOG_VERSION, catalogSchemaForPrompt } from './catalog';

/**
 * Validate + run an EzanaQL query.
 * @param {object} opts
 * @param {string} opts.query   EzanaQL text
 * @param {object} opts.admin   Supabase client (service-role for public, user-scoped for private)
 * @param {string|null} opts.userId  Authenticated user id (required for user_private datasets)
 * @param {'table'|'csv'|'json'} [opts.format]
 * @returns {Promise<{ ok: true, format: string, result: object }|{ ok: false, error: string }>}
 */
export async function runEzanaQL({ query, admin, userId = null, format: fmtOverride }) {
  try {
    const ast = parse(query);
    const { dataset } = validate(ast);
    const fmt = fmtOverride || ast.as || 'table';
    const result = await execute({ ast, dataset, admin, userId });
    const formatted = format(result, fmt);
    return { ok: true, format: fmt, dataset: dataset.name, result: formatted };
  } catch (err) {
    if (err instanceof EzanaQLError || err?.userFacing) {
      return { ok: false, error: err.message };
    }
    // Never leak internals.
    return { ok: false, error: 'The query could not be completed.' };
  }
}

/** Validate only (used to gate AI-generated queries before running). */
export function validateEzanaQL(query) {
  try {
    const ast = parse(query);
    validate(ast);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.userFacing ? err.message : 'Invalid query.' };
  }
}
