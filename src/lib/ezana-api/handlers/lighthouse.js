/**
 * Ezana API handlers: lighthouse dimension (server only). Keyed by route id;
 * merged into HANDLERS by ../handlers.js. Built on ../handler-kit.js.
 */
export const HANDLERS = {};

/* Database functions these handlers call that exist in production but no
   migration creates (verified live with a read-only pg_proc query). The API
   guard test accepts an RPC only if a migration creates it or it is here. */
export const LIVE_ONLY_RPCS = [];
