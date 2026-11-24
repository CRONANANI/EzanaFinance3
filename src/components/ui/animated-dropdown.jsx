'use client';

/**
 * AnimatedDropdown: a select-style dropdown with a rotating chevron, a menu
 * that springs open (fade, slide and scale) and options that stagger in from
 * the left, each row ruled off from the next.
 *
 * Adapted Nov 24 2026 from emerald-ui's Animated Dropdown (MIT,
 * https://emerald-ui.com) for Ezana:
 *   - a value / onChange select (the original was a list of links);
 *   - a real listbox: arrow keys, Home / End, Enter / Space, Escape and Tab
 *     close, type-ahead by first letter, aria-activedescendant, focus returns
 *     to the trigger;
 *   - Ezana tokens instead of slate / zinc (animated-dropdown.css);
 *   - no motion when the user prefers reduced motion.
 *
 * Props:
 *   options   [{ value, label }]
 *   value     the selected value
 *   onChange  (value) => void
 *   id        base id (the trigger is `${id}-trigger`)
 *   label     accessible name for the listbox
 *   disabled
 *   className extra class on the root
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import './animated-dropdown.css';

function useClickOutside(ref, handler, active) {
  useEffect(() => {
    if (!active) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [ref, handler, active]);
}

export function AnimatedDropdown({
  options = [],
  value,
  onChange,
  id: idProp,
  label,
  disabled = false,
  className,
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const reduce = useReducedMotion();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const [active, setActive] = useState(selectedIndex);
  const selected = options.find((o) => o.value === value) || options[0];

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);
  useClickOutside(rootRef, close, open);

  useEffect(() => {
    if (open) {
      setActive(selectedIndex);
      /* Focus the list so arrow keys work straight away. */
      requestAnimationFrame(() => listRef.current?.focus());
    }
  }, [open, selectedIndex]);

  const choose = (i) => {
    const o = options[i];
    if (!o) return;
    if (o.value !== value) onChange?.(o.value);
    close(true);
  };

  const onTriggerKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onListKey = (e) => {
    const last = options.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(last, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(last);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'Tab') {
      close(false);
    } else if (e.key.length === 1 && /\S/.test(e.key)) {
      const k = e.key.toLowerCase();
      const from = active + 1;
      const order = [...options.slice(from), ...options.slice(0, from)];
      const hit = order.findIndex((o) => String(o.label).toLowerCase().startsWith(k));
      if (hit >= 0) setActive((from + hit) % options.length);
    }
  };

  const menuMotion = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: -10, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -10, scale: 0.95 },
      };

  return (
    <div
      ref={rootRef}
      data-state={open ? 'open' : 'closed'}
      className={cn('ezad', open && 'is-open', className)}
    >
      <button
        ref={triggerRef}
        id={`${id}-trigger`}
        type="button"
        className="ezad-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKey}
      >
        <span className="ezad-value">{selected?.label}</span>
        <motion.span
          className="ezad-chevron"
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: 'easeInOut' }}
        >
          <ChevronDown />
        </motion.span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="ezad-menu"
            {...menuMotion}
            transition={{ duration: reduce ? 0.1 : 0.2, ease: 'easeOut' }}
          >
            <motion.ul
              ref={listRef}
              id={`${id}-list`}
              role="listbox"
              tabIndex={-1}
              aria-label={label}
              aria-activedescendant={`${id}-opt-${active}`}
              className="ezad-list"
              onKeyDown={onListKey}
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: reduce ? 0 : 0.03 } } }}
            >
              {options.map((o, i) => {
                const isSel = o.value === value;
                return (
                  <motion.li
                    key={o.value}
                    id={`${id}-opt-${i}`}
                    role="option"
                    aria-selected={isSel}
                    className={cn(
                      'ezad-option',
                      isSel && 'is-selected',
                      i === active && 'is-active',
                    )}
                    variants={
                      reduce
                        ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
                        : { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }
                    }
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(i)}
                  >
                    <span className="ezad-option-label">{o.label}</span>
                    <Check className="ezad-check" aria-hidden="true" />
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default AnimatedDropdown;
