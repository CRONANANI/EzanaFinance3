'use client';

/**
 * Size of a DOM node that may mount after the first render (a chart that
 * waits for its data). A callback ref, not useRef: a ref object's effect runs
 * once, while the node is still null, and never measures again, so the width
 * stayed 0 and every hover resolved to the last point.
 *
 * Returns [ref, { w, h }, node]. Values are whole pixels, and the state only
 * changes when one of them does, so observers never loop.
 */
import { useEffect, useState } from 'react';

export function useSize() {
  const [node, setNode] = useState(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!node) return undefined;
    const read = () => {
      const r = node.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [setNode, size, node];
}
