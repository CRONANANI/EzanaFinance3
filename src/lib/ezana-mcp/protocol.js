/**
 * Ezana MCP server: protocol and tools (pure; tested by
 * scripts/check-ezana-mcp.mjs). Stateless Streamable HTTP: every POST
 * carries one JSON-RPC message (or a batch, for older clients) and gets a
 * JSON answer; notifications get 202. No sessions, no server-sent events.
 *
 * All data access goes through `ctx.run(pathname, params)`, which the route
 * binds to the same execution core as the REST API (key scopes, rate limits,
 * metering), and `ctx.renderPng(model)` for chart images. The tool layer
 * never touches the database directly.
 */
import { LIVE_ENDPOINTS, DIMENSIONS } from '../ezana-api/registry';
import { exposureChart, formatValue } from '../ezana-api/charts/models';

const SERVER_INFO = { name: 'ezana', title: 'Ezana Finance', version: '1.0.0' };
export const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

const INSTRUCTIONS =
  'Ezana Finance data: congressional trading, lobbying, federal contracts, 13F and insider filings, prediction markets, macro and alternative data, Alpha Intelligence signals and options exposure. Start with ezana_list_endpoints, call any route with ezana_call_endpoint, and use ezana_chart or ezana_delta_exposure for images. Every value is a disclosed or computed figure with its source in meta; signals state their maturity and limits. Findings, not investment advice.';

const CHARTS = {
  'options-exposure': {
    path: (a) => `/v1/charts/options-exposure/${enc(a.ticker)}`,
    needs: 'ticker',
  },
  'procurement-acceleration': { path: () => '/v1/charts/procurement-acceleration' },
  'congress-insider-flow': { path: () => '/v1/charts/congress-insider-flow' },
  contracts: { path: (a) => `/v1/charts/contracts/${enc(a.ticker)}`, needs: 'ticker' },
  'prediction-market': {
    path: (a) => `/v1/charts/predictions/markets/${enc(a.id)}/history`,
    needs: 'id',
  },
};

const enc = (v) => encodeURIComponent(String(v ?? '').trim());
const text = (t) => ({ type: 'text', text: t });
const MAX_TEXT = 60000;

const TOOLS = [
  {
    name: 'ezana_list_endpoints',
    title: 'List Ezana API endpoints',
    description:
      'List the Ezana API routes this key can call, with parameters and what each returns. Filter by dimension (e.g. capitol, titans, alpha, options, charts) or a search word.',
    inputSchema: {
      type: 'object',
      properties: {
        dimension: { type: 'string', enum: DIMENSIONS.map((d) => d.id) },
        search: { type: 'string', description: 'Word to match in the path or summary.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'ezana_call_endpoint',
    title: 'Call an Ezana API endpoint',
    description:
      'Call any Ezana API GET route (path starting /v1/, path parameters filled in) with query parameters, and get its JSON: data, page and meta (source, method, request id).',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'For example /v1/congress/trades or /v1/contracts/tickers/LMT.',
        },
        params: {
          type: 'object',
          description: 'Query parameters, e.g. { "ticker": "NVDA", "limit": 10 }.',
          additionalProperties: { type: ['string', 'number', 'boolean'] },
        },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    name: 'ezana_chart',
    title: 'Chart Ezana data',
    description:
      'Render an Ezana chart as an image (PNG): options-exposure (ticker), procurement-acceleration, congress-insider-flow, contracts (ticker) or prediction-market (id). Extra params are passed to the wrapped data route.',
    inputSchema: {
      type: 'object',
      properties: {
        chart: { type: 'string', enum: Object.keys(CHARTS) },
        ticker: { type: 'string' },
        id: { type: 'string', description: 'Prediction market id (for prediction-market).' },
        theme: { type: 'string', enum: ['dark', 'light'] },
        params: { type: 'object', additionalProperties: { type: ['string', 'number', 'boolean'] } },
      },
      required: ['chart'],
      additionalProperties: false,
    },
  },
  {
    name: 'ezana_delta_exposure',
    title: 'Options delta exposure table',
    description:
      'Strike x expiration options exposure table for one underlying (net delta in shares by default; also net_delta_usd, call_delta, put_delta, gamma_usd_1pct, open_interest), returned as a table and a heatmap image. Restricted: needs a key with the options scope.',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: { type: 'string' },
        mode: {
          type: 'string',
          enum: [
            'net_delta',
            'net_delta_usd',
            'call_delta',
            'put_delta',
            'gamma_usd_1pct',
            'open_interest',
          ],
        },
        strikes: { type: 'integer', minimum: 2, maximum: 40 },
        expirations: { type: 'integer', minimum: 1, maximum: 16 },
        max_days: { type: 'integer', minimum: 1, maximum: 730 },
        chart: { type: 'boolean', description: 'Include the heatmap image (default true).' },
      },
      required: ['ticker'],
      additionalProperties: false,
    },
  },
  {
    name: 'ezana_alpha_signals',
    title: 'Alpha Intelligence signal registry',
    description:
      "Every Alpha Intelligence signal: what it measures and doesn't, its maturity (descriptive, statistical, predictive), and whether it is live or which data gate blocks it.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
].map((t) => ({ ...t, annotations: { readOnlyHint: true, openWorldHint: true } }));

/* ── tool implementations ──────────────────────────────────────────── */

const asText = (obj) => {
  const s = JSON.stringify(obj, null, 2);
  return s.length > MAX_TEXT
    ? `${s.slice(0, MAX_TEXT)}\n… truncated; narrow the query (limit, filters).`
    : s;
};

function errorResult(out) {
  const e = out.body?.error;
  return {
    isError: true,
    content: [text(e ? `${e.status} ${e.code}: ${e.message}` : `Request failed (${out.status}).`)],
  };
}

/** Markdown table of an exposure grid, strikes as rows. */
export function exposureTable(d) {
  const head = `| Strike | ${d.expirations.join(' | ')} |`;
  const rule = `|---|${d.expirations.map(() => '---').join('|')}|`;
  const rows = d.strikes.map(
    (s, i) =>
      `| ${s} | ${d.cells[i].map((c) => formatValue(c ? c.value : null, d.unit)).join(' | ')} |`,
  );
  return [head, rule, ...rows].join('\n');
}

const toParams = (o) =>
  Object.fromEntries(
    Object.entries(o || {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  );

async function callTool(name, args, ctx) {
  const a = args || {};
  if (name === 'ezana_list_endpoints') {
    const scopes = new Set(ctx.key?.scopes || []);
    const q = (a.search || '').toLowerCase();
    const rows = LIVE_ENDPOINTS.filter(
      (e) =>
        scopes.has(e.scope) &&
        (!a.dimension || e.dimension === a.dimension) &&
        (!q || e.path.toLowerCase().includes(q) || (e.summary || '').toLowerCase().includes(q)),
    );
    const lines = rows.map(
      (e) =>
        `GET ${e.path}${e.params?.length ? `  ?${e.params.join(',')}` : ''}\n  ${e.summary || ''}`,
    );
    return {
      content: [
        text(
          rows.length
            ? `${rows.length} endpoints available to this key:\n\n${lines.join('\n\n')}`
            : 'No endpoints match for this key and filter.',
        ),
      ],
    };
  }

  if (name === 'ezana_call_endpoint') {
    const path = String(a.path || '');
    if (!/^\/v1\/[A-Za-z0-9_\-./%]+$/.test(path) || path.includes('..')) {
      return { isError: true, content: [text('path must be an Ezana route starting with /v1/.')] };
    }
    const out = await ctx.run(path, toParams(a.params));
    if (out.raw) {
      return {
        content: [text(`That route returns ${out.raw.contentType}; use ezana_chart for images.`)],
      };
    }
    if (out.status >= 400) return errorResult(out);
    return { content: [text(asText(out.body))], structuredContent: out.body };
  }

  if (name === 'ezana_chart') {
    const spec = CHARTS[a.chart];
    if (!spec)
      return {
        isError: true,
        content: [text(`Unknown chart. Use one of: ${Object.keys(CHARTS).join(', ')}.`)],
      };
    if (spec.needs && !a[spec.needs]) {
      return { isError: true, content: [text(`${a.chart} needs "${spec.needs}".`)] };
    }
    const out = await ctx.run(spec.path(a), {
      ...toParams(a.params),
      format: 'json',
      ...(a.theme ? { theme: a.theme } : {}),
    });
    if (out.status >= 400) return errorResult(out);
    const model = out.body?.data?.chart;
    const png = await ctx.renderPng(model, a.theme || 'dark');
    return {
      content: [
        { type: 'image', data: Buffer.from(png).toString('base64'), mimeType: 'image/png' },
        text(
          `${model.title}\n${model.subtitle}\nSource: ${model.source}${model.note ? `\n${model.note}` : ''}`,
        ),
      ],
    };
  }

  if (name === 'ezana_delta_exposure') {
    if (!a.ticker) return { isError: true, content: [text('ticker is required.')] };
    const out = await ctx.run(
      `/v1/options/exposure/${enc(a.ticker)}`,
      toParams({
        mode: a.mode,
        strikes: a.strikes,
        expirations: a.expirations,
        max_days: a.max_days,
      }),
    );
    if (out.status >= 400) return errorResult(out);
    const d = out.body.data;
    const summary = `${d.ticker} · ${d.label} (${d.unit}) · underlying ${d.spot ?? 'n/a'} · total ${formatValue(d.total, d.unit)}\nOpen interest as of ${d.coverage.open_interest_date ?? 'n/a'}; ${d.coverage.contracts_missing_greeks} of ${d.coverage.contracts} contracts had no greek.\n\n${exposureTable(d)}\n\n${(out.body.meta?.limitations || []).join(' ')}`;
    const content = [text(summary)];
    if (a.chart !== false) {
      const png = await ctx.renderPng(exposureChart(d), 'dark');
      content.unshift({
        type: 'image',
        data: Buffer.from(png).toString('base64'),
        mimeType: 'image/png',
      });
    }
    return { content, structuredContent: d };
  }

  if (name === 'ezana_alpha_signals') {
    const out = await ctx.run('/v1/alpha/signals', {});
    if (out.status >= 400) return errorResult(out);
    const lines = (out.body.data || []).map(
      (s) =>
        `${s.name} (${s.id} v${s.version}) · ${s.maturity} · ${s.status}${s.route ? ` · ${s.route}` : ''}\n  ${s.measures}${
          s.status !== 'live' && s.gates?.length
            ? `\n  Gate: ${s.gates
                .filter((g) => !g.pass)
                .map((g) => `${g.gate}: ${g.observed ?? 'n/a'} (needs ${g.required})`)
                .join('; ')}`
            : ''
        }`,
    );
    return { content: [text(lines.join('\n\n'))], structuredContent: out.body };
  }

  return { isError: true, content: [text(`Unknown tool ${name}.`)] };
}

/* ── JSON-RPC ──────────────────────────────────────────────────────── */

const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const err = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

/** Handle one JSON-RPC message. Returns a response object, or null for notifications. */
export async function handleMessage(msg, ctx) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return err(msg?.id, -32600, 'Invalid Request');
  }
  const isNotification = msg.id === undefined || msg.id === null;
  if (isNotification) return null;
  const { id, method, params } = msg;
  try {
    switch (method) {
      case 'initialize': {
        const asked = params?.protocolVersion;
        return ok(id, {
          protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: INSTRUCTIONS,
        });
      }
      case 'ping':
        return ok(id, {});
      case 'tools/list':
        return ok(id, { tools: TOOLS });
      case 'tools/call': {
        const tool = TOOLS.find((t) => t.name === params?.name);
        if (!tool) return err(id, -32602, `Unknown tool: ${params?.name}`);
        return ok(id, await callTool(tool.name, params.arguments, ctx));
      }
      case 'resources/list':
        return ok(id, { resources: [] });
      case 'resources/templates/list':
        return ok(id, { resourceTemplates: [] });
      case 'prompts/list':
        return ok(id, { prompts: [] });
      default:
        return err(id, -32601, `Method not found: ${method}`);
    }
  } catch (e) {
    console.error('[mcp]', method, e?.message || e);
    return ok(id, {
      isError: true,
      content: [text('Something went wrong on our side. Retry shortly.')],
    });
  }
}
