import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_API_KEY;
const BASE = 'https://financialmodelingprep.com/stable';

// Active Senate traders — use first names only (FMP searches by first name)
// Selected from the full Congress member list for known trading activity
const SENATE_FIRST_NAMES = [
  'Tommy', 'Mark', 'Shelley', 'Markwayne', 'Jerry', 'John', 'Susan', 'Lisa',
  'Marsha', 'Joni', 'Richard', 'Ted', 'Rand', 'Lindsey', 'Bill', 'Chuck',
  'Roger', 'Thom', 'Tim', 'Bernie', 'Elizabeth', 'Amy', 'Angus', 'Jon',
  'Raphael', 'Tammy', 'Michael', 'Martin', 'Ron', 'Dan', 'Kevin', 'Steve',
  'Katie', 'Jim', 'Tom', 'Mike', 'Gary', 'Rick', 'Cory', 'Chris',
  'Jeanne', 'Margaret', 'Patty', 'Maria', 'Catherine', 'Jacky', 'Kyrsten',
  'Mark', 'Ben', 'Jeff', 'Peter', 'Sheldon', 'Jack', 'Brian', 'Adam',
];

// Deduplicate
const UNIQUE_SENATE_NAMES = [...new Set(SENATE_FIRST_NAMES)];

async function fetchSenateByName(firstName) {
  try {
    const url = `${BASE}/senate-trades-by-name?name=${encodeURIComponent(firstName)}&apikey=${FMP_KEY}`;
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

  try {
    if (type === 'by-name' && name) {
      // Single lookup by first name
      const data = await fetchSenateByName(name);
      return NextResponse.json(data);
    }

    // Default: fetch all tracked senators in parallel, merge, sort by most recent
    const results = await Promise.all(UNIQUE_SENATE_NAMES.map(fetchSenateByName));
    const merged = results
      .flat()
      .sort((a, b) =>
        new Date(b.disclosureDate || b.transactionDate || 0) -
        new Date(a.disclosureDate || a.transactionDate || 0)
      );

    // Deduplicate by a composite key
    const seen = new Set();
    const deduped = merged.filter((t) => {
      const key = `${t.symbol}-${t.transactionDate}-${t.firstName}-${t.lastName}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json(deduped);
  } catch (err) {
    console.error('FMP senate route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
