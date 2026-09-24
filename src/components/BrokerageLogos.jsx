/**
 * BrokerageLogos — "Connect your bank or brokerage" section.
 *
 * Two country groups, Canada and the United States, twenty institutions each
 * under a small inline flag. Five are on screen per row; the other fifteen
 * wait in the wings.
 *
 * ONE randomizer drives both rows. Every 2.4s it draws a single position out
 * of all ten and flips it, so the section has no alternation and no phase
 * offset: the same row can flip twice running, which is what makes it read as
 * one surface rather than two loops that happen to share a page.
 *
 * A flip is atomic. The `is-flipping` class sits on the wrapper around both
 * the mark and the label, and the content swap fires at the 90 degree edge, so
 * the outgoing bank's logo and name leave together and the incoming bank's
 * arrive together. A tile never shows one bank's logo over another's name.
 *
 * Icons are Plaid-first. /api/landing/institution-icons resolves the roster by
 * name and returns marks as data URIs. Rotation draws only from institutions
 * whose mark actually resolved, so a flip can never land on the initials
 * fallback: the destination is always a real logo, already decoded, with no
 * network in the path. Initials survive in exactly three places, all of them
 * before or outside the rotation: the server paint, the moment before the
 * icons request answers, and a row where Plaid resolved fewer than five marks
 * and there is genuinely nothing else to show.
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BrokerageTradeInfo } from '@/components/landing/BrokerageTradeInfo';
import './brokerage-logos.css';

/* `label` is what the tile shows. The full name is what Plaid is searched by
   and what the icons map is keyed on, so the two must not be conflated: the
   tile label is a single line that must not wrap, while the search needs the
   institution's real name to resolve. */
const GROUPS = [
  {
    code: 'CA',
    label: 'Canada',
    institutions: [
      { name: 'Royal Bank of Canada', label: 'RBC' },
      { name: 'TD Canada Trust', label: 'TD' },
      { name: 'Bank of Montreal', label: 'BMO' },
      { name: 'Scotiabank', label: 'Scotiabank' },
      { name: 'CIBC', label: 'CIBC' },
      { name: 'National Bank of Canada', label: 'National Bank' },
      { name: 'Desjardins', label: 'Desjardins' },
      { name: 'Tangerine', label: 'Tangerine' },
      { name: 'Simplii Financial', label: 'Simplii' },
      { name: 'EQ Bank', label: 'EQ Bank' },
      { name: 'Laurentian Bank', label: 'Laurentian' },
      { name: 'ATB Financial', label: 'ATB' },
      { name: 'Manulife Bank', label: 'Manulife' },
      { name: 'Vancity', label: 'Vancity' },
      { name: 'Coast Capital Savings', label: 'Coast Capital' },
      { name: 'Meridian Credit Union', label: 'Meridian' },
      { name: 'Wealthsimple', label: 'Wealthsimple' },
      { name: 'Questrade', label: 'Questrade' },
      { name: "President's Choice Financial", label: 'PC Financial' },
      { name: 'Canadian Western Bank', label: 'CWB' },
    ],
  },
  {
    code: 'US',
    label: 'United States',
    institutions: [
      { name: 'Chase', label: 'Chase' },
      { name: 'Bank of America', label: 'Bank of America' },
      { name: 'Wells Fargo', label: 'Wells Fargo' },
      { name: 'Citibank', label: 'Citibank' },
      { name: 'Capital One', label: 'Capital One' },
      { name: 'U.S. Bank', label: 'U.S. Bank' },
      { name: 'PNC Bank', label: 'PNC' },
      { name: 'Truist', label: 'Truist' },
      { name: 'TD Bank', label: 'TD Bank' },
      { name: 'American Express', label: 'Amex' },
      { name: 'Charles Schwab', label: 'Schwab' },
      { name: 'Fidelity', label: 'Fidelity' },
      { name: 'Ally Bank', label: 'Ally' },
      { name: 'Discover Bank', label: 'Discover' },
      { name: 'Citizens Bank', label: 'Citizens' },
      { name: 'Fifth Third Bank', label: 'Fifth Third' },
      { name: 'KeyBank', label: 'KeyBank' },
      { name: 'Regions Bank', label: 'Regions' },
      { name: 'USAA', label: 'USAA' },
      { name: 'SoFi', label: 'SoFi' },
    ],
  },
];

/* Hand-set rather than derived, because the useful initials for a bank are
   almost never its first letters: "Royal Bank of Canada" is RBC, not RBO, and
   "Canadian Imperial Bank of Commerce" is CIBC. Anything not listed falls back
   to first letters, which is right for the plain one-word names. */
const INITIALS = {
  'Royal Bank of Canada': 'RBC',
  'TD Canada Trust': 'TD',
  'Bank of Montreal': 'BMO',
  Scotiabank: 'SB',
  CIBC: 'CIBC',
  'National Bank of Canada': 'NBC',
  Desjardins: 'DJ',
  Tangerine: 'TG',
  'Simplii Financial': 'SF',
  Chase: 'CH',
  'Bank of America': 'BA',
  'Wells Fargo': 'WF',
  'Capital One': 'C1',
  Citibank: 'CB',
  'U.S. Bank': 'USB',
  'EQ Bank': 'EQ',
  'Laurentian Bank': 'LB',
  'ATB Financial': 'ATB',
  'Manulife Bank': 'ML',
  Vancity: 'VC',
  'Coast Capital Savings': 'CC',
  'Meridian Credit Union': 'MCU',
  Wealthsimple: 'WS',
  Questrade: 'QT',
  "President's Choice Financial": 'PC',
  'Canadian Western Bank': 'CWB',
  'PNC Bank': 'PNC',
  Truist: 'TR',
  'TD Bank': 'TD',
  'American Express': 'AMEX',
  'Charles Schwab': 'CS',
  Fidelity: 'FID',
  'Ally Bank': 'ALLY',
  'Discover Bank': 'DISC',
  'Citizens Bank': 'CZ',
  'Fifth Third Bank': '53',
  KeyBank: 'KEY',
  'Regions Bank': 'RG',
  USAA: 'USAA',
  SoFi: 'SOFI',
};

function initialsFor(name) {
  if (INITIALS[name]) return INITIALS[name];
  return name
    .split(/\s+/)
    .filter((w) => !/^(of|the|and)$/i.test(w))
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/* Flags are inline SVG, not image files: two shapes at 20x14 are smaller as
   markup than as a request, they inherit nothing from the theme so they read
   the same in both, and there is no broken-image state to design around.
   The colours are the flags' own, not theme values, which is why they are
   literals here. The branding guard's no-raw-hex rule scans stylesheets, so
   this needs no exemption, but the reason is the same either way: a flag
   painted in brand tokens is not that flag. */
function FlagCA() {
  return (
    <svg
      className="bl-flag"
      width="20"
      height="14"
      viewBox="0 0 20 14"
      role="img"
      aria-hidden="true"
    >
      <rect width="20" height="14" fill="#ffffff" />
      <rect width="5" height="14" fill="#d52b1e" />
      <rect x="15" width="5" height="14" fill="#d52b1e" />
      {/* Simplified maple leaf: recognizable at 14px, where the eleven true
          points and the stem serifs are below a pixel each. */}
      <path
        d="M10 2.6l.8 1.9 1.6-.5-.5 1.7 1.6.5-1.9 1.3.4 1-2-.4.1 2.4h-.2l.1-2.4-2 .4.4-1L6.5 6.2l1.6-.5-.5-1.7 1.6.5z"
        fill="#d52b1e"
      />
    </svg>
  );
}

function FlagUS() {
  return (
    <svg
      className="bl-flag"
      width="20"
      height="14"
      viewBox="0 0 20 14"
      role="img"
      aria-hidden="true"
    >
      <rect width="20" height="14" fill="#ffffff" />
      {/* Seven red stripes at 13 stripes over 14px. The canton is solid blue:
          fifty stars at this size is noise, not detail. */}
      {[0, 2, 4, 6, 8, 10, 12].map((y) => (
        <rect key={y} y={y} width="20" height="1.08" fill="#b22234" />
      ))}
      <rect width="8" height="7.54" fill="#3c3b6e" />
    </svg>
  );
}

const FLAGS = { CA: FlagCA, US: FlagUS };

function LogoTile({ institution, icon }) {
  const [failed, setFailed] = useState(false);
  const showPlaid = Boolean(icon?.logo) && !failed;

  return (
    <div className="bl-logo-item" title={institution.name}>
      <div className="bl-logo-slot">
        {showPlaid ? (
          /* A plain img, not next/image: a data URI has nothing for the
             optimizer to fetch, resize or cache, so routing it through
             /_next/image would only add a round trip. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={icon.logo}
            alt=""
            width={56}
            height={56}
            className="bl-logo-img bl-logo-img--mark"
            onError={() => setFailed(true)}
            loading="lazy"
          />
        ) : (
          <span
            className="bl-initials"
            aria-hidden="true"
            /* Plaid's primary_color is the institution's own brand colour, so
               a light wash of it makes an initials tile read as that bank
               rather than as a placeholder. Only applied when Plaid supplied
               one; otherwise the neutral card surface stands. */
            style={
              icon?.color
                ? { background: `color-mix(in srgb, ${icon.color} 18%, var(--bg-secondary))` }
                : undefined
            }
          >
            {initialsFor(institution.name)}
          </span>
        )}
      </div>
      <span className="bl-logo-label">{institution.label}</span>
    </div>
  );
}

const VISIBLE_SLOTS = 5; // per country row
/* One randomizer over both rows: a tick draws a position out of all ten, so
   the same row can flip twice running. That absence of a guarantee is the
   point; alternating rows reads as two loops sharing a page. */
const TOTAL_SLOTS = VISIBLE_SLOTS * 2;
const FLIP_EVERY_MS = 2400;
const FLIP_HALF_MS = 300;

// Repo convention: no Math.random(). Advancing an integer counter through a
// seeded-sin hash gives a stable, well-scattered pseudo-random sequence and
// keeps SSR output deterministic (first paint is always the first 5 tiles).
const seededRand = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * One country's header and tile row. Purely presentational: the rotation lives
 * in the section, because a single randomizer cannot be split across two
 * components that each own their own state.
 */
function LogoGroup({ group, slots, flippingSlot, icons }) {
  const { institutions } = group;
  const Flag = FLAGS[group.code];

  return (
    <div className="bl-group">
      <div className="bl-group-head">
        <Flag />
        <span className="bl-group-label">{group.label}</span>
      </div>
      <div className="bl-flip-row" aria-label={`${group.label} institutions`} role="group">
        {slots.map((idx, slot) => (
          /* is-flipping goes on this wrapper, which contains the mark AND the
             label, so the pair rotates as one face. On the inner mark instead,
             a tile would spend the swap showing one bank's logo under
             another's name. */
          <div key={slot} className={`bl-flip-slot${flippingSlot === slot ? ' is-flipping' : ''}`}>
            {/* Keyed by institution, not by slot: LogoTile carries its own
                `failed` state, and a slot that reuses the instance would keep
                a previous logo's broken-image verdict after the flip. */}
            <LogoTile
              key={institutions[idx].name}
              institution={institutions[idx]}
              icon={icons[institutions[idx].name]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BrokerageLogos() {
  const sectionRef = useRef(null);
  const [inView, setInView] = useState(false);
  /* null until the icons request settles, which is what holds the rotation
     back: flipping before the marks exist would land on initials. */
  const [icons, setIcons] = useState(null);
  /* slots[g] holds five indices into GROUPS[g].institutions. */
  const [slots, setSlots] = useState(() =>
    GROUPS.map((g) =>
      Array.from({ length: Math.min(VISIBLE_SLOTS, g.institutions.length) }, (_, i) => i),
    ),
  );
  /* { group, slot } | null — one position in the whole section, never two. */
  const [flipping, setFlipping] = useState(null);
  const counterRef = useRef(0);

  /* The tick reads occupancy from here rather than from `slots` directly.
     Putting `slots` in the rotation effect's dependencies, as the obvious
     version does, makes every swap tear the interval down and build a new one
     300ms into the cycle: the cadence stretches from 2400ms to 2700ms, and the
     cleanup's clearTimeout kills the pending setFlipping(null), stranding a
     tile with the is-flipping class. A ref keeps the interval stable and the
     reads fresh. */
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  // Flip only while the section is on screen (same IntersectionObserver
  // pattern as WhyEzanaSection).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver((es) => setInView(es.some((e) => e.isIntersecting)), {
      rootMargin: '100px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Fetched once after mount rather than on the server, so the server and the
     first client render produce the same initials tiles and hydration has
     nothing to reconcile. A failure stores {} rather than leaving null: the
     section then settles on initials and simply never rotates, which is a
     resting state rather than a permanent wait. */
  useEffect(() => {
    let alive = true;
    fetch('/api/landing/institution-icons')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setIcons(d?.icons || {});
      })
      .catch(() => {
        if (alive) setIcons({});
      });
    return () => {
      alive = false;
    };
  }, []);

  /* The rotation pool: institutions whose Plaid mark actually resolved. This
     single restriction is what guarantees a flip never lands on initials, and
     it is why no image-loading state is needed on the incoming face either.
     A resolved mark is a data URI, already decoded, with no network in the
     path. */
  const resolvedPools = useMemo(() => {
    if (!icons) return GROUPS.map(() => []);
    return GROUPS.map((g) =>
      g.institutions.reduce((acc, inst, i) => {
        if (icons[inst.name]?.logo) acc.push(i);
        return acc;
      }, []),
    );
  }, [icons]);

  /* One settle pass when the icons land: any visible tile still showing
     initials is replaced with a resolved one, in place and without a flip.
     In place matters. Rebuilding the row as "keepers, then fillers" would
     reshuffle tiles that were already correct, which reads as a glitch rather
     than a correction. Fill-what-we-can rather than all-or-nothing: a row
     where Plaid resolved three marks shows three logos and two initials, and
     the rotation below simply has nothing to draw for it. */
  useEffect(() => {
    if (!icons) return;
    setSlots((prev) =>
      prev.map((groupSlots, g) => {
        const pool = resolvedPools[g];
        const resolved = new Set(pool);
        const spare = pool.filter((i) => !groupSlots.includes(i));
        let moved = false;
        const next = groupSlots.map((i) => {
          if (resolved.has(i) || spare.length === 0) return i;
          moved = true;
          return spare.shift();
        });
        return moved ? next : groupSlots;
      }),
    );
  }, [icons, resolvedPools]);

  useEffect(() => {
    /* Never before the marks exist. */
    if (!inView || !icons) return undefined;
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const timeouts = [];

    const tick = () => {
      const c = (counterRef.current += 1);
      /* One draw across all ten positions: 0 to 4 is Canada, 5 to 9 the US. */
      const flat = Math.floor(seededRand(c) * TOTAL_SLOTS);
      const group = Math.floor(flat / VISIBLE_SLOTS);
      const slot = flat % VISIBLE_SLOTS;

      /* Nothing in the wings for this row: skip the tick rather than animate a
         tile into the same bank it already shows, or into an initials tile. */
      const available = resolvedPools[group].filter((i) => !slotsRef.current[group].includes(i));
      if (available.length === 0) return;

      const swap = () =>
        setSlots((prev) => {
          const incoming = resolvedPools[group].filter((i) => !prev[group].includes(i));
          if (incoming.length === 0) return prev;
          const next = incoming[Math.floor(seededRand(c * 2 + 1) * incoming.length)];
          const copy = prev.map((arr) => [...arr]);
          copy[group][slot] = next;
          return copy;
        });

      if (reduced) {
        // Reduced motion: the tile still rotates through, but with a plain
        // swap and no 3D flip animation.
        swap();
        return;
      }
      setFlipping({ group, slot });
      /* At the 90 degree edge, so the incoming logo and label appear together
         on the back half of the flip. */
      timeouts.push(window.setTimeout(swap, FLIP_HALF_MS));
      timeouts.push(window.setTimeout(() => setFlipping(null), FLIP_HALF_MS * 2));
    };

    const interval = window.setInterval(tick, FLIP_EVERY_MS);
    return () => {
      window.clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, [inView, icons, resolvedPools]);

  return (
    <section className="bl-section" aria-labelledby="bl-heading" ref={sectionRef}>
      <p className="bl-eyebrow lf-mono">Integrations</p>
      <h2 id="bl-heading" className="bl-heading">
        Every account, one command center
      </h2>
      <p className="bl-subheading">
        Connect your bank or brokerage. Securely link 1,000+ institutions across Canada and the
        United States, then read holdings or place trades from supported brokers without leaving
        Ezana.
        <BrokerageTradeInfo />
      </p>

      <div className="bl-groups">
        {GROUPS.map((group, g) => (
          <LogoGroup
            key={group.code}
            group={group}
            slots={slots[g]}
            flippingSlot={flipping?.group === g ? flipping.slot : null}
            icons={icons || {}}
          />
        ))}
      </div>
    </section>
  );
}

export default BrokerageLogos;
