import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

/**
 * Landing Sonar fixture. Assembles the sourced-matches rows for the landing
 * band from real public-record data: congressional_trades and echo_articles in
 * Supabase, the latest Lockheed award from usaspending.gov, and the latest
 * Lockheed filing from EDGAR.
 *
 * Public corpus only, no user data, no auth. This is a landing-page endpoint,
 * so it is deliberately unguarded, and it reads nothing that is not already a
 * public record.
 *
 * Every branch degrades to null rather than throwing: the band renders
 * deterministic bracketed placeholders on the server and only swaps them after
 * hydration if this returns enough real rows, so a failure here is invisible
 * rather than breaking the section.
 */
export const revalidate = 86400;

const LMT_CIK = '0000936468';
const UA = 'EzanaFinance ezana.world contact@ezana.world';

function fmtUsd(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

async function congressRow(admin) {
  try {
    const { data } = await admin
      .from('congressional_trades')
      .select('politician_name, transaction_type, transaction_date')
      .eq('symbol', 'LMT')
      .order('transaction_date', { ascending: false })
      .limit(1);
    const t = data?.[0];
    if (!t?.politician_name) return null;
    return {
      tag: 'CONGRESS',
      source: 'House disclosure',
      line: `${t.politician_name}, ${t.transaction_type}, ${t.transaction_date}`,
    };
  } catch {
    return null;
  }
}

async function echoRow(admin) {
  try {
    const { data } = await admin
      .from('echo_articles')
      .select('article_title')
      .eq('article_status', 'published')
      .textSearch('tsv', 'defense OR Lockheed', { type: 'websearch', config: 'english' })
      .order('published_at', { ascending: false })
      .limit(1);
    const a = data?.[0];
    if (!a?.article_title) return null;
    return { tag: 'ECHO', source: 'Echo editorial', line: a.article_title };
  } catch {
    return null;
  }
}

/**
 * Contract row. Ezana already syncs USAspending awards into
 * usaspending_contract_awards with a resolved `ticker`, so the local table is
 * tried first: it is the same public data, it needs no outbound call, and it
 * is the "real entry from the Ezana databases" this row is meant to show. The
 * live API stays as the fallback for when the sync has not covered LMT yet.
 */
async function contractRowFromDb(admin) {
  try {
    const { data } = await admin
      .from('usaspending_contract_awards')
      .select('awarding_agency, award_amount')
      .eq('ticker', 'LMT')
      .order('award_amount', { ascending: false, nullsFirst: false })
      .limit(1);
    const a = data?.[0];
    const amount = fmtUsd(a?.award_amount);
    if (!a?.awarding_agency || !amount) return null;
    return { tag: 'CONTRACTS', source: 'usaspending.gov', line: `${a.awarding_agency}, ${amount}` };
  } catch {
    return null;
  }
}

async function contractRowFromApi() {
  try {
    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters: {
          recipient_search_text: ['LOCKHEED MARTIN'],
          award_type_codes: ['A', 'B', 'C', 'D'],
        },
        fields: ['Award Amount', 'Awarding Agency'],
        sort: 'Award Amount',
        order: 'desc',
        limit: 1,
      }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const a = json?.results?.[0];
    if (!a) return null;
    const amount = fmtUsd(a['Award Amount']);
    if (!amount || !a['Awarding Agency']) return null;
    return {
      tag: 'CONTRACTS',
      source: 'usaspending.gov',
      line: `${a['Awarding Agency']}, ${amount}`,
    };
  } catch {
    return null;
  }
}

async function contractRow(admin) {
  return (admin ? await contractRowFromDb(admin) : null) ?? (await contractRowFromApi());
}

async function secRow() {
  try {
    const res = await fetch(`https://data.sec.gov/submissions/CIK${LMT_CIK}.json`, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const recent = json?.filings?.recent;
    if (!recent?.form?.length) return null;
    return {
      tag: 'SEC',
      source: 'EDGAR',
      line: `${recent.form[0]} filed ${recent.filingDate[0]}`,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  let admin = null;
  try {
    admin = getAdminClient();
  } catch {
    // Service key absent in this environment. The two remote sources still
    // work, and the band falls back if too few rows come back.
  }

  const [echo, congress, contract, sec] = await Promise.all([
    admin ? echoRow(admin) : null,
    admin ? congressRow(admin) : null,
    contractRow(admin),
    secRow(),
  ]);

  const rows = [echo, congress, contract, sec].filter(Boolean);
  return NextResponse.json(
    { rows },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' } },
  );
}
