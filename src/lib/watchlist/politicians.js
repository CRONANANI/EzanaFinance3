/**
 * Politician watchlist data (Nov 2026), server only: members of Congress the
 * user follows on the watchlist, with their latest disclosed trades, and a
 * name search for the add flow. Public congressional data
 * (congress_members, congress_trades).
 */
const sideOf = (type) =>
  type === 'purchase' ? 'buy' : type === 'sale' || type === 'sale_partial' ? 'sell' : 'other';

const memberOut = (m) => ({
  id: m.bioguide_id,
  name: m.full_name || [m.first_name, m.last_name].filter(Boolean).join(' '),
  chamber: m.chamber ? String(m.chamber).toLowerCase() : null,
  party: m.party || null,
  state: m.state || null,
  photoUrl: m.photo_url || null,
  inOffice: m.in_office !== false,
});

/** Members by bioguide id, each with up to `perMember` latest trades. */
export async function politiciansWithTrades(admin, ids, { perMember = 5 } = {}) {
  const list = [...new Set((ids || []).filter((id) => /^[A-Z0-9]{5,10}$/i.test(id)))].slice(0, 60);
  if (!list.length) return [];
  const [{ data: members, error: mErr }, { data: trades, error: tErr }] = await Promise.all([
    admin
      .from('congress_members')
      .select(
        'bioguide_id, full_name, first_name, last_name, chamber, party, state, photo_url, in_office',
      )
      .in('bioguide_id', list),
    admin
      .from('congress_trades')
      .select(
        'bioguide_id, transaction_date, disclosure_date, ticker, asset_name, type, amount_min, amount_max',
      )
      .in('bioguide_id', list)
      .order('transaction_date', { ascending: false })
      .limit(Math.min(1000, list.length * perMember * 4)),
  ]);
  if (mErr) throw mErr;
  if (tErr) throw tErr;
  const byMember = new Map();
  for (const t of trades || []) {
    const arr = byMember.get(t.bioguide_id) || [];
    if (arr.length >= perMember) continue;
    arr.push({
      date: String(t.transaction_date).slice(0, 10),
      disclosed: t.disclosure_date ? String(t.disclosure_date).slice(0, 10) : null,
      ticker: t.ticker || null,
      asset: t.asset_name || t.ticker || null,
      side: sideOf(t.type),
      amountMin: t.amount_min != null ? Number(t.amount_min) : null,
      amountMax: t.amount_max != null ? Number(t.amount_max) : null,
    });
    byMember.set(t.bioguide_id, arr);
  }
  return (members || []).map((m) => ({
    ...memberOut(m),
    trades: byMember.get(m.bioguide_id) || [],
  }));
}

/** Members whose name matches `q` (in office first). */
export async function searchPoliticians(admin, q, { limit = 8 } = {}) {
  const term = String(q || '').trim();
  if (term.length < 2) return [];
  const safe = term.replace(/[%_,()]/g, ' ').trim();
  const { data, error } = await admin
    .from('congress_members')
    .select(
      'bioguide_id, full_name, first_name, last_name, chamber, party, state, photo_url, in_office',
    )
    .ilike('full_name', `%${safe}%`)
    .order('in_office', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(memberOut);
}
