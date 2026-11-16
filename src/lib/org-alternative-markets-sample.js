/**
 * Sample content for the council cards of Alternative Markets
 * (/alternative-markets).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/alternative-markets/sample, so the page can be presented from
 * a council with little activity. Real councils never receive it, the page
 * labels it "Sample content" while it shows, and nothing done to it is saved
 * (the cards have no write actions; links go to the council's own pages).
 *
 * It is the same sample council every rebuilt Team Hub page shows. The
 * member directory, documents, meetings and standing come from the Global
 * Market Analysis sample (itself assembled from the Research Library,
 * Meetings and Council Rankings samples); the book, teams, coverage and
 * policy rules come from the US Equities sample, which the page already
 * loads. On top of that sit a few documents and pitches on crypto and
 * commodities, written by the same invented members, so the research and
 * pitch cards have something to show. Every name is invented.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildGlobalMarketSample } from './org-global-market-sample.js';

const DAY = 86400000;
const user = (n) => `sample-user-${String(n).padStart(3, '0')}`;
const member = (n) => `sample-member-${String(n).padStart(3, '0')}`;

/* [n, type, title, author (sample person number), days ago, tags, ticker] */
const ALT_DOCS = [
  [1, 'primer', 'Bitcoin network primer', 3, 19, ['primer', 'crypto', 'bitcoin'], null],
  [2, 'note', 'Digital asset risk memo', 1, 47, ['crypto', 'risk'], null],
  [3, 'reading', 'Stablecoins and bank deposits', 8, 60, ['crypto', 'banks'], null],
  [4, 'primer', 'Commodity supercycle notes', 9, 33, ['primer', 'commodities'], null],
  [5, 'note', 'Gold miners against bullion', 7, 25, ['gold', 'miners'], 'GDX'],
  [6, 'reading', 'Reading list: the OPEC meeting', 6, 12, ['oil', 'opec'], null],
];

/* [n, ticker, company, stage, analyst (sample person number), days ago, thesis] */
const ALT_PITCHES = [
  [
    1,
    'IBIT',
    'Spot bitcoin fund',
    'deep_dive',
    9,
    6,
    'A spot bitcoin fund as a small, policy-checked teaching position.',
  ],
  [2, 'COIN', 'Crypto exchange operator', 'screening', 2, 15, 'Exchange volumes and custody fees.'],
  [3, 'GDX', 'Gold miners basket', 'deep_dive', 7, 9, 'Gold miners against bullion.'],
  [4, 'DBC', 'Broad commodity index fund', 'screening', 6, 21, 'A diversified commodity sleeve.'],
];

const NAMES = {
  1: 'Amara Tesfaye',
  2: 'Mikael Bekele',
  3: 'Selam Haile',
  6: 'Daniel Park',
  7: 'Elena Rossi',
  8: 'Jonas Weber',
  9: 'Tomas Alvarez',
};

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildAlternativeMarketsSample(viewer) {
  const now = viewer.now ?? Date.now();
  const base = buildGlobalMarketSample({ ...viewer, now });
  const iso = (days) => new Date(now - days * DAY).toISOString();

  const altNotes = ALT_DOCS.map(([n, type, title, by, days, tags, ticker]) => ({
    id: `sample-doc-alt-${n}`,
    title,
    doc_type: type,
    status: 'published',
    sector: null,
    tags,
    ticker,
    author_id: user(by),
    created_at: iso(days),
    published_at: iso(days),
    is_demo: true,
  }));

  const pitches = ALT_PITCHES.map(([n, ticker, company, stage, by, days, thesis]) => ({
    id: `sample-pitch-alt-${n}`,
    ticker,
    company_name: company,
    stage,
    status: 'active',
    decision: null,
    analyst_member_id: member(by),
    analyst_name: NAMES[by] || null,
    expected_return_pct: null,
    thesis_short: thesis,
    created_at: iso(days),
    archived_at: null,
    is_demo: true,
  }));

  return {
    is_demo: true,
    now,
    viewer: base.viewer,
    members: base.members,
    notes: [...base.notes, ...altNotes],
    meetings: base.meetings,
    standing: base.standing,
    pitches,
  };
}
