/**
 * Response envelopes for /v1 (server only). Errors follow the docs page:
 * { error: { code, status, message, request_id, docs } }. Never a stack
 * trace, never SQL, never an internal name.
 */
export const DOCS_URL = 'https://ezana.world/ezana-api';

export const ERROR_DOCS = {
  invalid_param: `${DOCS_URL}#pagination`,
  invalid_key: `${DOCS_URL}#authentication`,
  not_in_scope: `${DOCS_URL}#rate-limits`,
  not_found: `${DOCS_URL}#endpoints`,
  not_available: `${DOCS_URL}#endpoints`,
  rate_limited: `${DOCS_URL}#rate-limits`,
  internal_error: `${DOCS_URL}#errors`,
};

export function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export function errorBody(status, code, message, requestId) {
  return {
    error: { code, status, message, request_id: requestId, docs: ERROR_DOCS[code] || DOCS_URL },
  };
}
