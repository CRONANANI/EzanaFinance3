/**
 * One question, one answer; the same Sonar for guests and members; the
 * industry ping's layout (Nov 2026).
 *   npm run test:sonar-parity
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { understandQuery } = await import('@/lib/sonar/understand');
const { canonicalPing } = await import('@/lib/sonar/canonical-ping');
const { evidenceBrief, pingCacheTtlSeconds } = await import('@/lib/sonar/landing-pipeline');
const { getIndustryRegistry } = await import('@/lib/sonar/industries');
const { buildIndustryDossier, industryEvidence } = await import('@/lib/sonar/landing-industry');
const { applyFilters, geoScope, orderForGeo, elsewhereLine, countryName } =
  await import('@/lib/sonar/industry-layout-model');
const { hasSessionCredentials } = await import('@/lib/sonar/guest-cookie');

const keyOf = async (q) => canonicalPing(await understandQuery(q, {}), q);

test('every phrasing of the Taiwan semiconductor layout is one question', async () => {
  const phrasings = [
    'semiconductor industry in Taiwan',
    'Give me a breakdown of the semiconductor industry in Taiwan',
    'give me a breakdown of the semiconductor industry in taiwan',
    'semiconductors in taiwan',
    'taiwan semiconductor industry',
    "Can you give me an overview of Taiwan's chip industry?",
  ];
  const keys = await Promise.all(phrasings.map(keyOf));
  assert.equal(new Set(keys.map((k) => k.key)).size, 1, keys.map((k) => k.key).join(' / '));
  for (const k of keys) {
    assert.ok(k.framingOnly);
    /* The synthesis is told the same words for all of them. */
    assert.equal(k.asked, 'Semiconductor industry in Taiwan');
  }
});

test('framing never merges different questions', async () => {
  const layout = await keyOf('semiconductor industry in Taiwan');
  const exposure = await keyOf('Which Taiwan chip makers are most exposed to China?');
  assert.notEqual(layout.key, exposure.key);
  assert.equal(exposure.framingOnly, false);
  assert.equal(exposure.asked, 'Which Taiwan chip makers are most exposed to China?');

  const pelosi = await keyOf('Nancy Pelosi');
  assert.equal((await keyOf('tell me about Nancy Pelosi')).key, pelosi.key);
  assert.notEqual((await keyOf('What has Nancy Pelosi been buying lately?')).key, pelosi.key);

  /* No entities: the words are the question, never a shared empty key. */
  const lmt = await keyOf('Lockheed Martin');
  assert.equal((await keyOf('Give me a breakdown of Lockheed Martin')).key, lmt.key);
  assert.notEqual((await keyOf('copper')).key, lmt.key);
  assert.notEqual((await keyOf('give me')).key, (await keyOf('show me')).key);
});

test('the shared ping cache has a sane TTL and can be turned off', () => {
  const prev = process.env.SONAR_PING_CACHE_TTL_S;
  delete process.env.SONAR_PING_CACHE_TTL_S;
  assert.equal(pingCacheTtlSeconds(), 1800);
  process.env.SONAR_PING_CACHE_TTL_S = '0';
  assert.equal(pingCacheTtlSeconds(), 0);
  process.env.SONAR_PING_CACHE_TTL_S = '999999';
  assert.equal(pingCacheTtlSeconds(), 86_400);
  if (prev == null) delete process.env.SONAR_PING_CACHE_TTL_S;
  else process.env.SONAR_PING_CACHE_TTL_S = prev;
});

async function taiwanDossier(q = 'semiconductor industry in Taiwan') {
  const u = await understandQuery(q, {});
  const registry = await getIndustryRegistry(null, 'semiconductors');
  return buildIndustryDossier({ registry, understood: u, admin: null });
}

test('a country ping says which registry companies are based there', async () => {
  const d = await taiwanDossier();
  assert.equal(d.geo.id, 'TW');
  const scope = geoScope(d.registry, d.geo);
  assert.deepEqual(
    scope.here.map((c) => c.ticker),
    ['TSM'],
  );
  assert.equal(scope.total, d.registry.companies.length);
  assert.equal(elsewhereLine(scope.elsewhere), `${scope.total - 1} in the United States`);
  assert.equal(countryName('TW'), 'Taiwan');
  assert.equal(orderForGeo(d.registry.companies, 'TW')[0].ticker, 'TSM');
  assert.deepEqual(
    applyFilters(d.registry, { hq: 'TW' }).companies.map((c) => c.ticker),
    ['TSM'],
  );

  const ev = industryEvidence(d);
  assert.equal(ev[0].meta.geo, 'TW');
  assert.match(ev[0].snippet, /1 is headquartered in Taiwan: Taiwan Semiconductor Manufacturing/);
  assert.ok(ev[1].meta.chain);
  assert.ok(ev.slice(2).every((it) => it.meta.stage));

  const none = industryEvidence(await taiwanDossier('semiconductor industry in Japan'));
  assert.match(none[0].snippet, /None of the \d+ listed companies .* is headquartered in Japan/);
  const bare = industryEvidence(await taiwanDossier('semiconductors'));
  assert.ok(bare[0].meta.chain, 'no country, the chain leads');
});

test('the fallback brief leads with the country line, not the registry read out', async () => {
  const d = await taiwanDossier();
  const marked = [
    ...industryEvidence(d),
    {
      corpus: 'echo',
      title: 'The Silicon Shield',
      snippet: 'One company, TSMC, produces over 90% of the most advanced chips.',
    },
  ].map((it, i) => ({ ...it, marker: `S${i + 1}` }));
  const brief = evidenceBrief('Semiconductor industry in Taiwan', marked);
  assert.match(brief, /^Of the/, 'starts with the finding, no opener');
  assert.match(brief, /TSMC, produces over 90%/);
  assert.doesNotMatch(brief, /Companies in Ezana's registry at this stage/);
  assert.ok(brief.split('\n\n').length <= 2);
});

test('a request carrying a session is never read as a guest by accident', () => {
  const req = (headers = {}, cookies = []) => ({
    headers: { get: (k) => headers[k.toLowerCase()] || null },
    cookies: { getAll: () => cookies },
  });
  assert.equal(hasSessionCredentials(req()), false);
  assert.equal(hasSessionCredentials(req({ authorization: 'Bearer abc.def' })), true);
  assert.equal(
    hasSessionCredentials(req({}, [{ name: 'sb-jhdzpadfzrhiekcfgtai-auth-token', value: 'x' }])),
    true,
  );
  assert.equal(
    hasSessionCredentials(req({}, [{ name: 'sb-jhdzpadfzrhiekcfgtai-auth-token.0', value: 'x' }])),
    true,
  );
  assert.equal(hasSessionCredentials(req({}, [{ name: 'snr_guest', value: '2.sig' }])), false);
});

/* Nov 2026: /sonar and /datasets run one Sonar, and the research view keeps
   Sonar's dark, unfilled look in either app theme. */
test('/sonar and /datasets render the same Sonar', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  const app = read('src/app/(dashboard)/sonar/page.js');
  const datasets = read('src/app/datasets/page.js');
  assert.match(app, /<DatasetsSonarIndex[^>]*stage="app"/);
  assert.match(datasets, /<DatasetsSonarIndex/);
  const index = read('src/app/datasets/DatasetsSonarIndex.jsx');
  assert.match(index, /<SonarExperience\s+variant="datasets"/);
  /* The only difference allowed is the link base and the hand-off class. */
  const exp = read('src/components/sonar/SonarExperience.jsx');
  assert.equal((exp.match(/stage === 'app'/g) || []).length, 1);
});

test('the research view is dark and unfilled in light mode too', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
  const jsx = read('src/components/sonar/DeepResearch.jsx');
  assert.equal((jsx.match(/className="sdr-run force-dark-theme"/g) || []).length, 2);
  const css = read('src/components/sonar/deep-research.css');
  for (const sel of ['.sdr-run-bar {', '.sdr-gate {', '.sdr-report {']) {
    const block = css.slice(css.indexOf(sel), css.indexOf('}', css.indexOf(sel)));
    assert.match(block, /background: transparent;/, sel);
  }
  const light = read('src/app/light-mode.css');
  assert.match(light, /body\.light-mode p:where\(:not\(\.force-dark-theme \*\)\)/);
  assert.doesNotMatch(light, /^body\.light-mode p \{/m);
});
