/**
 * Every EzanaQL request is scoped to one dataset dimension: the bar lives on
 * the dimension hubs only, and the server enforces the scope. Returns
 * { dimension } or { response } (the error to send back).
 */
import { NextResponse } from 'next/server';
import { isDimension, dimensionHasQueryableData } from './catalog';

export function requireDimension(body) {
  const dimension = body?.dimension;
  if (!isDimension(dimension)) {
    return {
      response: NextResponse.json(
        { ok: false, error: 'Open a dataset hub to run EzanaQL queries.' },
        { status: 400 },
      ),
    };
  }
  if (!dimensionHasQueryableData(dimension)) {
    return {
      response: NextResponse.json(
        { ok: false, error: "Queries open when this dimension's first dataset goes live." },
        { status: 409 },
      ),
    };
  }
  return { dimension };
}
