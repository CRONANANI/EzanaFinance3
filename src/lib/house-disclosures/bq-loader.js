/**
 * Write-capable GCP access for the House → BigQuery mirror.
 *
 * Deliberately SEPARATE from src/lib/bigquery-client.js and
 * src/lib/house-disclosures/gcs.js, which both read with
 * GCP_SERVICE_ACCOUNT_JSON. That account
 * (ezana-bigquery-reader@ezana-data.iam.gserviceaccount.com) holds only
 * Storage Object Viewer, and it should keep holding only that: the sync is
 * the one job in the app that needs to create objects and run load jobs, so
 * it gets its own credential rather than widening the one every read path
 * already uses.
 *
 * Env:
 *   GCP_PROJECT_ID                  — shared with the readers
 *   GCP_LOADER_SERVICE_ACCOUNT_JSON — the loader key JSON (stringified)
 *   GCP_LOADER_SERVICE_ACCOUNT_B64  — optional base64 fallback
 *
 * When the loader key is absent the sync route reports it and does nothing;
 * it never silently falls back to the reader, which would fail mid-run with
 * a permission error after having already written part of an export.
 */
import { BigQuery } from '@google-cloud/bigquery';
import { GoogleAuth } from 'google-auth-library';

export const BQ_DATASET = 'house_disclosures';
export const EXPORT_BUCKET = 'ezana-house-disclosures';
export const EXPORT_PREFIX = 'bq-export';

function parseLoaderCredentials() {
  let raw = process.env.GCP_LOADER_SERVICE_ACCOUNT_JSON || null;
  if (!raw && process.env.GCP_LOADER_SERVICE_ACCOUNT_B64) {
    try {
      raw = Buffer.from(process.env.GCP_LOADER_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
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

export function isLoaderConfigured() {
  return !!(process.env.GCP_PROJECT_ID && parseLoaderCredentials());
}

let _bq = null;
/** Memoized write-capable BigQuery client, or null when unconfigured. */
export function getLoaderBigQuery() {
  if (_bq) return _bq;
  const credentials = parseLoaderCredentials();
  if (!credentials || !process.env.GCP_PROJECT_ID) return null;
  _bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID, credentials });
  return _bq;
}

let _auth = null;
async function getWriteClient() {
  if (_auth) return _auth;
  const credentials = parseLoaderCredentials();
  if (!credentials) return null;
  /* read_write, not full_control: the sync creates and overwrites objects
     under one prefix and never needs to change ACLs. */
  const auth = new GoogleAuth({
    projectId: process.env.GCP_PROJECT_ID,
    credentials,
    scopes: ['https://www.googleapis.com/auth/devstorage.read_write'],
  });
  _auth = await auth.getClient();
  return _auth;
}

/**
 * Upload one newline-delimited-JSON part to GCS.
 *
 * Uses the raw upload endpoint through google-auth-library for the same
 * reason gcs.js does: @google-cloud/storage is not a dependency, and
 * google-auth-library already is, via @google-cloud/bigquery.
 *
 * @param {string} objectPath full object name, e.g. 'bq-export/filings/<ts>/part-000.json'
 * @param {string} ndjson the body — one JSON object per line
 */
export async function uploadNdjson(objectPath, ndjson) {
  const client = await getWriteClient();
  if (!client) throw new Error('GCP loader credentials not configured');
  const url =
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(EXPORT_BUCKET)}/o` +
    `?uploadType=media&name=${encodeURIComponent(objectPath)}`;
  const res = await client.request({
    url,
    method: 'POST',
    headers: { 'Content-Type': 'application/x-ndjson' },
    body: ndjson,
  });
  return res.data;
}

/** gs:// URI for an object in the export bucket. */
export function gsUri(objectPath) {
  return `gs://${EXPORT_BUCKET}/${objectPath}`;
}
