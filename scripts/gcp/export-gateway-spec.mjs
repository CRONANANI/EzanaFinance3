/**
 * Export the Ezana API spec for Google Cloud API Gateway.
 *
 * The app serves OpenAPI 3.1 at /v1/openapi.json. API Gateway accepts
 * OpenAPI 2.0 or 3.0.x only, and needs Google extensions that tell it where
 * the backend lives. This script builds the spec from the registry, downgrades
 * it to 3.0.3 and adds those extensions. Ezana keys are still checked by the
 * app, so the gateway passes the Authorization header through untouched
 * (disableAuth: true stops it attaching a Google ID token).
 *
 *   node --import ./scripts/register-sonar-loader.mjs scripts/gcp/export-gateway-spec.mjs \
 *     --backend https://ezana.world --host api.ezana.world > ezana-gateway.json
 */
import { buildOpenApi } from '../../src/lib/ezana-api/openapi.js';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BACKEND = arg('backend', 'https://ezana.world');
const HOST = arg('host', 'api.ezana.world');
const DEADLINE = Number(arg('deadline', '60'));

/* 3.1 -> 3.0: type arrays become nullable, const becomes a one-value enum,
   examples arrays become a single example, and 3.1-only keys are dropped. */
function down(node) {
  if (Array.isArray(node)) return node.map(down);
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    if (k === 'type' && Array.isArray(v)) {
      const types = v.filter((t) => t !== 'null');
      out.type = types[0] || 'string';
      if (v.includes('null')) out.nullable = true;
    } else if (k === 'const') {
      out.enum = [v];
    } else if (k === 'examples' && Array.isArray(v)) {
      if (v.length) out.example = down(v[0]);
    } else if (
      [
        '$schema',
        'jsonSchemaDialect',
        'webhooks',
        'contentMediaType',
        'unevaluatedProperties',
        '$id',
        '$anchor',
        'prefixItems',
        'dependentRequired',
        'dependentSchemas',
        'if',
        'then',
        'else',
      ].includes(k)
    ) {
      continue;
    } else if (k === 'exclusiveMinimum' && typeof v === 'number') {
      out.minimum = v;
      out.exclusiveMinimum = true;
    } else if (k === 'exclusiveMaximum' && typeof v === 'number') {
      out.maximum = v;
      out.exclusiveMaximum = true;
    } else {
      out[k] = down(v);
    }
  }
  return out;
}

const spec = down(buildOpenApi());
spec.openapi = '3.0.3';

/* Paths in the registry already start with /v1. Keep them as-is and give the
   server no base path, so the gateway forwards /v1/... to ezana.world/v1/...
   (next.config.js rewrites that to /api/v1/...). */
spec.paths = Object.fromEntries(
  Object.entries(spec.paths).map(([p, ops]) => [p.startsWith('/v1') ? p : `/v1${p}`, ops]),
);
spec.servers = [{ url: `https://${HOST}`, 'x-google-endpoint': { allowCors: false } }];

/* The OpenAPI document and status routes are public and live outside the
   registry; expose them through the gateway too. */
const plain = (summary) => ({
  get: {
    operationId: summary.replace(/\W+/g, '_'),
    summary,
    responses: { 200: { description: 'OK' } },
  },
});
spec.paths['/v1/openapi.json'] ??= plain('OpenAPI document');
spec.paths['/v1/status'] ??= plain('API status');

spec['x-google-api-management'] = {
  backends: {
    'ezana-app': {
      address: BACKEND,
      disableAuth: true,
      pathTranslation: 'APPEND_PATH_TO_ADDRESS',
      deadline: DEADLINE,
      protocol: 'http/1.1',
    },
  },
};
spec['x-google-backend'] = 'ezana-app';

/* Gateway does not validate Ezana bearer keys; the app does. Drop security
   requirements so the gateway does not demand its own Google API key. */
delete spec.security;
for (const ops of Object.values(spec.paths))
  for (const op of Object.values(ops)) delete op.security;

const json = JSON.stringify(spec, null, 2);
if (json.length > 10 * 1024 * 1024) throw new Error('Spec is over the 10 MB API Gateway limit');
process.stdout.write(json + '\n');
process.stderr.write(
  `ok: ${Object.keys(spec.paths).length} paths, ${(json.length / 1024).toFixed(0)} KB -> backend ${BACKEND}\n`,
);
