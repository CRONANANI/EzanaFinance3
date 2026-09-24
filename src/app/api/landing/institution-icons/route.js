import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { plaidClient } from '@/lib/plaid';

/**
 * GET /api/landing/institution-icons
 *
 * Institution marks for the landing page's integrations section, resolved
 * from Plaid by NAME rather than by institution_id: ids differ between
 * sandbox and production, so a hardcoded id is a environment-specific bug
 * waiting to happen, while name search works the same in both.
 *
 * Caching matters here because Plaid bills per call and this roster changes
 * essentially never. Three layers, cheapest first: a module memo (saves a
 * query on a warm instance), a row in public.landing_demo_cache shared across
 * instances and regions, and a long s-maxage on the response so the CDN
 * answers most visitors without reaching the function at all. Worst case is
 * one search per roster name per week, once, not once per instance.
 *
 * Fail-soft is the whole contract. Every error path returns 200 with an empty
 * icons map, because the section has a complete fallback of its own: a miss
 * renders an initials tile, never a broken image and never an empty slot.
 * Some names may legitimately not resolve, and that is not an error either.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* Only ever paid on a cold cache, and then once a week. The pool below keeps
   the real figure far under this, but forty external searches deserve more
   than the default ceiling. */
export const maxDuration = 60;

/* Keyed by country, because an institution's name is only unique within one:
   "TD" means TD Canada Trust in CA and TD Bank in US, and searching the wrong
   country returns the wrong bank rather than nothing. */
const ROSTER = {
  CA: [
    'Royal Bank of Canada',
    'TD Canada Trust',
    'Bank of Montreal',
    'Scotiabank',
    'CIBC',
    'National Bank of Canada',
    'Desjardins',
    'Tangerine',
    'Simplii Financial',
    'EQ Bank',
    'Laurentian Bank',
    'ATB Financial',
    'Manulife Bank',
    'Vancity',
    'Coast Capital Savings',
    'Meridian Credit Union',
    'Wealthsimple',
    'Questrade',
    "President's Choice Financial",
    'Canadian Western Bank',
  ],
  US: [
    'Chase',
    'Bank of America',
    'Wells Fargo',
    'Citibank',
    'Capital One',
    'U.S. Bank',
    'PNC Bank',
    'Truist',
    'TD Bank',
    'American Express',
    'Charles Schwab',
    'Fidelity',
    'Ally Bank',
    'Discover Bank',
    'Citizens Bank',
    'Fifth Third Bank',
    'KeyBank',
    'Regions Bank',
    'USAA',
    'SoFi',
  ],
};

/* Forty searches, not fifteen. Sequentially that is a cold-start request long
   enough to be worth avoiding, so they run in a small pool: enough to keep the
   route comfortably inside its budget, few enough to stay polite to an API we
   are a guest on. */
const SEARCH_CONCURRENCY = 5;

/* Bumped with every roster change. A stale row is not merely incomplete: it
   serves logos for institutions no longer on the page and, worse, withholds
   the new ones for a week. v2 held fifteen banks, v1 the brokerages. */
const CACHE_KEY = 'plaid-institution-icons-v3';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

let memo = null;

/* "U.S. Bank" and "US Bank" have to compare equal, and so do "CIBC" and
   "CIBC (Canadian Imperial Bank of Commerce)". Punctuation goes, case goes,
   whitespace collapses. */
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/* Plaid's canonical names are close to ours but rarely identical: "TD Canada
   Trust" comes back as "TD Canada Trust (EasyWeb)", "Chase" can be "Chase" or
   "J.P. Morgan Chase". Equality would reject both, so the rule is containment
   of every token of our name. A single-token name like "Scotiabank" or "CIBC"
   still has to appear as a whole word, which is what keeps "CIBC" from
   matching an unrelated result that merely ranked first. */
function pickInstitution(results, query) {
  const list = Array.isArray(results) ? results : [];
  if (!list.length) return null;
  const tokens = normalize(query).split(' ').filter(Boolean);
  if (!tokens.length) return null;

  const containsAll = list.find((inst) => {
    const name = ` ${normalize(inst?.name)} `;
    return tokens.every((t) => name.includes(` ${t} `));
  });
  if (containsAll) return containsAll;

  /* Second pass for the one shape the first misses: our name is longer than
     Plaid's ("Royal Bank of Canada" vs "RBC Royal Bank", "Citibank" vs
     "Citi"). Requiring the first token alone is loose, so it is only reached
     once full containment has failed, and the resolution is logged either
     way for review. */
  const [first] = tokens;
  return (
    list.find((inst) => {
      const name = normalize(inst?.name);
      return name.startsWith(first) || first.startsWith(name.split(' ')[0] || '\u0000');
    }) || null
  );
}

async function resolveOne(name, countryCode) {
  const res = await plaidClient.institutionsSearch({
    query: name,
    country_codes: [countryCode],
    options: { include_optional_metadata: true },
  });
  const inst = pickInstitution(res?.data?.institutions, name);
  if (!inst) {
    console.log(`[institution-icons] ${countryCode} "${name}" -> MISS`);
    return null;
  }
  console.log(
    `[institution-icons] ${countryCode} "${name}" -> "${inst.name}" (${inst.institution_id})`,
  );
  return {
    /* Plaid ships the logo as bare base64 PNG. Prefixing the data URI here
       means the client can drop it straight into a src with no knowledge of
       the encoding. */
    logo: inst.logo ? `data:image/png;base64,${inst.logo}` : null,
    color: inst.primary_color || null,
  };
}

/* A fixed set of workers pulling from one cursor, rather than chunked
   Promise.all batches: a chunk runs only as fast as its slowest member, and
   institution searches vary enough for that to matter. */
async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function buildIcons() {
  /* Flattened across both countries before the pool runs, so a short roster
     never leaves workers idle waiting on a long one. */
  const jobs = Object.entries(ROSTER).flatMap(([countryCode, names]) =>
    names.map((name) => ({ name, countryCode })),
  );

  const entries = await mapWithConcurrency(jobs, SEARCH_CONCURRENCY, async (job) => {
    try {
      return [job.name, await resolveOne(job.name, job.countryCode)];
    } catch (e) {
      /* One institution failing is not the roster failing. A name Plaid does
         not cover simply has no entry, and the tile keeps its initials. */
      console.error(`[institution-icons] ${job.countryCode} "${job.name}" failed:`, e?.message);
      return [job.name, null];
    }
  });

  const icons = {};
  for (const [name, entry] of entries) {
    /* Keyed by OUR roster name, not Plaid's, so the component looks up what
       it already knows and never has to learn Plaid's spelling. */
    if (entry) icons[name] = entry;
  }
  return icons;
}

function respond(body) {
  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
}

export async function GET() {
  const env = process.env.PLAID_ENV || 'sandbox';

  if (memo && Date.now() - memo.at < TTL_MS) {
    return respond(memo.body);
  }

  let admin = null;
  try {
    admin = getAdminClient();
    const { data } = await admin
      .from('landing_demo_cache')
      .select('payload, created_at')
      .eq('cache_key', CACHE_KEY)
      .maybeSingle();
    if (data?.payload && Date.now() - new Date(data.created_at).getTime() < TTL_MS) {
      memo = { at: new Date(data.created_at).getTime(), body: data.payload };
      return respond(data.payload);
    }
  } catch (e) {
    console.error('[institution-icons] cache read failed:', e?.message);
  }

  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    /* Not an error: a deploy without Plaid credentials renders the section
       from its own fallback, which is a complete design rather than a
       degraded one. Nothing is cached, so adding the keys takes effect on the
       next request. */
    console.error('[institution-icons] PLAID_CLIENT_ID or PLAID_SECRET missing');
    return respond({ icons: {}, env });
  }

  let icons;
  try {
    icons = await buildIcons();
  } catch (e) {
    console.error('[institution-icons] roster build threw:', e?.message);
    return respond({ icons: {}, env });
  }

  const body = { icons, env };

  /* An all-miss result is not cached: it usually means credentials or
     connectivity rather than a genuine absence of logos, and caching it for a
     week would hide the cause long after it was fixed. */
  if (admin && Object.keys(icons).length > 0) {
    try {
      const { error } = await admin
        .from('landing_demo_cache')
        .upsert({ cache_key: CACHE_KEY, payload: body, created_at: new Date().toISOString() });
      if (error) {
        console.error(
          '[institution-icons] cache write failed (apply supabase/migrations/20260921120000_landing_demo_cache.sql):',
          error.message,
        );
      } else {
        memo = { at: Date.now(), body };
      }
    } catch (e) {
      console.error('[institution-icons] cache write threw:', e?.message);
    }
  }

  return respond(body);
}
