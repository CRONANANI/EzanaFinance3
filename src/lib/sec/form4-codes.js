/* Client-safe (no XML parser): Form 4 transaction codes in plain words. */

/** Plain-words legend for transaction codes. */
export const TRANSACTION_CODES = {
  P: 'Open-market or private purchase',
  S: 'Open-market or private sale',
  A: 'Grant or award from the company',
  M: 'Exercise or conversion of a derivative',
  F: 'Shares withheld to pay tax or exercise price',
  G: 'Gift',
  C: 'Conversion of a derivative',
  D: 'Sale back to the company',
  X: 'Exercise of an in-the-money derivative',
  J: 'Other acquisition or disposition',
};
