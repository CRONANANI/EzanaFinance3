/**
 * The sample council's pitches, shared by Fund Analytics and the Pitch
 * Pipeline so the funnel on one page and the pipeline on the other count the
 * same pitches.
 *
 * [ticker, company, analyst, decision, days since the decision (null while
 * undecided), return since the decision, alpha].
 *
 * The first fifteen are the pitches Fund Analytics has always shown. A pitch
 * has no reading until 30 days after its decision, so GE, V and COST carry
 * none. HON was imported with no pitch on file: it is the coverage gap.
 * NVDA, LLY and CAT repeat the readings in the Command Center's digest.
 *
 * The rest are pitches still moving through the pipeline. They have no
 * decision, so on Fund Analytics they add to "Submitted" only.
 *
 * Sample content: never read from or written to the database.
 */
export const SAMPLE_PITCHES = [
  ['JPM', 'JPMorgan Chase & Co.', 'tesfaye', 'accepted', 131, 18.42, 9.61],
  ['SCHW', 'The Charles Schwab Corporation', 'tesfaye', 'accepted', 122, 11.05, 3.87],
  ['BAC', 'Bank of America Corporation', 'tesfaye', 'accepted', 113, 14.3, 6.12],
  ['LLY', 'Eli Lilly and Company', 'bekele', 'accepted', 104, 15.4, 8.11],
  ['UNH', 'UnitedHealth Group Incorporated', 'alvarez', 'accepted', 95, -8.03, -14.22],
  ['MRK', 'Merck & Co., Inc.', 'bekele', 'accepted', 86, 9.48, 1.02],
  ['NVDA', 'NVIDIA Corporation', 'rossi', 'accepted', 77, 21.9, 12.48],
  ['MSFT', 'Microsoft Corporation', 'rossi', 'accepted', 68, 7.15, -0.84],
  ['AAPL', 'Apple Inc.', 'rossi', 'accepted', 59, 5.02, -2.31],
  ['CAT', 'Caterpillar Inc.', 'weber', 'accepted', 50, 4.2, -3.26],
  ['GE', 'GE Aerospace', 'weber', 'accepted', 12, null, null],
  ['V', 'Visa Inc.', 'tesfaye', 'accepted', 5, null, null],
  ['PFE', 'Pfizer Inc.', 'bekele', 'rejected', 72, -3.1, -9.75],
  ['DE', 'Deere & Company', 'weber', 'rejected', 44, 6.84, 0.37],
  ['COST', 'Costco Wholesale Corporation', 'alvarez', null, null, null, null],
  /* Still in the pipeline. */
  ['TMO', 'Thermo Fisher Scientific Inc.', 'bekele', null, null, null, null],
  ['ETN', 'Eaton Corporation plc', 'weber', null, null, null, null],
  ['AXP', 'American Express Company', 'tesfaye', null, null, null, null],
  ['AVGO', 'Broadcom Inc.', 'rossi', null, null, null, null],
  ['GS', 'The Goldman Sachs Group, Inc.', 'tesfaye', null, null, null, null],
  ['ISRG', 'Intuitive Surgical, Inc.', 'bekele', null, null, null, null],
  ['ORCL', 'Oracle Corporation', 'rossi', null, null, null, null],
  ['LIN', 'Linde plc', 'weber', null, null, null, null],
  ['ABT', 'Abbott Laboratories', 'alvarez', null, null, null, null],
];

/* Member numbers, as the Trading Desk sample assigns them. */
export const SAMPLE_PITCH_AUTHORS = { tesfaye: 1, bekele: 2, rossi: 7, weber: 8, alvarez: 9 };
