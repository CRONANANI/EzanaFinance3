'use client';

/* A tear-off calendar: month band on top, the day large beneath, the
   weekday small. The day flips (rotateX) when it changes; the month band
   flips when the month changes. Decorative mirror of the chart's date;
   the date itself is announced through the chart readout.

   `date` is null until the section knows the visitor's local "today" (after
   mount: the server cannot know it), so the first paint is an empty shell of
   the same size, and the first real date lands without a flip. The flip is
   keyed on the date itself, so it costs no extra render, and a fast scroll
   that jumps several days flips once, straight to the final date. */
import { useEffect, useRef } from 'react';

const fmtMonth = new Intl.DateTimeFormat(undefined, { month: 'short' });
const fmtWeekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const NBSP = ' ';

export default function SocialFlipCalendar({ date, still = false }) {
  /* Has a real date been painted yet? Only later dates flip. */
  const shownRef = useRef(false);
  useEffect(() => {
    if (date) shownRef.current = true;
  }, [date]);
  const flip = !still && shownRef.current ? ' is-flip' : '';

  return (
    <div className="sled-cal" aria-hidden="true">
      <span
        key={date ? `m${date.getFullYear()}-${date.getMonth()}` : 'm'}
        className={`sled-cal-month${flip}`}
      >
        {date ? fmtMonth.format(date).toUpperCase() : NBSP}
      </span>
      <span key={date ? `d${date.getTime()}` : 'd'} className={`sled-cal-day${flip}`}>
        {date ? date.getDate() : NBSP}
      </span>
      <span className="sled-cal-wd">{date ? fmtWeekday.format(date) : NBSP}</span>
    </div>
  );
}
