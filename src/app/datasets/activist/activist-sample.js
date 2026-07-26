/**
 * Representative SAMPLE data for the public Activist (13D / 13G) dataset page.
 * Static, illustrative schedule filings (shape: filer, ticker, subject, form,
 * percent, date). NOT live data — labeled as a sample on the page, which links
 * into the app for the full feed. Real investor names are used only as sample
 * labels, not as claims about current stakes.
 */

export const ACTIVIST_SAMPLE = [
  { id: 'a1', filer: 'Elliott Management', ticker: 'HON', subject: 'Honeywell International', form: 'SC 13D', percent: '5.4%', date: '2026-06-18' },
  { id: 'a2', filer: 'Starboard Value', ticker: 'PFE', subject: 'Pfizer Inc', form: 'SC 13D', percent: '6.1%', date: '2026-06-12' },
  { id: 'a3', filer: 'Vanguard Group', ticker: 'CSCO', subject: 'Cisco Systems', form: 'SC 13G', percent: '8.9%', date: '2026-06-10' },
  { id: 'a4', filer: 'Trian Fund Management', ticker: 'DIS', subject: 'Walt Disney Co', form: 'SC 13D', percent: '5.0%', date: '2026-06-05' },
  { id: 'a5', filer: 'BlackRock', ticker: 'XOM', subject: 'Exxon Mobil Corp', form: 'SC 13G', percent: '7.2%', date: '2026-06-03' },
  { id: 'a6', filer: 'ValueAct Capital', ticker: 'SEDG', subject: 'SolarEdge Technologies', form: 'SC 13D', percent: '9.3%', date: '2026-05-29' },
  { id: 'a7', filer: 'State Street', ticker: 'KO', subject: 'Coca-Cola Co', form: 'SC 13G', percent: '6.8%', date: '2026-05-27' },
];

export const TOP_ACTIVIST_STAKES = [
  { name: 'ValueAct', meta: 'SEDG · 13D', value: '9.3%', tone: 'pos' },
  { name: 'Vanguard', meta: 'CSCO · 13G', value: '8.9%', tone: 'neutral' },
  { name: 'Starboard', meta: 'PFE · 13D', value: '6.1%', tone: 'pos' },
];
