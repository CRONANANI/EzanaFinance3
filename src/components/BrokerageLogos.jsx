/**
 * BrokerageLogos — "Connect your bank or brokerage" section.
 *
 * Two country groups, Canada and the United States, each under a small inline
 * flag. Each group runs the same flip mechanic as before: five tiles, one
 * flipping on its Y axis roughly every 2.4s into an institution not currently
 * on screen. The two rows are offset by half the interval so they never flip
 * in sync.
 *
 * Icons are Plaid-first. /api/landing/institution-icons resolves the roster by
 * name and returns marks as data URIs; a name Plaid does not cover falls back
 * to an initials tile, tinted with the institution's Plaid colour when one is
 * known. There is no broken-image state and no empty slot at any point: the
 * server renders initials tiles, and Plaid marks swap in after hydration, so
 * SSR and the first client render agree.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
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
    ],
  },
  {
    code: 'US',
    label: 'United States',
    institutions: [
      { name: 'Chase', label: 'Chase' },
      { name: 'Bank of America', label: 'Bank of America' },
      { name: 'Wells Fargo', label: 'Wells Fargo' },
      { name: 'Capital One', label: 'Capital One' },
      { name: 'Citibank', label: 'Citibank' },
      { name: 'U.S. Bank', label: 'U.S. Bank' },
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

const VISIBLE_SLOTS = 5;
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
 * One country's header and tile row. The flip state lives here rather than in
 * the section so the logic is written once and each group runs its own copy,
 * over its own roster, on its own phase.
 */
function LogoGroup({ group, icons, inView, phaseMs, seed }) {
  const { institutions } = group;
  const [slots, setSlots] = useState(() =>
    Array.from({ length: Math.min(VISIBLE_SLOTS, institutions.length) }, (_, i) => i),
  );
  const [flippingSlot, setFlippingSlot] = useState(null);
  const counterRef = useRef(seed);
  const Flag = FLAGS[group.code];

  useEffect(() => {
    if (!inView) return undefined;
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    /* Nothing to rotate through when the roster is no longer than the row. */
    if (institutions.length <= VISIBLE_SLOTS) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const timeouts = [];
    let interval = null;

    const tick = () => {
      const c = (counterRef.current += 1);
      const slot = Math.floor(seededRand(c) * VISIBLE_SLOTS);

      const swap = () =>
        setSlots((prev) => {
          const pool = institutions.map((_, i) => i).filter((i) => !prev.includes(i));
          if (pool.length === 0) return prev;
          const next = pool[Math.floor(seededRand(c * 2 + 1) * pool.length)];
          const copy = [...prev];
          copy[slot] = next;
          return copy;
        });

      if (reduced) {
        // Reduced motion: the tile still rotates through, but with a plain
        // swap and no 3D flip animation.
        swap();
        return;
      }
      setFlippingSlot(slot);
      timeouts.push(window.setTimeout(swap, FLIP_HALF_MS));
      timeouts.push(window.setTimeout(() => setFlippingSlot(null), FLIP_HALF_MS * 2));
    };

    /* The offset is what keeps the two rows out of phase. It delays the first
       tick only; the interval that follows is the same 2400ms both rows run,
       so the cadence is unchanged and the phase difference is permanent. */
    const start = window.setTimeout(() => {
      interval = window.setInterval(tick, FLIP_EVERY_MS);
    }, phaseMs);

    return () => {
      window.clearTimeout(start);
      if (interval) window.clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, [inView, institutions, phaseMs]);

  return (
    <div className="bl-group">
      <div className="bl-group-head">
        <Flag />
        <span className="bl-group-label">{group.label}</span>
      </div>
      <div className="bl-flip-row" aria-label={`${group.label} institutions`} role="group">
        {slots.map((idx, slot) => (
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
  const [icons, setIcons] = useState({});

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
     nothing to reconcile. The marks arrive a frame later into slots that are
     already the right size, so there is no layout shift. A failure leaves the
     map empty, which is the fallback the section already renders. */
  useEffect(() => {
    let alive = true;
    fetch('/api/landing/institution-icons')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.icons) setIcons(d.icons);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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
        {GROUPS.map((group, i) => (
          <LogoGroup
            key={group.code}
            group={group}
            icons={icons}
            inView={inView}
            /* Half an interval apart, so a visitor always sees one row
               settling while the other turns. */
            phaseMs={i * (FLIP_EVERY_MS / 2)}
            /* Different starting counters, so the two rows do not draw the
               same slot and the same replacement on every tick. */
            seed={i * 997}
          />
        ))}
      </div>
    </section>
  );
}

export default BrokerageLogos;
