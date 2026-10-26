/**
 * OpenAPI 3.1 document generated from the registry. Pure.
 * Every operation is tagged with its dimension, carries x-ezana-kind (data or
 * insight) and, for insights, the method sentence in its description.
 */
import { DIMENSIONS, ENDPOINTS, GROUPS, PARAMS } from './registry';
import { paramEnumsOf } from './query';
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

function paramSchema(name, e) {
  const p = PARAMS[name];
  /* Shared params narrowed per operation (sort, dim, direction...). */
  const narrowed = e ? paramEnumsOf(e)[name] : null;
  if (narrowed) return { type: 'string', enum: narrowed };
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
      description: e.method ? `${e.summary}\n\nMethod: ${e.method}` : e.summary,
      tags: [e.dimensionLabel || e.group],
      'x-status': e.status,
      'x-ezana-kind': e.kind,
      'x-ezana-group': GROUPS.find((g) => g.key === e.group)?.title || e.group,
      ...(e.scope ? { 'x-scope': e.scope } : {}),
      parameters: [
        ...pathParams,
        ...(e.params || []).map((name) => ({
          name,
          in: 'query',
          required: false,
          description: paramEnumsOf(e)[name]
            ? `${PARAMS[name].desc} Accepted here: ${paramEnumsOf(e)[name].join(', ')}.`
            : PARAMS[name].desc,
          schema: paramSchema(name, e),
          ...(PARAMS[name].repeatable ? { style: 'form', explode: true } : {}),
        })),
      ],
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data:
                    (e.params || []).includes('cursor') ||
                    e.list ||
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
        503: ERROR_REF,
      },
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
        "Ezana's datasets across five dimensions (Capitol Watch, Titans Shadow, Eyes Above, The Hive, Global Empire Lighthouse) plus cross-dimensional joins. Each operation is x-ezana-kind data (the records, shaped) or insight (something Ezana computes: a score, a join, a ranking, a change).",
      contact: {
        name: 'Ezana API',
        email: 'api@ezana.world',
        url: 'https://ezana.world/ezana-api',
      },
      license: { name: 'Ezana data license', url: 'https://ezana.world/terms-of-service' },
    },
    servers: [{ url: 'https://ezana.world' }],
    security: [{ bearer: [] }],
    tags: DIMENSIONS.filter((d) => GROUPS.some((g) => g.dimension === d.id)).map((d) => ({
      name: d.label,
      description: GROUPS.filter((g) => g.dimension === d.id)
        .map((g) => `### ${g.title}\n\n${tagDescription(g)}`)
        .join('\n\n'),
    })),
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
            as_of: {
              type: ['string', 'null'],
              description: "Newest date in the result, or the source dataset's latest sync.",
            },
            method: {
              type: 'string',
              description: 'Insight endpoints: how the figure is computed, in one sentence.',
            },
            coverage: {
              type: 'object',
              description: 'Present when a dataset has no rows yet: { rows: 0, note }.',
            },
            partial: {
              type: 'array',
              items: { type: 'string' },
              description: 'Composite responses: sections that timed out and came back null.',
            },
            updated_at: {
              type: ['string', 'null'],
              format: 'date-time',
              description:
                'Newest refresh time of the data in this response, where the endpoint reports one.',
            },
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
                    'out_of_range',
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

/* The group's framing, plus its "How the data works" guide where it has one. */
function tagDescription(g) {
  if (!g.guide?.length) return g.framing;
  return [g.framing, ...g.guide.map((x) => `**${x.h}.** ${x.p}`)].filter(Boolean).join('\n\n');
}
