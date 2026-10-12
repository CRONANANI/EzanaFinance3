/**
 * Global Empire Lighthouse series definitions, shared by the ingest crons and
 * the hub. World Bank ids are WDI codes; labels and units follow the World
 * Bank's own definitions.
 */
export const WB_INDICATORS = [
  { id: 'NY.GDP.MKTP.KD.ZG', label: 'Real GDP growth', unit: '% a year' },
  { id: 'FP.CPI.TOTL.ZG', label: 'Inflation (consumer prices)', unit: '% a year' },
  { id: 'SL.UEM.TOTL.ZS', label: 'Unemployment', unit: '% of labor force' },
  { id: 'BN.CAB.XOKA.GD.ZS', label: 'Current account balance', unit: '% of GDP' },
  { id: 'GC.DOD.TOTL.GD.ZS', label: 'Central government debt', unit: '% of GDP' },
  { id: 'NE.EXP.GNFS.ZS', label: 'Exports of goods and services', unit: '% of GDP' },
  { id: 'NY.GDP.PCAP.CD', label: 'GDP per capita', unit: 'current US$' },
  { id: 'FI.RES.TOTL.CD', label: 'Total reserves', unit: 'current US$' },
];

export const WB_BY_ID = Object.fromEntries(WB_INDICATORS.map((i) => [i.id, i]));

/* The three rate series compared year over year on the hub. */
export const WB_MOVE_IDS = ['NY.GDP.MKTP.KD.ZG', 'FP.CPI.TOTL.ZG', 'SL.UEM.TOTL.ZS'];

export const WB_FROM_YEAR = 2000;
