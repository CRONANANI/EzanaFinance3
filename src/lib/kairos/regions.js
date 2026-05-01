/**
 * Kairos region configuration — mirrors REGIONS in kairos-signal/page.js.
 */

export const KAIROS_REGIONS = [
  {
    id: 'us-midwest',
    label: 'U.S. Midwest',
    lat: 41.5,
    lon: -89.0,
    commodities: ['ZC=F', 'ZS=F'],
  },
  {
    id: 'brazil-south',
    label: 'Brazil (South)',
    lat: -23.5,
    lon: -49.0,
    commodities: ['ZS=F', 'KC=F'],
  },
  {
    id: 'ukraine',
    label: 'Ukraine',
    lat: 49.0,
    lon: 32.0,
    commodities: ['ZW=F'],
  },
  {
    id: 'gulf',
    label: 'Gulf of Mexico',
    lat: 28.0,
    lon: -90.0,
    commodities: ['CL=F', 'NG=F'],
  },
  {
    id: 'west-africa',
    label: 'West Africa',
    lat: 7.0,
    lon: -5.0,
    commodities: ['CC=F'],
  },
  {
    id: 'india',
    label: 'India (Central)',
    lat: 23.0,
    lon: 79.0,
    commodities: ['ZS=F'],
  },
];

export const WEATHER_VARIABLES = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'windspeed_10m_max',
  'shortwave_radiation_sum',
];

export const LOOKAHEAD_WINDOWS = [30, 60, 90];

export const HISTORY_WINDOW = '5y';
