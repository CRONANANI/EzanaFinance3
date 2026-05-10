/**
 * Demo hero numbers for /home-dashboard when no brokerage is connected.
 * Current Value uses summary.totalValue from /api/plaid/holdings when connected.
 */
export const HERO_DATA = {
  '1D': { value: 220360.0, change: 4.9, changeDollar: 10297.64, companies: 26, cash: 10250, committed: 7000 },
  '7D': { value: 221200.0, change: 5.4, changeDollar: 11320.0, companies: 26, cash: 10250, committed: 7000 },
  '1M': { value: 224800.0, change: 7.2, changeDollar: 15068.0, companies: 26, cash: 10250, committed: 7000 },
  '3M': { value: 232000.0, change: 10.8, changeDollar: 22560.0, companies: 26, cash: 11000, committed: 6800 },
  '6M': { value: 248500.0, change: 18.6, changeDollar: 39012.0, companies: 26, cash: 12400, committed: 5200 },
  '1Y': { value: 278900.0, change: 34.1, changeDollar: 71040.0, companies: 26, cash: 14800, committed: 4500 },
  ALL: { value: 295000.0, change: 42.0, changeDollar: 87200.0, companies: 26, cash: 15000, committed: 4000 },
};
