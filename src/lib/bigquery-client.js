/**
 * Lazy BigQuery client for the Government Contracts corpus (read-only).
 *
 * Credentials come from env ONLY — never the repo:
 *   GCP_PROJECT_ID          — billing/auth project id
 *   GCP_SERVICE_ACCOUNT_JSON — the service-account key JSON (stringified)
 *   GCP_SERVICE_ACCOUNT_B64  — optional base64 fallback of the same JSON
 *
 * Callers use isBigQueryConfigured() to degrade gracefully (the page falls back
 * to the Supabase rollups / sample when BigQuery isn't wired).
 */
import { BigQuery } from '@google-cloud/bigquery';

let _client = null;

export function isBigQueryConfigured() {
  return !!(
    process.env.GCP_PROJECT_ID &&
    (process.env.GCP_SERVICE_ACCOUNT_JSON || process.env.GCP_SERVICE_ACCOUNT_B64)
  );
}

function parseCredentials() {
  let raw = process.env.GCP_SERVICE_ACCOUNT_JSON || null;
  if (!raw && process.env.GCP_SERVICE_ACCOUNT_B64) {
    try {
      raw = Buffer.from(process.env.GCP_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
    } catch {
      return null;
    }
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Memoized BigQuery client, or null when unconfigured/misconfigured. */
export function getBigQuery() {
  if (_client) return _client;
  if (!isBigQueryConfigured()) return null;
  const credentials = parseCredentials();
  if (!credentials) return null;
  _client = new BigQuery({ projectId: process.env.GCP_PROJECT_ID, credentials });
  return _client;
}
