'use client';

import { cx } from './tokens';

/** Token-styled table. Compose with THead/TBody/TR/TH/TD. */
export function Table({ className, children, ...rest }) {
  return (
    <table className={cx('ds-table', className)} {...rest}>
      {children}
    </table>
  );
}

export function THead({ children, ...rest }) {
  return <thead {...rest}>{children}</thead>;
}

export function TBody({ children, ...rest }) {
  return <tbody {...rest}>{children}</tbody>;
}

export function TR({ children, ...rest }) {
  return <tr {...rest}>{children}</tr>;
}

/** `numeric` right-aligns and switches to mono/tabular-nums. */
export function TH({ numeric = false, className, children, ...rest }) {
  return (
    <th className={cx(numeric && 'ds-num', className)} {...rest}>
      {children}
    </th>
  );
}

export function TD({ numeric = false, className, children, ...rest }) {
  return (
    <td className={cx(numeric && 'ds-num', className)} {...rest}>
      {children}
    </td>
  );
}
