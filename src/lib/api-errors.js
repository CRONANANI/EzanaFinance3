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
 *
 * When none of the specific branches matches, we fall back to the caller's
 * `fallback` message BUT append a short `[code … message …]` tail. This
 * guarantees that future opaque failures never re-introduce the "which line
 * actually threw?" problem — the user's Network tab always has enough detail
 * to triage without needing server logs.
 */
function classify(pgError, overrides = {}) {
  const code = pgError?.code || '';
  const message = pgError?.message || '';
  const lowered = message.toLowerCase();

  if (code === '23505') {
    return {
      status: 409,
      message: overrides.uniqueViolation || 'That name is already in use.',
    };
  }

  if (code === '23503') {
    return {
      status: 400,
      message:
        overrides.foreignKeyViolation ||
        'One of the referenced items no longer exists.',
    };
  }

  if (code === '23502') {
    return {
      status: 400,
      message:
        overrides.notNullViolation ||
        'A required field is missing from the request.',
    };
  }

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

  // 42501 insufficient_privilege — usually RLS rejecting the caller.
  if (code === '42501') {
    return {
      status: 403,
      message:
        overrides.rls ||
        'Row-level security blocked this request. Make sure you are signed in.',
    };
  }

  // PostgREST "JSON object requested, multiple (or no) rows returned"
  if (code === 'PGRST116') {
    return { status: 404, message: overrides.notFound || 'Not found.' };
  }

  // PostgREST generic errors (PGRST###) — surface the real message so the
  // client can distinguish "policy violation" from "column missing" etc.
  if (typeof code === 'string' && code.startsWith('PGRST')) {
    return {
      status: 500,
      message: overrides.fallback
        ? `${overrides.fallback} [${code}] ${message}`.trim()
        : `Database request failed: [${code}] ${message}`.trim(),
    };
  }

  // Missing Supabase env vars — createClient() throws "supabaseKey is
  // required" / "supabaseUrl is required" when SUPABASE_SERVICE_ROLE_KEY or
  // NEXT_PUBLIC_SUPABASE_URL is not set. Previously this fell through to the
  // generic fallback and hid the real cause.
  if (
    lowered.includes('supabasekey is required') ||
    lowered.includes('supabaseurl is required')
  ) {
    return {
      status: 500,
      message:
        'Server is missing Supabase credentials. Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in the environment.',
    };
  }

  // Auth / JWT / API-key misconfig on the server client.
  if (lowered.includes('jwt') || lowered.includes('invalid api key')) {
    return {
      status: 500,
      message:
        'Supabase auth failed for the server client. Check SUPABASE_SERVICE_ROLE_KEY / bearer token.',
    };
  }

  // RLS rejection surfaced as a message (code may be empty on some versions).
  if (lowered.includes('row-level security') || lowered.includes('row level security')) {
    return {
      status: 403,
      message: overrides.rls || 'You are not allowed to perform this action.',
    };
  }

  // Network errors from fetch() inside supabase-js.
  if (
    lowered.includes('failed to fetch') ||
    lowered.includes('fetch failed') ||
    lowered.includes('network error') ||
    lowered.includes('econnrefused') ||
    lowered.includes('enotfound')
  ) {
    return {
      status: 502,
      message:
        (overrides.fallback || 'Request failed to reach the database.') +
        ` [network] ${message}`.trim(),
    };
  }

  // Generic fallback — always include the code and a trimmed message so the
  // client UI / network tab has enough to diagnose without server logs.
  const base = overrides.fallback || 'Database request failed.';
  const tail = code || message
    ? ` [${code || 'err'}] ${message}`.slice(0, 240).trim()
    : '';
  return {
    status: 500,
    message: tail ? `${base}${tail}` : base,
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

  // Always surface a short, non-sensitive tail so the client UI / network
  // tab can diagnose missing-env / JWT / config errors without server logs.
  const raw = (err?.message || '').trim();
  const safeTail = raw ? ` [${raw.slice(0, 200)}]` : '';

  const body = {
    error: `Unexpected server error.${safeTail}`,
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
