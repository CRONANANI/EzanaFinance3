'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from './tokens';

/**
 * Click-to-open menu. Closes on outside click and Escape.
 *   <Dropdown trigger={<Button>Actions</Button>}>
 *     <MenuItem icon="bi-pencil">Edit</MenuItem>
 *     <MenuDivider />
 *     <MenuItem icon="bi-trash" danger>Delete</MenuItem>
 *   </Dropdown>
 */
export function Dropdown({ trigger, children, align = 'left', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className={cx('ds-dropdown', className)}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      <span
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        style={{ display: 'inline-flex' }}
      >
        {trigger}
      </span>
      {open && (
        <div
          className="ds-menu"
          role="menu"
          style={{ top: '100%', marginTop: 4, [align === 'right' ? 'right' : 'left']: 0 }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, danger = false, className, children, ...rest }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cx('ds-menu-item', danger && 'ds-menu-item--danger', className)}
      {...rest}
    >
      {icon && <i className={`bi ${icon}`} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="ds-menu-divider" aria-hidden="true" />;
}
