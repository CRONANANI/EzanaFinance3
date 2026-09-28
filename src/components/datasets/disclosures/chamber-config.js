/**
 * The only thing that differs between the two disclosure pages.
 *
 * One implementation serves both chambers (see DisclosuresPage). Everything
 * chamber-specific lives here, so the layout never branches on `chamber` ,
 * if a difference cannot be expressed as a value in this file, it does not
 * belong in the page.
 *
 * Source of truth for the design: docs/design/house-handoff/.
 */

export const HOUSE = {
  chamber: 'house',
  title: 'House financial disclosures',
  eyebrow: 'DATASETS · HOUSE CLERK',
  source: {
    name: 'Clerk of the U.S. House',
    /* Where a row's source document lives. The House serves PDFs; the Senate
       serves an eFD page, which is why this is a builder and not a template
       string with a .pdf on the end. */
    docLabel: 'Open source filing',
  },
  routes: {
    page: '/datasets/house/disclosures',
    member: '/datasets/house/members',
  },
  /* 2008 is the first index year; PTRs only exist from 2012, when the STOCK
     Act created them. The coverage tab states both. */
  coverage: { firstYear: 2008, ptrsFrom: 2012 },
  /* The filing index, not house.trades: that table is bound but empty, and
     a query bar must open on something that can answer. */
  builderDataset: 'house.filings',
  /* A House member represents a district; the panel and the table render
     `D-CA-12`. Senators represent a state, so that segment is dropped. */
  hasDistrict: true,
  /* Older House filings are scanned images whose trades await OCR. The Senate
     files structured electronic forms, so that chamber has no pending state
     to render. */
  hasScannedFilings: true,
  compliance:
    'Disclosures are public records, shown as filed with the Clerk of the U.S. House. Amounts are the ranges members disclose. Nothing here is investment advice.',
  lagNote:
    'Lag is days from transaction to filing; the law allows 45. Every row links to the original PDF at the Clerk of the House.',
};

export const SENATE = {
  chamber: 'senate',
  title: 'Senate financial disclosures',
  eyebrow: 'DATASETS · SENATE OPR',
  source: {
    name: 'Senate Office of Public Records',
    docLabel: 'Open source filing',
  },
  routes: {
    page: '/datasets/senate/disclosures',
    member: '/datasets/senate/members',
  },
  coverage: { firstYear: 2012, ptrsFrom: 2012 },
  /* Nothing Senate-side is live yet, so the bar opens cross-dataset. */
  builderDataset: null,
  hasDistrict: false,
  hasScannedFilings: false,
  compliance:
    'Disclosures are public records, shown as filed with the Senate Office of Public Records. Amounts are the ranges members disclose. Nothing here is investment advice.',
  lagNote:
    'Lag is days from transaction to filing; the law allows 45. Every row links to the original filing at the Senate Office of Public Records.',
};

export const CHAMBERS = { house: HOUSE, senate: SENATE };
