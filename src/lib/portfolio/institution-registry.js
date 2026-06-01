import { getAdminClient } from '@/lib/supabase';
import { plaidClient } from '@/lib/plaid';
import { canonicalizeInstitutionName } from './fingerprint';

const PLAID_COUNTRY_CODES = ['US'];
const PLAID_PRODUCTS_FILTER = ['investments'];

async function upsertInstitutionByCanonical(supabase, row, existingByCanonical) {
  const canon = canonicalizeInstitutionName(row.canonical_name || row.display_name);
  const match = existingByCanonical.get(canon);
  const payload = { ...row, updated_at: new Date().toISOString() };

  if (match) {
    const { error } = await supabase
      .from('institution_registry')
      .update(payload)
      .eq('id', match.id);
    if (error) throw error;
    return match.id;
  }

  const { data, error } = await supabase
    .from('institution_registry')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  existingByCanonical.set(canon, { id: data.id, canonical_name: row.canonical_name });
  return data.id;
}

export async function refreshInstitutionRegistry() {
  const supabase = getAdminClient();
  const stats = {
    snaptrade: { rows: 0 },
    plaid: { rows: 0, matched: 0, new: 0 },
    disabled: 0,
  };

  const { data: snapBrokers } = await supabase
    .from('snaptrade_brokerages_cache')
    .select(
      'slug, display_name, name, brokerage_type, allows_trading, enabled, maintenance_mode, logo_url, square_logo_url',
    );
  stats.snaptrade.rows = snapBrokers?.length || 0;

  const { data: existing } = await supabase
    .from('institution_registry')
    .select('id, canonical_name, snaptrade_slug, plaid_institution_id, logo_url');

  const existingByCanonical = new Map();
  for (const e of existing || []) {
    existingByCanonical.set(canonicalizeInstitutionName(e.canonical_name), e);
  }

  for (const b of snapBrokers || []) {
    if (!b.brokerage_type) continue;
    await upsertInstitutionByCanonical(
      supabase,
      {
        canonical_name: b.display_name || b.name,
        display_name: b.display_name || b.name,
        logo_url: b.logo_url,
        square_logo_url: b.square_logo_url,
        category: categorizeBrokerageType(b.brokerage_type),
        snaptrade_slug: b.slug,
        snaptrade_brokerage_type: b.brokerage_type,
        snaptrade_allows_trading: b.allows_trading,
        enabled: b.enabled,
        maintenance_mode: b.maintenance_mode,
      },
      existingByCanonical,
    );
  }

  const allPlaidInstitutions = [];
  let offset = 0;
  const pageSize = 500;
  while (true) {
    let page;
    try {
      page = await plaidClient.institutionsGet({
        count: pageSize,
        offset,
        country_codes: PLAID_COUNTRY_CODES,
        options: { products: PLAID_PRODUCTS_FILTER },
      });
    } catch (err) {
      console.error(
        '[institution-registry] plaid fetch failed at offset',
        offset,
        err?.response?.data || err.message,
      );
      break;
    }
    const inst = page?.data?.institutions || [];
    if (inst.length === 0) break;
    allPlaidInstitutions.push(...inst);
    offset += inst.length;
    if (inst.length < pageSize) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  stats.plaid.rows = allPlaidInstitutions.length;

  for (const inst of allPlaidInstitutions) {
    const canon = canonicalizeInstitutionName(inst.name);
    const match = existingByCanonical.get(canon);

    if (match) {
      stats.plaid.matched++;
      await supabase
        .from('institution_registry')
        .update({
          plaid_institution_id: inst.institution_id,
          plaid_products: inst.products,
          logo_url: match.logo_url || (inst.logo ? `data:image/png;base64,${inst.logo}` : null),
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id);
    } else {
      stats.plaid.new++;
      const { data: inserted } = await supabase
        .from('institution_registry')
        .insert({
          canonical_name: inst.name,
          display_name: inst.name,
          logo_url: inst.logo ? `data:image/png;base64,${inst.logo}` : null,
          category: categorizePlaidInstitution(inst),
          plaid_institution_id: inst.institution_id,
          plaid_products: inst.products,
          enabled: true,
          maintenance_mode: false,
        })
        .select('id, canonical_name')
        .single();
      if (inserted) {
        existingByCanonical.set(canon, inserted);
      }
    }
  }

  const seenSnap = new Set((snapBrokers || []).map((b) => b.slug));
  const seenPlaid = new Set(allPlaidInstitutions.map((i) => i.institution_id));

  const { data: registryRows } = await supabase
    .from('institution_registry')
    .select('id, snaptrade_slug, plaid_institution_id, enabled');

  for (const r of registryRows || []) {
    const snapStale = r.snaptrade_slug && !seenSnap.has(r.snaptrade_slug);
    const plaidStale = r.plaid_institution_id && !seenPlaid.has(r.plaid_institution_id);
    if (snapStale && plaidStale && r.enabled) {
      await supabase
        .from('institution_registry')
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq('id', r.id);
      stats.disabled++;
    }
  }

  return stats;
}

function categorizeBrokerageType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('crypto') || t.includes('exchange')) return 'crypto_exchange';
  if (t.includes('retire')) return 'retirement';
  return 'brokerage';
}

function categorizePlaidInstitution(inst) {
  const name = String(inst.name || '').toLowerCase();
  if (
    name.includes('401') ||
    name.includes('netbenefits') ||
    name.includes('empower') ||
    name.includes('voya') ||
    name.includes('principal') ||
    name.includes('tiaa') ||
    name.includes('workplace')
  ) {
    return 'retirement';
  }
  if (name.includes('coinbase') || name.includes('gemini') || name.includes('kraken')) {
    return 'crypto_exchange';
  }
  return 'brokerage';
}
