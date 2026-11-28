# Ezana API: charts, MCP server and options exposure (28 Nov 2026)

## Charts (`/v1/charts`, dimension `charts`)

| Route                                         | Wraps                            | Chart                       |
| --------------------------------------------- | -------------------------------- | --------------------------- |
| `/v1/charts/options-exposure/{ticker}`        | `options.exposure`               | strike x expiration heatmap |
| `/v1/charts/procurement-acceleration`         | `alpha.procurement_acceleration` | diverging bars (robust z)   |
| `/v1/charts/congress-insider-flow`            | `congress.insider_flow`          | diverging bars (flow score) |
| `/v1/charts/contracts/{ticker}`               | `contracts.ticker`               | columns by fiscal year      |
| `/v1/charts/predictions/markets/{id}/history` | `predictions.market_history`     | probability line            |

Each chart route copies scope, delay, params and enums from the route it wraps
(`catalog/charts.js`), so it can never be wider than its data. Extra params: `format`
(`json` = chart model + Vega-Lite spec + SVG; `png`; `svg`; `vega`) and `theme` (`dark`, `light`).
Code: `src/lib/ezana-api/charts/` (models, svg, vega, png via `next/og`). Exported images use
concrete colours mirroring `theme-variables.css`, since CSS variables do not resolve outside the app.

## MCP server (`POST /api/mcp`)

Remote, stateless Streamable HTTP JSON-RPC (`src/lib/ezana-mcp/protocol.js`,
`src/app/api/mcp/route.js`). Auth: the caller's Ezana API key as `Authorization: Bearer`.
Every tool call runs through `src/lib/ezana-api/execute.js`, the same core as `GET /v1/...`:
scopes, per-key rate limits and metering apply, logged with method `MCP`. Middleware lets
`/api/mcp` skip the session lookup and per-IP limit, like `/v1`.

Tools: `ezana_list_endpoints`, `ezana_call_endpoint`, `ezana_chart` (PNG image content),
`ezana_delta_exposure` (table + heatmap), `ezana_alpha_signals`. Setup snippets for Claude Code,
Codex, Grok CLI and Cursor are on `/ezana-api#ai-tools`.

## Options exposure (`/v1/options/exposure/{ticker}`, scope `options`, restricted)

- Data: Alpaca options chain snapshots (greeks, IV, quotes) + Broker API option contracts (open
  interest, size) + latest underlying trade (`src/lib/ezana-api/options/alpaca-options.js`).
  `ALPACA_OPTIONS_FEED` = `indicative` (default, delayed) or `opra`.
- Maths (pure, `insights/options.js`): per strike x expiration, sum of OI x greek x size.
  Modes: `net_delta` (shares), `net_delta_usd`, `call_delta`, `put_delta`, `gamma_usd_1pct`
  (calls +, puts -), `open_interest`. Missing greeks are counted, never zero; empty cells are null.
- **Restricted**: `options` is in `RESTRICTED_SCOPES` (tiers.js), granted by hand on a key, because
  Alpaca/OPRA terms restrict redistribution. Do not add it to a tier until redistribution rights are
  confirmed in writing.
- Not verified against live Alpaca from the build environment (no credentials or network there).
  First live check: grant `options` to your key, then call
  `/v1/options/exposure/AAPL` and compare a few cells with the chain.
