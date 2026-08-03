/**
 * PLACEHOLDER sample rows for the OECD Macro dataset page.
 *
 * ⚠️ This is NOT real OECD data. It exists so the page renders with correct
 * structure while the real series are uploaded. Values are illustrative and
 * intentionally round. Replace wholesale with real OECD SDMX output — keep the
 * shape below and the page needs no changes.
 *
 * Target real source: OECD SDMX-JSON API (CC BY 4.0 — attribution required).
 * Row shape matches one country × one reference period, per indicator family.
 */

// Headline callout cards — { name, meta, value, tone }
export const OECD_HIGHLIGHTS = [
  { name: 'Canada CLI', meta: 'Composite Leading Indicator · placeholder', value: '100.4', tone: 'pos' },
  { name: 'OECD area CLI', meta: 'Composite Leading Indicator · placeholder', value: '100.1', tone: 'pos' },
  { name: 'OECD area CPI (YoY)', meta: 'Consumer prices · placeholder', value: '3.0%' },
  { name: 'OECD area unemployment', meta: 'Harmonised rate · placeholder', value: '4.9%' },
];

// Main table rows
export const OECD_INDICATORS = [
  {
    country: 'Canada',
    iso: 'CAN',
    indicator: 'Composite Leading Indicator',
    value: '100.4',
    change: '+0.2',
    positive: true,
    period: 'Placeholder',
  },
  {
    country: 'Canada',
    iso: 'CAN',
    indicator: 'CPI (YoY %)',
    value: '2.9',
    change: '-0.1',
    positive: false,
    period: 'Placeholder',
  },
  {
    country: 'United States',
    iso: 'USA',
    indicator: 'Composite Leading Indicator',
    value: '100.2',
    change: '+0.1',
    positive: true,
    period: 'Placeholder',
  },
  {
    country: 'United States',
    iso: 'USA',
    indicator: 'Unemployment Rate (%)',
    value: '4.0',
    change: '0.0',
    positive: true,
    period: 'Placeholder',
  },
  {
    country: 'United Kingdom',
    iso: 'GBR',
    indicator: 'Composite Leading Indicator',
    value: '99.8',
    change: '-0.2',
    positive: false,
    period: 'Placeholder',
  },
  {
    country: 'Germany',
    iso: 'DEU',
    indicator: 'GDP Growth (QoQ %)',
    value: '0.3',
    change: '+0.1',
    positive: true,
    period: 'Placeholder',
  },
  {
    country: 'Japan',
    iso: 'JPN',
    indicator: 'Policy Rate (%)',
    value: '0.5',
    change: '+0.25',
    positive: true,
    period: 'Placeholder',
  },
  {
    country: 'France',
    iso: 'FRA',
    indicator: 'CPI (YoY %)',
    value: '2.6',
    change: '-0.2',
    positive: false,
    period: 'Placeholder',
  },
  {
    country: 'Australia',
    iso: 'AUS',
    indicator: 'Composite Leading Indicator',
    value: '100.6',
    change: '+0.3',
    positive: true,
    period: 'Placeholder',
  },
  {
    country: 'OECD Total',
    iso: 'OECD',
    indicator: 'Composite Leading Indicator',
    value: '100.1',
    change: '+0.1',
    positive: true,
    period: 'Placeholder',
  },
];
