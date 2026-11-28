/** EDGAR address and incorporation codes (Sonar 6.4 hardening). */

/* EDGAR state/country codes: US states and territories, and Canada's provinces (A0-B0).
   Other codes are foreign countries; they are stored raw and mapped to no country here. */
const US_CODES = new Set(
  'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR VI GU AS MP'.split(
    ' ',
  ),
);
const CA_CODES = new Set('A0 A1 A2 A3 A4 A5 A6 A7 A8 A9 B0'.split(' '));
export function edgarCountry(code) {
  const c = String(code || '').toUpperCase();
  if (US_CODES.has(c)) return 'US';
  if (CA_CODES.has(c)) return 'CA';
  return null;
}
