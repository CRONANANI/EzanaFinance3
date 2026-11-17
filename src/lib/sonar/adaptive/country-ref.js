/**
 * Sonar adaptive research: the country a question is about (Nov 2026).
 * The existing resolver, plus two things it does not do: possessives ("Turkey's lira") and
 * central banks named in place of their country ("the Fed", "the ECB").
 */
import { mentionedCountry, resolveCountry } from '@/lib/sonar/landing-country';

const CENTRAL_BANKS = [
  [/\b(the fed|federal reserve|fomc)\b/i, 'United States'],
  [/\b(ecb|european central bank)\b/i, 'Eurozone'],
  [/\b(boj|bank of japan)\b/i, 'Japan'],
  [/\b(boe|bank of england)\b/i, 'United Kingdom'],
  [/\b(pboc|people’s bank of china|people's bank of china)\b/i, 'China'],
  [/\b(bank of canada)\b/i, 'Canada'],
  [/\b(rbi|reserve bank of india)\b/i, 'India'],
];

export function countryOf(question) {
  const q = String(question || '').replace(/[’']s\b/g, '');
  const direct = mentionedCountry(q);
  if (direct) return direct;
  /* The resolver leaves bare "Turkey" alone (it is also a bird). In a question about an
     economy or a currency it is the country. */
  if (
    /\bturkey\b/i.test(q) &&
    /\b(lira|econom|inflation|currency|rates?|central bank|gdp|debt|exports?)\b/i.test(q)
  )
    return resolveCountry('Turkey') || null;
  for (const [re, name] of CENTRAL_BANKS) if (re.test(q)) return resolveCountry(name) || null;
  return null;
}
