/**
 * SAMPLE for the House financial-disclosures page — shown, clearly labeled, until
 * the ingest cron has loaded the Clerk's yearly index. Rows use the SAME shape
 * getHouseFilings() returns, so the page maps live and sample data one way. Member
 * names are illustrative sample labels, not claims about specific filings.
 */
export const HOUSE_FILINGS_SAMPLE = [
  { doc_id: '100010001', last_name: 'Pelosi', first_name: 'Nancy', suffix: null, filing_type: 'P', filing_type_label: 'Periodic Transaction Report', state_dst: 'CA11', state: 'CA', district: '11', filing_year: 2026, filing_date: '2026-05-14', pdf_url: null, is_ptr: true, is_electronic: true, trades_parsed: false },
  { doc_id: '100010002', last_name: 'Green', first_name: 'Marjorie', suffix: null, filing_type: 'P', filing_type_label: 'Periodic Transaction Report', state_dst: 'GA14', state: 'GA', district: '14', filing_year: 2026, filing_date: '2026-05-12', pdf_url: null, is_ptr: true, is_electronic: true, trades_parsed: false },
  { doc_id: '100010003', last_name: 'Khanna', first_name: 'Ro', suffix: null, filing_type: 'P', filing_type_label: 'Periodic Transaction Report', state_dst: 'CA17', state: 'CA', district: '17', filing_year: 2026, filing_date: '2026-05-09', pdf_url: null, is_ptr: true, is_electronic: true, trades_parsed: false },
  { doc_id: '100010004', last_name: 'Gottheimer', first_name: 'Josh', suffix: null, filing_type: 'A', filing_type_label: 'Annual Report', state_dst: 'NJ05', state: 'NJ', district: '05', filing_year: 2026, filing_date: '2026-05-08', pdf_url: null, is_ptr: false, is_electronic: true, trades_parsed: false },
  { doc_id: '100010005', last_name: 'McCaul', first_name: 'Michael', suffix: null, filing_type: 'P', filing_type_label: 'Periodic Transaction Report', state_dst: 'TX10', state: 'TX', district: '10', filing_year: 2026, filing_date: '2026-05-06', pdf_url: null, is_ptr: true, is_electronic: true, trades_parsed: false },
  { doc_id: '100010006', last_name: 'Crenshaw', first_name: 'Dan', suffix: null, filing_type: 'X', filing_type_label: 'Extension', state_dst: 'TX02', state: 'TX', district: '02', filing_year: 2026, filing_date: '2026-05-03', pdf_url: null, is_ptr: false, is_electronic: true, trades_parsed: false },
  { doc_id: '100010007', last_name: 'Wexton', first_name: 'Jennifer', suffix: null, filing_type: 'P', filing_type_label: 'Periodic Transaction Report', state_dst: 'VA10', state: 'VA', district: '10', filing_year: 2026, filing_date: '2026-04-29', pdf_url: null, is_ptr: true, is_electronic: true, trades_parsed: false },
  { doc_id: '100010008', last_name: 'Fallon', first_name: 'Pat', suffix: null, filing_type: 'P', filing_type_label: 'Periodic Transaction Report', state_dst: 'TX04', state: 'TX', district: '04', filing_year: 2026, filing_date: '2026-04-25', pdf_url: null, is_ptr: true, is_electronic: true, trades_parsed: false },
  { doc_id: '100010009', last_name: 'Spanberger', first_name: 'Abigail', suffix: null, filing_type: 'C', filing_type_label: 'Candidate Report', state_dst: 'VA07', state: 'VA', district: '07', filing_year: 2026, filing_date: '2026-04-21', pdf_url: null, is_ptr: false, is_electronic: true, trades_parsed: false },
  { doc_id: '100010010', last_name: 'Meuser', first_name: 'Daniel', suffix: null, filing_type: 'P', filing_type_label: 'Periodic Transaction Report', state_dst: 'PA09', state: 'PA', district: '09', filing_year: 2026, filing_date: '2026-04-17', pdf_url: null, is_ptr: true, is_electronic: true, trades_parsed: false },
];

/**
 * Illustrative parsed trades for the sample PTR rows (keyed by doc_id), so the
 * detail view is demonstrable before Phase 2 runs live. Amounts are brackets;
 * midpoints are labeled estimates only.
 */
export const HOUSE_TRADES_SAMPLE = {
  '100010001': [
    { ticker: 'NVDA', asset_name: 'NVIDIA Corp', tx_type: 'P', tx_date: '2026-05-01', notification_date: '2026-05-13', amount_low: 1000001, amount_high: 5000000, amount_midpoint: 3000000.5, amount_bracket_label: '$1,000,001 - $5,000,000' },
    { ticker: 'AAPL', asset_name: 'Apple Inc.', tx_type: 'S', tx_date: '2026-04-28', notification_date: '2026-05-13', amount_low: 250001, amount_high: 500000, amount_midpoint: 375000.5, amount_bracket_label: '$250,001 - $500,000' },
  ],
  '100010003': [
    { ticker: null, asset_name: 'US Treasury Note', tx_type: 'P', tx_date: '2026-05-02', notification_date: '2026-05-08', amount_low: 15001, amount_high: 50000, amount_midpoint: 32500.5, amount_bracket_label: '$15,001 - $50,000' },
  ],
  '100010005': [
    { ticker: 'MSFT', asset_name: 'Microsoft Corp', tx_type: 'P', tx_date: '2026-04-30', notification_date: '2026-05-05', amount_low: 15001, amount_high: 50000, amount_midpoint: 32500.5, amount_bracket_label: '$15,001 - $50,000' },
    { ticker: 'XOM', asset_name: 'Exxon Mobil Corp', tx_type: 'P', tx_date: '2026-04-27', notification_date: '2026-05-05', amount_low: 1001, amount_high: 15000, amount_midpoint: 8000.5, amount_bracket_label: '$1,001 - $15,000' },
  ],
};
