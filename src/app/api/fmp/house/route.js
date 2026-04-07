import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable';

// Active House traders — first names only (FMP house-trades-by-name takes first name)
// Pulled from the full Congress member list, focused on members with known trading history
const HOUSE_FIRST_NAMES = [
  'Nancy', 'Dan', 'Josh', 'Michael', 'Virginia', 'Debbie', 'Ro', 'Patrick',
  'John', 'Vern', 'Brian', 'Roger', 'Mike', 'Tom', 'Rick', 'Suzan',
  'Marie', 'Anna', 'Morgan', 'Chip', 'Steve', 'Kevin', 'Lois', 'Scott',
  'Brad', 'French', 'Ashley', 'David', 'Mark', 'Bill', 'Greg', 'Teresa',
  'Darrell', 'Ken', 'Julia', 'Eric', 'Donald', 'James', 'Tim', 'Warren',
  'Mariannette', 'August', 'Pete', 'Lloyd', 'Steny', 'Adam', 'Brad',
  'Jimmy', 'Jake', 'Victoria', 'Thomas', 'Dean', 'Claudia', 'Nicole',
  'Darin', 'Raja', 'Suhas', 'Katie', 'Alexandria', 'Pramila', 'Hakeem',
  'Ilhan', 'Rashida', 'Ayanna', 'Alexandria', 'Jasmine', 'Summer', 'Maxwell',
  'Sara', 'Sydney', 'Yvette', 'Grace', 'Nydia', 'Adriano', 'Ritchie',
  'Gregory', 'Jerrold', 'Joseph', 'Paul', 'Richard', 'William', 'Neal',
  'Jim', 'Seth', 'Earl', 'Sanford', 'Henry', 'Bennie', 'Emanuel',
];

const UNIQUE_HOUSE_NAMES = [...new Set(HOUSE_FIRST_NAMES)];

async function fetchHouseByName(firstName) {
  try {
    const url = `${BASE}/house-trades-by-name?name=${encodeURIComponent(firstName)}&apikey=${FMP_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function fetchHouseBySymbol(symbol) {
  try {
    const url = `${BASE}/house-trades?symbol=${encodeURIComponent(symbol)}&apikey=${FMP_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function GET(request) {
  if (!FMP_KEY) {
    return NextResponse.json({ error: 'FMP_API_KEY is not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const name = searchParams.get('name');
  const symbol = searchParams.get('symbol');

  try {
    if (type === 'by-name' && name) {
      const data = await fetchHouseByName(name);
      return NextResponse.json(data);
    }

    if (type === 'by-symbol' && symbol) {
      const data = await fetchHouseBySymbol(symbol);
      return NextResponse.json(data);
    }

    // Default: fetch all tracked house members in parallel, merge, sort
    const results = await Promise.all(UNIQUE_HOUSE_NAMES.map(fetchHouseByName));
    const merged = results
      .flat()
      .sort((a, b) =>
        new Date(b.disclosureDate || b.transactionDate || 0) -
        new Date(a.disclosureDate || a.transactionDate || 0)
      );

    // Deduplicate
    const seen = new Set();
    const deduped = merged.filter((t) => {
      const key = `${t.symbol}-${t.transactionDate}-${t.firstName}-${t.lastName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json(deduped);
  } catch (err) {
    console.error('FMP house route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
