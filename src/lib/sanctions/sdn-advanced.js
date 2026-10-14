/**
 * A streaming reader for OFAC's SDN_ADVANCED.XML that keeps one thing: the
 * date each sanctions entry was published. The file is large (most of it is
 * the DistinctParties section, which this reader skips), so text is fed in
 * chunks and only complete <SanctionsEntry> blocks are ever held.
 *
 * In the advanced schema each entry looks like
 *   <SanctionsEntry ID="..." ProfileID="36" ListID="...">
 *     <EntryEvent ID="..." EntryEventTypeID="...">
 *       <Date CalendarTypeID="..."><Year>1995</Year><Month>1</Month><Day>24</Day></Date>
 *     ...
 * ProfileID is the DistinctParty FixedRef, which is the legacy ent_num in
 * SDN.CSV. An entry can carry several EntryEvents (amendments); the earliest
 * date is its listing date. The caller validates the ProfileID to ent_num
 * match rate before writing anything, so a schema change cannot write junk.
 */
const OPEN = '<SanctionsEntry';
const CLOSE = '</SanctionsEntry>';
const PROFILE_RE = /\bProfileID="(\d+)"/;
const EVENT_RE = /<EntryEvent\b[\s\S]*?<\/EntryEvent>/g;
const PART = (tag) => new RegExp(`<${tag}>\\s*(\\d+)\\s*</${tag}>`);
const YEAR = PART('Year');
const MONTH = PART('Month');
const DAY = PART('Day');

const pad = (n) => String(n).padStart(2, '0');

/** The earliest valid EntryEvent date in one entry block, as YYYY-MM-DD. */
export function entryDate(block) {
  let best = null;
  for (const ev of String(block).match(EVENT_RE) || []) {
    const y = Number(ev.match(YEAR)?.[1]);
    const m = Number(ev.match(MONTH)?.[1]);
    const d = Number(ev.match(DAY)?.[1]);
    if (!(y >= 1950 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) continue;
    const iso = `${y}-${pad(m)}-${pad(d)}`;
    if (!best || iso < best) best = iso;
  }
  return best;
}

/** push(text) as chunks arrive, then dates: Map<ent_num, 'YYYY-MM-DD'>. */
export function createEntryDateReader() {
  const dates = new Map();
  let buf = '';
  let entries = 0;
  const drain = () => {
    for (;;) {
      const a = buf.indexOf(OPEN);
      if (a < 0) {
        /* Nothing open: keep only a tail long enough to hold a split tag. */
        buf = buf.slice(-OPEN.length);
        return;
      }
      const b = buf.indexOf(CLOSE, a);
      if (b < 0) {
        buf = buf.slice(a);
        return;
      }
      const block = buf.slice(a, b + CLOSE.length);
      buf = buf.slice(b + CLOSE.length);
      entries += 1;
      const ent = Number(block.match(PROFILE_RE)?.[1]);
      const date = entryDate(block);
      if (Number.isInteger(ent) && ent > 0 && date) {
        const prev = dates.get(ent);
        if (!prev || date < prev) dates.set(ent, date);
      }
    }
  };
  return {
    push(text) {
      buf += text;
      drain();
    },
    get dates() {
      return dates;
    },
    get entries() {
      return entries;
    },
  };
}
