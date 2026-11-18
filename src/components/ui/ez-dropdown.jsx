'use client';

/**
 * EzDropdown: the Ezana standard dropdown (Nov 18 2026). A frosted trigger
 * with a chevron, and a frosted menu whose selected item reads in bold
 * emerald with a check. Colours come from the page's own tokens, so it suits
 * light pages, dark pages and pages that stay dark in light mode (Sonar,
 * .force-dark-theme) without props. Styles: src/styles/ez-dropdown.css.
 *
 * Accessible as a listbox: Enter, Space or Down opens it; arrows, Home and
 * End move; Enter or Space picks; Escape or a tap outside closes it and
 * focus returns to the trigger; typing a letter jumps to the next match.
 *
 *   <EzDropdown
 *     label="Time horizon"            // read by screen readers
 *     options={[{ value: 'any', label: 'Any horizon', icon: <Clock /> }]}
 *     value={horizon}
 *     onChange={setHorizon}
 *   />
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const norm = (o) => (typeof o === 'string' ? { value: o, label: o } : o);

export function EzDropdown({
  options = [],
  value,
  onChange,
  label,
  placeholder = 'Select',
  disabled = false,
  align = 'start',
  size = 'md',
  block = false,
  id,
  className,
  menuClassName,
}) {
  const items = useMemo(() => options.map(norm), [options]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const autoId = useId();
  const baseId = id || `ezdd-${autoId.replace(/:/g, '')}`;
  const selectedIndex = items.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  const close = useCallback((refocus = true) => {
    setOpen(false);
    setActive(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openMenu = useCallback(
    (at) => {
      if (disabled || !items.length) return;
      setOpen(true);
      setActive(at ?? (selectedIndex >= 0 ? selectedIndex : 0));
    },
    [disabled, items.length, selectedIndex],
  );

  const pick = useCallback(
    (i) => {
      const o = items[i];
      if (!o || o.disabled) return;
      if (o.value !== value) onChange?.(o.value, o);
      close();
    },
    [items, value, onChange, close],
  );

  /* Outside tap closes without stealing focus back. */
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) close(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, close]);

  /* Keep the active option in view. */
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const move = (delta) => {
    if (!items.length) return;
    let i = active;
    for (let step = 0; step < items.length; step += 1) {
      i = (i + delta + items.length) % items.length;
      if (!items[i].disabled) break;
    }
    setActive(i);
  };

  const typeahead = (key) => {
    const ch = key.toLowerCase();
    const start = active < 0 ? 0 : active + 1;
    for (let k = 0; k < items.length; k += 1) {
      const i = (start + k) % items.length;
      if (String(items[i].label).toLowerCase().startsWith(ch) && !items[i].disabled) {
        setActive(i);
        return;
      }
    }
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu(e.key === 'ArrowUp' ? items.length - 1 : undefined);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(active);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab':
        close(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) typeahead(e.key);
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn('ezdd', `ezdd--${size}`, block && 'ezdd--block', open && 'is-open', className)}
    >
      <button
        ref={triggerRef}
        id={`${baseId}-trigger`}
        type="button"
        role="combobox"
        className="ezdd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${baseId}-list`}
        aria-label={label ? `${label}: ${selected ? selected.label : placeholder}` : undefined}
        aria-activedescendant={open && active >= 0 ? `${baseId}-opt-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        {selected?.icon ? (
          <span className="ezdd-icon" aria-hidden="true">
            {selected.icon}
          </span>
        ) : null}
        <span className={cn('ezdd-value', !selected && 'is-placeholder')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="ezdd-chevron" aria-hidden="true" />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={`${baseId}-list`}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className={cn('ezdd-menu', align === 'end' && 'ezdd-menu--end', menuClassName)}
        >
          {items.map((o, i) => {
            const isSel = i === selectedIndex;
            return (
              <li
                key={String(o.value)}
                id={`${baseId}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSel}
                aria-disabled={o.disabled || undefined}
                className={cn(
                  'ezdd-option',
                  isSel && 'is-selected',
                  i === active && 'is-active',
                  o.disabled && 'is-disabled',
                )}
                onPointerEnter={() => !o.disabled && setActive(i)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
              >
                {o.icon ? (
                  <span className="ezdd-icon" aria-hidden="true">
                    {o.icon}
                  </span>
                ) : null}
                <span className="ezdd-option-label">
                  {o.label}
                  {o.hint ? <span className="ezdd-option-hint">{o.hint}</span> : null}
                </span>
                {isSel ? <Check className="ezdd-check" aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default EzDropdown;
