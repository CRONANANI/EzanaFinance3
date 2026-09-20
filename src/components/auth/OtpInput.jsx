'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import './otp-input.css';

/**
 * OtpInput, vendored port of rare-ui's OTP field (TS + Tailwind + motion/react
 * upstream) to repo conventions: plain JSX, token CSS in otp-input.css, and
 * framer-motion. Behavior parity with upstream: rolling digit enter/exit
 * (direction depends on clear vs advance), a single blink caret that springs
 * between cells, error shake, staggered success ring draw, paste and SMS
 * autofill via fill(), arrow-key navigation, backspace pull-back, and
 * pointer-down clamped to the first empty slot so codes stay contiguous.
 * Brand deltas only: mono tabular digits, emerald success, token colors.
 * Controlled (value + onChange) or uncontrolled (defaultValue).
 */

const PATTERNS = {
  numbers: /^[0-9]$/,
  letters: /^[a-zA-Z]$/,
  both: /^[a-zA-Z0-9]$/,
};

const ROLL_SPRING = { type: 'spring', stiffness: 500, damping: 34 };
const CARET_SPRING = { type: 'spring', stiffness: 500, damping: 40 };
const BLINK = { duration: 1.1, times: [0, 0.5, 0.5, 1], repeat: Infinity, ease: 'linear' };
const ROLL = {
  initial: { y: '110%' },
  exit: (cleared) => ({ y: cleared ? '110%' : '-110%' }),
};
const SHAKE = [0, -5, 4, -2, 0];

/* Cell geometry per size, for the success-ring SVG viewBox. Keep in sync with
   the .otp-cell--{size} rules in otp-input.css. */
const SIZES = {
  sm: { px: 40, radius: 8 },
  md: { px: 48, radius: 12 },
  lg: { px: 56, radius: 16 },
};

const toSlots = (code, length) => Array.from({ length }, (_, i) => code[i] ?? '');

export function OtpInput({
  length = 6,
  value,
  defaultValue = '',
  onChange,
  onComplete,
  type = 'numbers',
  size = 'md',
  status = 'idle',
  mask = false,
  disabled,
  autoFocus,
  className,
  ...props
}) {
  const [uncontrolled, setUncontrolled] = useState(() => toSlots(defaultValue, length));
  const [cleared, setCleared] = useState(false);
  const [focused, setFocused] = useState(null);
  const [caretX, setCaretX] = useState(0);
  const inputs = useRef([]);
  const cells = useRef([]);
  // The slot the user deliberately moved to, so a full code only changes on purpose.
  const editingAt = useRef(null);
  const reduceMotion = useReducedMotion();

  // Padded, not joined: joining would close a gap left by a mid-code backspace.
  const slots =
    value === undefined
      ? Array.from({ length }, (_, i) => uncontrolled[i] ?? '')
      : toSlots(value, length);
  const numeric = type === 'numbers';
  const scale = SIZES[size] || SIZES.md;
  const caretVisible = focused !== null && !slots[focused];

  const commit = (next) => {
    if (value === undefined) setUncontrolled(next);
    const code = next.join('');
    onChange?.(code);
    if (next.every(Boolean)) onComplete?.(code);
  };

  const setCharAt = (index, char) => {
    setCleared(!char);
    commit(slots.map((slot, i) => (i === index ? char : slot)));
  };

  const focusAt = (index) => {
    const input = inputs.current[Math.min(Math.max(index, 0), length - 1)];
    input?.focus();
    input?.select();
  };

  const fill = (index, chars) => {
    const room = Math.min(chars.length, length - index);
    const next = [...slots];
    chars.slice(0, room).forEach((char, i) => {
      next[index + i] = char;
    });
    setCleared(false);
    commit(next);
    editingAt.current = null;
    focusAt(index + room);
  };

  const handleChange = (index, raw) => {
    const chars = raw.split('').filter((char) => PATTERNS[type].test(char));
    if (!chars.length) return;

    // Typing into a filled slot appends, so keep only the new character.
    const typed =
      chars.length === 1
        ? chars[0]
        : chars.length === 2 && chars[0] === slots[index]
          ? chars[1]
          : null;

    if (typed === null) {
      // Anything longer arrived at once: a paste or an SMS autofill.
      fill(index, chars);
      return;
    }

    if (slots.every(Boolean) && editingAt.current !== index) return;

    setCharAt(index, typed);
    editingAt.current = null;
    focusAt(index + 1);
  };

  const handleKeyDown = (index, event) => {
    const actions = {
      ArrowLeft: () => {
        editingAt.current = Math.max(index - 1, 0);
        focusAt(index - 1);
      },
      ArrowRight: () => {
        editingAt.current = Math.min(index + 1, length - 1);
        focusAt(index + 1);
      },
      Backspace: () => {
        if (slots[index]) {
          setCharAt(index, '');
        } else if (index > 0) {
          setCharAt(index - 1, '');
          focusAt(index - 1);
        }
      },
    };

    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  const handlePaste = (index, event) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData('text')
      .split('')
      .filter((char) => PATTERNS[type].test(char));
    if (pasted.length) fill(index, pasted);
  };

  // Clicking past the first gap lands on the gap, so a code stays contiguous.
  const handlePointerDown = (index, event) => {
    const firstEmpty = slots.findIndex((slot) => !slot);
    const target = firstEmpty === -1 ? index : Math.min(index, firstEmpty);
    editingAt.current = target;
    if (target === index) return;
    event.preventDefault();
    focusAt(target);
  };

  return (
    <div className={cn('otp-root', className)} data-status={status} {...props}>
      <motion.div
        className={cn('otp-row', `otp-row--${size}`)}
        onFocus={(event) => {
          const index = inputs.current.indexOf(event.target);
          const cell = cells.current[index];
          setFocused(index);
          if (cell) setCaretX(cell.offsetLeft + cell.offsetWidth / 2);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(null);
        }}
        animate={{ x: status === 'error' && !reduceMotion ? SHAKE : 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      >
        {slots.map((slot, index) => (
          <div
            key={index}
            ref={(el) => {
              cells.current[index] = el;
            }}
            className={cn('otp-cell', `otp-cell--${size}`)}
            data-filled={Boolean(slot)}
          >
            <input
              ref={(el) => {
                inputs.current[index] = el;
              }}
              className={cn('otp-slot', status === 'error' && 'otp-slot--error')}
              value={slot}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => handlePaste(index, event)}
              onPointerDown={(event) => handlePointerDown(index, event)}
              onFocus={(event) => event.target.select()}
              type={mask ? 'password' : 'text'}
              inputMode={numeric ? 'numeric' : 'text'}
              autoCapitalize={numeric ? undefined : 'characters'}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- a one-time-code
              // field is the sole purpose of the screen it renders on.
              autoFocus={autoFocus && index === 0}
              disabled={disabled}
              aria-label={`${numeric ? 'Digit' : 'Character'} ${index + 1} of ${length}`}
            />

            <AnimatePresence>
              {status === 'success' && (
                <motion.svg
                  aria-hidden
                  className="otp-ring"
                  viewBox={`0 0 ${scale.px} ${scale.px}`}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.rect
                    x={1}
                    y={1}
                    width={scale.px - 2}
                    height={scale.px - 2}
                    rx={scale.radius - 1}
                    fill="none"
                    stroke="var(--emerald)"
                    strokeWidth={2}
                    initial={reduceMotion ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { duration: 0.45, ease: 'easeOut', delay: 0.15 + index * 0.05 }
                    }
                  />
                </motion.svg>
              )}
            </AnimatePresence>

            <span className="otp-char-layer" aria-hidden>
              <AnimatePresence initial={false} custom={cleared}>
                {slot && (
                  <motion.span
                    key={slot}
                    custom={cleared}
                    variants={ROLL}
                    initial={reduceMotion ? false : 'initial'}
                    animate={{ y: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : 'exit'}
                    transition={reduceMotion ? { duration: 0 } : ROLL_SPRING}
                    className="otp-char"
                  >
                    {mask ? '•' : slot}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </div>
        ))}

        {caretVisible && (
          <motion.span
            aria-hidden
            className={cn('otp-caret', `otp-caret--${size}`)}
            initial={false}
            animate={{ x: caretX - 1, y: '-50%', opacity: [1, 1, 0, 0] }}
            transition={{ x: reduceMotion ? { duration: 0 } : CARET_SPRING, opacity: BLINK }}
          />
        )}
      </motion.div>
    </div>
  );
}

export default OtpInput;
