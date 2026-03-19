/**
 * US market hours: 9:30 AM – 4:00 PM ET (weekdays)
 * Returns { isOpen, message }
 */
export function getMarketStatus() {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const hour = et.getHours();
  const min = et.getMinutes();
  const mins = hour * 60 + min;

  const openMins = 9 * 60 + 30;
  const closeMins = 16 * 60 + 0;

  const isWeekend = day === 0 || day === 6;
  if (isWeekend) {
    return { isOpen: false, message: 'Market closed (weekend)' };
  }
  if (mins < openMins) {
    const h = Math.floor((openMins - mins) / 60);
    const m = (openMins - mins) % 60;
    return { isOpen: false, message: `Market opens in ${h}h ${m}m (9:30 AM ET)` };
  }
  if (mins >= closeMins) {
    return { isOpen: false, message: 'Market closed (4:00 PM ET)' };
  }
  return { isOpen: true, message: 'Market open' };
}
