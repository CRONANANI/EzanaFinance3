'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { UserRound, Building2, Landmark, TrendingUp, SendHorizontal, Radar } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Sonar query types → the classifier/datasets in the Sonar backend. Selecting one
   drops its prefix into the input as a hint (stripped before the query is sent). */
const COMMANDS = [
  { icon: UserRound, label: 'Person / User', description: 'Look up a person or platform user', prefix: '/who' },
  { icon: Building2, label: 'Company / Bank', description: 'Profile an institution', prefix: '/firm' },
  { icon: Landmark, label: 'Policy / Bill', description: 'Analyze a policy or bill', prefix: '/policy' },
  { icon: TrendingUp, label: 'Ticker', description: 'Cross-reference a ticker', prefix: '/ticker' },
];
const PREFIXES = COMMANDS.map((c) => c.prefix);

/** Strip a leading slash-command hint so the backend classifier sees the subject. */
function stripPrefix(text) {
  const t = text.trimStart();
  for (const p of PREFIXES) {
    if (t.toLowerCase().startsWith(p)) return t.slice(p.length).trimStart();
  }
  return text.trim();
}

/** Auto-resize a textarea to its content between a min and max height. */
function useAutoResizeTextarea(minHeight = 56, maxHeight = 200) {
  const ref = useRef(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`;
  }, [minHeight, maxHeight]);
  useEffect(() => {
    const el = ref.current;
    if (el) el.style.height = `${minHeight}px`;
  }, [minHeight]);
  return { textareaRef: ref, resize };
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Sonar is sweeping">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-emerald-600"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

/**
 * SonarInput — the animated Sonar chat pill. Auto-resizing textarea, a command
 * palette (/who /firm /policy /ticker) that's arrow/enter navigable, an emerald
 * focus ring, a mouse-follow glow, and a typing indicator while a ping resolves.
 * Presentational: it calls `onSubmit(text)`; the page owns the backend + results,
 * so the existing entitlement gating and query API stay in charge.
 */
export function SonarInput({ onSubmit, loading = false }) {
  const [value, setValue] = useState('');
  const [showCommands, setShowCommands] = useState(false);
  const [activeCommand, setActiveCommand] = useState(0);
  const [glow, setGlow] = useState({ x: 0, y: 0, on: false });
  const { textareaRef, resize } = useAutoResizeTextarea();
  const reduceMotion = useReducedMotion();

  // Open the command palette while the input starts with "/" (and nothing after
  // a space yet).
  useEffect(() => {
    const t = value.trimStart();
    setShowCommands(t.startsWith('/') && !t.includes(' '));
  }, [value]);

  const submit = () => {
    const q = stripPrefix(value);
    if (!q || loading) return;
    onSubmit(q);
  };

  const pickCommand = (cmd) => {
    setValue(`${cmd.prefix} `);
    setShowCommands(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      resize();
    });
  };

  const handleKeyDown = (e) => {
    if (showCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveCommand((i) => (i + 1) % COMMANDS.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveCommand((i) => (i - 1 + COMMANDS.length) % COMMANDS.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        pickCommand(COMMANDS[activeCommand]);
        return;
      }
      if (e.key === 'Escape') {
        setShowCommands(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleMouseMove = (e) => {
    if (reduceMotion) return;
    const r = e.currentTarget.getBoundingClientRect();
    setGlow({ x: e.clientX - r.left, y: e.clientY - r.top, on: true });
  };

  return (
    <div className="mx-auto w-full max-w-2xl text-center">
      <motion.h1
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="font-serif text-3xl font-bold text-emerald-950 sm:text-4xl"
      >
        Ping anything.
      </motion.h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-emerald-800/80">
        A name, a bank, a policy, a ticker — Sonar cross-references everything.
      </p>

      <div
        className="relative mt-6"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setGlow((g) => ({ ...g, on: false }))}
      >
        {/* Mouse-follow emerald glow (reduced-motion: never turns on) */}
        {!reduceMotion && glow.on && (
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-[22px] opacity-70 transition-opacity"
            style={{
              background: `radial-gradient(240px circle at ${glow.x}px ${glow.y}px, rgba(16,185,129,0.20), transparent 70%)`,
            }}
          />
        )}

        {/* Frosted pill — reads over the emerald gradient */}
        <div className="relative rounded-[22px] border border-emerald-500/30 bg-white/70 shadow-[0_10px_40px_rgba(6,95,70,0.15)] backdrop-blur-xl">
          <AnimatePresence>
            {showCommands && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: reduceMotion ? 0 : 0.15 }}
                className="absolute bottom-full left-0 right-0 z-10 mb-2 overflow-hidden rounded-2xl border border-emerald-500/25 bg-white/90 shadow-xl backdrop-blur-xl"
                role="listbox"
              >
                {COMMANDS.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.prefix}
                      type="button"
                      role="option"
                      aria-selected={i === activeCommand}
                      onMouseEnter={() => setActiveCommand(i)}
                      onClick={() => pickCommand(cmd)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left',
                        i === activeCommand ? 'bg-emerald-500/10' : 'bg-transparent',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-emerald-950">{cmd.label}</span>
                        <span className="block text-xs text-emerald-800/70">{cmd.description}</span>
                      </span>
                      <span className="font-mono text-xs text-emerald-600">{cmd.prefix}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2 p-3">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                resize();
              }}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={800}
              placeholder="Ping anything — a person, a bank, a policy, a ticker…  (type / for query types)"
              aria-label="Sonar query"
              className="max-h-[200px] min-h-[56px] flex-1 resize-none bg-transparent px-3 py-3 text-[15px] leading-relaxed text-emerald-950 placeholder:text-emerald-800/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={loading || !stripPrefix(value)}
              aria-label="Send ping"
              className={cn(
                'mb-1 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition',
                loading || !stripPrefix(value)
                  ? 'cursor-not-allowed bg-emerald-500/40 text-white/80'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600',
              )}
            >
              {loading ? (
                <TypingDots />
              ) : (
                <>
                  <SendHorizontal className="h-4 w-4" aria-hidden />
                  Ping
                </>
              )}
            </button>
          </div>
        </div>

        {/* Command chips (quick pick; complements the "/" palette) */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-emerald-800/70">
            <Radar className="h-3.5 w-3.5" aria-hidden /> Try
          </span>
          {COMMANDS.map((cmd) => (
            <button
              key={cmd.prefix}
              type="button"
              onClick={() => pickCommand(cmd)}
              className="rounded-full border border-emerald-500/30 bg-white/60 px-3 py-1 text-xs font-medium text-emerald-900 backdrop-blur transition hover:border-emerald-500/60 hover:bg-white/80"
            >
              {cmd.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SonarInput;
