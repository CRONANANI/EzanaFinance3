#!/usr/bin/env node
/**
 * One-off, idempotent migration: encrypt existing plaintext brokerage secrets
 * in place using the application-layer AES-256-GCM cipher.
 *
 *   - snaptrade_users.user_secret   (UNRECOVERABLE from SnapTrade — do not lose)
 *   - plaid_items.access_token
 *
 * Safe to run twice: values already carrying the `v1:` prefix are skipped.
 * Logs only counts (encrypted / skipped / errors) — never the secret values.
 *
 * Run MANUALLY by the operator AFTER TOKEN_ENCRYPTION_KEY is set in the
 * environment and the backward-compatible app build is deployed. It is NOT
 * wired into app startup or any cron.
 *
 * Usage:   node scripts/encrypt-existing-tokens.mjs
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *               TOKEN_ENCRYPTION_KEY
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { encryptToken, isEncrypted } from '../src/lib/crypto/token-cipher.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local'), override: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!process.env.TOKEN_ENCRYPTION_KEY) {
  console.error('Missing TOKEN_ENCRYPTION_KEY — set it before running this migration.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function migrateTable({ table, idColumn, secretColumn }) {
  const stats = { encrypted: 0, skipped: 0, errors: 0 };

  const { data: rows, error } = await supabase.from(table).select(`${idColumn}, ${secretColumn}`);
  if (error) {
    console.error(`[${table}] select failed: ${error.message}`);
    stats.errors += 1;
    return stats;
  }

  for (const row of rows || []) {
    const value = row[secretColumn];
    if (value == null || value === '') {
      stats.skipped += 1;
      continue;
    }
    if (isEncrypted(value)) {
      stats.skipped += 1;
      continue;
    }
    const { error: updErr } = await supabase
      .from(table)
      .update({ [secretColumn]: encryptToken(value) })
      .eq(idColumn, row[idColumn]);
    if (updErr) {
      // Log the row identifier only — never the secret.
      console.error(`[${table}] update failed for ${idColumn}=${row[idColumn]}: ${updErr.message}`);
      stats.errors += 1;
    } else {
      stats.encrypted += 1;
    }
  }

  return stats;
}

async function main() {
  console.log('Encrypting existing brokerage secrets (idempotent)…');

  const snap = await migrateTable({
    table: 'snaptrade_users',
    idColumn: 'user_id',
    secretColumn: 'user_secret',
  });
  console.log(
    `snaptrade_users → encrypted ${snap.encrypted}, skipped ${snap.skipped}, errors ${snap.errors}`,
  );

  const plaid = await migrateTable({
    table: 'plaid_items',
    idColumn: 'id',
    secretColumn: 'access_token',
  });
  console.log(
    `plaid_items → encrypted ${plaid.encrypted}, skipped ${plaid.skipped}, errors ${plaid.errors}`,
  );

  const totalErrors = snap.errors + plaid.errors;
  console.log(`Done. Total errors: ${totalErrors}`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
