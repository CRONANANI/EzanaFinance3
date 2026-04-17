/**
 * Shared error responder for API routes.
 *
 * Goals:
 *   - Never swallow a real DB / runtime error behind a generic "Server error".
 *   - Always log the full object server-side (stack + Supabase metadata).
 *   - Map well-known Postgres error codes to the right HTTP status so the
 *     client can show a useful message instead of a 500 fallback.
 *   - Include the real Supabase `code` / `message` / `details` / `hint` on
 *     the response body in development so you can debug from the Network tab;
 *     in production, keep the body slim and human-readable.
 *
 * Usage:
 *   import { dbErrorResponse, exceptionResponse } from '@/lib/api-errors';
 *
 *   const { data, error } = await supabaseAdmin.from('x').insert(...);
 *   if (error) return dbErrorResponse('watchlists POST', error, {
 *     uniqueViolation: 'You already have a watchlist with that name.',
 *   });
 *
 *   // in catch blocks:
 *   } catch (e) { return exceptionResponse('watchlists POST', e); }
 */
import { NextResponse } from 'next/server';

const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Map PostgREST / Postgres error codes to an HTTP status + human-readable
 * fallback message. See https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
function classify(pgError, overrides = {}) {
  const code = pgError?.code || '';
  const message = pgError?.message || '';

  // 23505 unique_violation — e.g. duplicate watchlist name.
  if (code === '23505') {
    return {
      status: 409,
      message: overrides.uniqueViolation || 'That name is already in use.',
    };
  }

  // 23503 foreign_key_violation — referenced row does not exist.
  if (code === '23503') {
    return {
      status: 400,
      message:
        overrides.foreignKeyViolation ||
        'One of the referenced items no longer exists.',
    };
  }

  // 23502 not_null_violation.
  if (code === '23502') {
    return {
      status: 400,
      message:
        overrides.notNullViolation ||
        'A required field is missing from the request.',
    };
  }

  // 23514 check_violation — e.g. the `type in (...)` check on watchlist items.
  if (code === '23514') {
    return {
      status: 400,
      message:
        overrides.checkViolation ||
        'One of the values is not allowed for this field.',
    };
  }

  // 42P01 undefined_table — migration hasn't run on this Supabase project.
  if (code === '42P01') {
    return {
      status: 500,
      message:
        'Database table is not provisioned. Run the pending Supabase migrations and redeploy.',
    };
  }

  // 42703 undefined_column — schema drift between code and DB.
  if (code === '42703') {
    return {
      status: 500,
      message:
        'Database schema is out of sync with the server code. Run the pending migrations.',
    };
  }

  // PostgREST "JSON object requested, multiple (or no) rows returned"
  if (code === 'PGRST116') {
    return { status: 404, message: overrides.notFound || 'Not found.' };
  }

  // Supabase-JS surfaces auth / RLS errors with these shapes.
  const lowered = message.toLowerCase();
  if (lowered.includes('jwt') || lowered.includes('invalid api key')) {
    return {
      status: 500,
      message:
        'Supabase auth failed for the server client. Is SUPABASE_SERVICE_ROLE_KEY set?',
    };
  }
  if (lowered.includes('row-level security')) {
    return {
      status: 403,
      message: overrides.rls || 'You are not allowed to perform this action.',
    };
  }

  return {
    status: 500,
    message: overrides.fallback || 'Database request failed.',
  };
}

/** Return a NextResponse for a Supabase / PostgREST error. */
export function dbErrorResponse(label, pgError, overrides = {}) {
  const { status, message } = classify(pgError, overrides);

  console.error(`[${label}] DB error:`, {
    code: pgError?.code,
    message: pgError?.message,
    details: pgError?.details,
    hint: pgError?.hint,
  });

  const body = {
    error: message,
    code: pgError?.code || undefined,
  };
  if (IS_DEV) {
    body.detail = pgError?.message;
    body.hint = pgError?.hint;
    body.details = pgError?.details;
  }

  return NextResponse.json(body, { status });
}

/** Return a NextResponse for a thrown exception inside a route handler. */
export function exceptionResponse(label, err) {
  console.error(`[${label}] Unhandled exception:`, err);
  const body = {
    error: 'Unexpected server error.',
  };
  if (IS_DEV) {
    body.detail = err?.message;
    body.stack = err?.stack;
  }
  return NextResponse.json(body, { status: 500 });
}

/** Return a 400 for request-validation problems, with detail. */
export function validationResponse(message, extras) {
  return NextResponse.json(
    { error: message, ...(extras || {}) },
    { status: 400 }
  );
}
