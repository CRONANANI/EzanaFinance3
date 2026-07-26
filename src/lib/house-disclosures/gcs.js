/**
 * Read staged House-disclosure index files from Google Cloud Storage.
 *
 * The 19 yearly <YEAR>FD.txt files are staged in gs://ezana-house-disclosures/.
 * Rather than add the heavy @google-cloud/storage SDK (not installed here), we
 * reuse `google-auth-library` — already a dependency via @google-cloud/bigquery —
 * to mint an access token from the SAME service-account credentials the BigQuery
 * client uses (GCP_PROJECT_ID + GCP_SERVICE_ACCOUNT_JSON / _B64) and download the
 * object over the GCS JSON API. No new env vars, no new dependency.
 */
import { GoogleAuth } from 'google-auth-library';

/** Same credential source as src/lib/bigquery-client.js. */
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

export function isGcsConfigured() {
  return !!(
    process.env.GCP_PROJECT_ID &&
    (process.env.GCP_SERVICE_ACCOUNT_JSON || process.env.GCP_SERVICE_ACCOUNT_B64)
  );
}

let _client = null;
async function getAuthedClient() {
  if (_client) return _client;
  const credentials = parseCredentials();
  if (!credentials) return null;
  const auth = new GoogleAuth({
    projectId: process.env.GCP_PROJECT_ID,
    credentials,
    scopes: ['https://www.googleapis.com/auth/devstorage.read_only'],
  });
  _client = await auth.getClient();
  return _client;
}

/**
 * Download a GCS object as UTF-8 text. Throws when credentials are missing or the
 * object can't be read (the caller wraps per-file so one failure doesn't abort the
 * whole run).
 */
export async function downloadGcsText(bucket, object) {
  const client = await getAuthedClient();
  if (!client) throw new Error('GCP credentials not configured');
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(
    bucket,
  )}/o/${encodeURIComponent(object)}?alt=media`;
  const res = await client.request({ url, responseType: 'text' });
  return typeof res.data === 'string' ? res.data : String(res.data ?? '');
}
