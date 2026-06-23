/**
 * Representative SAMPLE data for the public Government Activity dataset page.
 * Static, illustrative federal contract awards keyed to public companies. NOT
 * live data — the page labels it as a sample and links into the app for the
 * full feed. Field shape mirrors the contract-award schema (recipient, agency,
 * ticker, amount, award date).
 */

export const CONTRACT_AWARDS_SAMPLE = [
  {
    id: 'g1',
    recipient: 'Palantir Technologies',
    agency: 'Department of Agriculture',
    ticker: 'PLTR',
    amount: '$27.0M',
    date: '2026-06-09',
  },
  {
    id: 'g2',
    recipient: 'Lockheed Martin',
    agency: 'Department of Defense',
    ticker: 'LMT',
    amount: '$1.24B',
    date: '2026-06-05',
  },
  {
    id: 'g3',
    recipient: 'RTX Corporation',
    agency: 'Department of Defense',
    ticker: 'RTX',
    amount: '$842.0M',
    date: '2026-06-02',
  },
  {
    id: 'g4',
    recipient: 'Leidos Holdings',
    agency: 'Dept. of Homeland Security',
    ticker: 'LDOS',
    amount: '$318.5M',
    date: '2026-05-28',
  },
  {
    id: 'g5',
    recipient: 'General Dynamics',
    agency: 'Department of the Navy',
    ticker: 'GD',
    amount: '$596.2M',
    date: '2026-05-22',
  },
  {
    id: 'g6',
    recipient: 'Booz Allen Hamilton',
    agency: 'Health & Human Services',
    ticker: 'BAH',
    amount: '$74.8M',
    date: '2026-05-18',
  },
  {
    id: 'g7',
    recipient: 'The Boeing Company',
    agency: 'Department of the Air Force',
    ticker: 'BA',
    amount: '$2.10B',
    date: '2026-05-14',
  },
  {
    id: 'g8',
    recipient: 'Northrop Grumman',
    agency: 'Space Force',
    ticker: 'NOC',
    amount: '$910.0M',
    date: '2026-05-09',
  },
  {
    id: 'g9',
    recipient: 'Science Applications Intl',
    agency: 'Department of State',
    ticker: 'SAIC',
    amount: '$129.3M',
    date: '2026-05-04',
  },
  {
    id: 'g10',
    recipient: 'Amazon Web Services',
    agency: 'Central Intelligence Agency',
    ticker: 'AMZN',
    amount: '$455.0M',
    date: '2026-04-29',
  },
  {
    id: 'g11',
    recipient: 'Microsoft Corporation',
    agency: 'Department of Defense',
    ticker: 'MSFT',
    amount: '$383.7M',
    date: '2026-04-24',
  },
  {
    id: 'g12',
    recipient: 'Caterpillar Inc.',
    agency: 'Army Corps of Engineers',
    ticker: 'CAT',
    amount: '$61.9M',
    date: '2026-04-20',
  },
];

/** Sample top recipients this quarter (by total award value). */
export const TOP_RECIPIENTS = [
  { name: 'The Boeing Company', meta: 'BA · Air Force', value: '$3.4B' },
  { name: 'Lockheed Martin', meta: 'LMT · Defense', value: '$2.9B' },
  { name: 'RTX Corporation', meta: 'RTX · Defense', value: '$1.8B' },
  { name: 'Northrop Grumman', meta: 'NOC · Space Force', value: '$1.2B' },
  { name: 'Amazon Web Services', meta: 'AMZN · Intelligence', value: '$0.9B' },
];
