/**
 * OpenAPI 3.1 document generated from the registry. Pure.
 * Live endpoints carry parameters and a response schema; roadmap endpoints
 * are listed with x-status: roadmap and a 501 response.
 */
import { ENDPOINTS, GROUPS, PARAMS } from './registry';
import { TIERS } from './tiers';

const TYPE = {
  string: { type: 'string' },
  number: { type: 'number' },
  integer: { type: 'integer' },
  boolean: { type: 'boolean' },
  date: { type: 'string', format: 'date' },
  'date-time': { type: 'string', format: 'date-time' },
  object: { type: 'object' },
  array: { type: 'array', items: { type: 'string' } },
};

function paramSchema(name) {
  const p = PARAMS[name];
  const base =
    p.type === 'int'
      ? {
          type: 'integer',
          ...(p.min != null ? { minimum: p.min } : {}),
          ...(p.max != null ? { maximum: p.max } : {}),
        }
      : p.type === 'number'
        ? { type: 'number', minimum: 0 }
        : p.type === 'date'
          ? { type: 'string', format: 'date' }
          : {
              type: 'string',
              ...(p.enum ? { enum: p.enum } : {}),
              ...(p.max ? { maxLength: p.max } : {}),
            };
  return p.repeatable ? { type: 'array', items: base } : base;
}

const ERROR_REF = { $ref: '#/components/responses/Error' };

export function buildOpenApi() {
  const paths = {};
  for (const e of ENDPOINTS) {
    const pathParams = [...e.path.matchAll(/\{([a-z_]+)\}/g)].map((m) => ({
      name: m[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
    const op = {
      operationId: (e.id || e.path).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, ''),
      summary: e.summary,
      tags: [GROUPS.find((g) => g.key === e.group)?.title || e.group],
      'x-status': e.status,
      ...(e.scope ? { 'x-scope': e.scope } : {}),
      parameters: [
        ...pathParams,
        ...(e.params || []).map((name) => ({
          name,
          in: 'query',
          required: false,
          description: PARAMS[name].desc,
          schema: paramSchema(name),
          ...(PARAMS[name].repeatable ? { style: 'form', explode: true } : {}),
        })),
      ],
      responses:
        e.status === 'live'
          ? {
              200: {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data:
                          (e.params || []).includes('cursor') ||
                          e.id === 'lobbying.top_spenders' ||
                          e.id === 'fec.candidate_funding'
                            ? { type: 'array', items: rowSchema(e) }
                            : rowSchema(e),
                        page: { $ref: '#/components/schemas/Page' },
                        meta: { $ref: '#/components/schemas/Meta' },
                      },
                      required: ['data', 'meta'],
                    },
                  },
                },
              },
              400: ERROR_REF,
              401: ERROR_REF,
              403: ERROR_REF,
              404: ERROR_REF,
              429: ERROR_REF,
              500: ERROR_REF,
            }
          : { 401: ERROR_REF, 501: ERROR_REF },
    };
    if (op.parameters.length === 0) delete op.parameters;
    paths[e.path] = { get: op };
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Ezana API',
      version: '1.0.0',
      description:
        'Signals from public disclosures: congressional trades, committees, lobbying, campaign finance, federal contracts, prediction markets and SEC filings. Endpoints marked x-status: roadmap return 501.',
      contact: {
        name: 'Ezana API',
        email: 'api@ezana.world',
        url: 'https://ezana.world/ezana-api',
      },
      license: { name: 'Ezana data license', url: 'https://ezana.world/terms-of-service' },
    },
    servers: [{ url: 'https://ezana.world' }],
    security: [{ bearer: [] }],
    tags: GROUPS.map((g) => ({ name: g.title, description: g.framing })),
    paths,
    components: {
      securitySchemes: {
        bearer: {
          type: 'http',
          scheme: 'bearer',
          description: 'Authorization: Bearer ezk_live_...',
        },
      },
      schemas: {
        Page: {
          type: 'object',
          properties: {
            limit: { type: 'integer' },
            has_more: { type: 'boolean' },
            next: { type: ['string', 'null'] },
          },
        },
        Meta: {
          type: 'object',
          properties: {
            request_id: { type: 'string' },
            source: { type: ['string', 'null'] },
            delayed_days: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  enum: [
                    'invalid_param',
                    'invalid_key',
                    'not_in_scope',
                    'not_found',
                    'rate_limited',
                    'not_available',
                    'internal_error',
                  ],
                },
                status: { type: 'integer' },
                message: { type: 'string' },
                request_id: { type: 'string' },
                docs: { type: 'string' },
              },
              required: ['code', 'status', 'message', 'request_id'],
            },
          },
        },
      },
      responses: {
        Error: {
          description: 'Error',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
    'x-tiers': Object.values(TIERS).map((t) => ({
      id: t.id,
      rate_limit_per_min: t.ratePerMin,
      delay_days: t.delayDays,
      scopes: t.scopes,
    })),
  };
}

function rowSchema(e) {
  return {
    type: 'object',
    properties: Object.fromEntries(
      Object.entries(e.fields || {}).map(([k, t]) => [k, TYPE[t] || {}]),
    ),
  };
}
