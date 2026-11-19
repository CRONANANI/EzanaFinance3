'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import './auth-shell.css';

/**
 * The frame every sign-in page shares (Nov 2026): a quiet ground with drawn
 * accent lines and slow rising particles, a thin header with the Ezana mark,
 * and the page's card centred beneath it. Auth pages render light whatever
 * the visitor's theme, so the palette is set here and not read from the
 * theme tokens that flip.
 */
export default function AuthShell({ children, action }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    /* Deterministic scatter (no Math.random anywhere in the repo's UI). */
    let n = 0;
    const rnd = () => {
      n += 1;
      const v = Math.sin(n * 12.9898) * 43758.5453;
      return v - Math.floor(v);
    };
    let dots = [];
    let raf = 0;
    const make = (anywhere) => ({
      x: rnd() * canvas.width,
      y: anywhere ? rnd() * canvas.height : canvas.height + rnd() * 40,
      v: rnd() * 0.25 + 0.05,
      o: rnd() * 0.3 + 0.12,
    });
    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(220, Math.floor((canvas.width * canvas.height) / 9000));
      dots = Array.from({ length: count }, () => make(true));
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < dots.length; i += 1) {
        const d = dots[i];
        d.y -= d.v;
        if (d.y < 0) dots[i] = make(false);
        ctx.fillStyle = `rgba(5, 150, 105, ${d.o})`;
        ctx.fillRect(d.x, d.y, 0.9, 2.4);
      }
      raf = requestAnimationFrame(draw);
    };
    init();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', init);
    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="signin-dark-lock as-scope as-shell">
      <div className="as-vignette" aria-hidden="true" />
      <div className="as-lines" aria-hidden="true">
        <span className="as-hline" />
        <span className="as-hline" />
        <span className="as-hline" />
        <span className="as-vline" />
        <span className="as-vline" />
        <span className="as-vline" />
      </div>
      <canvas ref={canvasRef} className="as-particles" aria-hidden="true" />

      <header className="as-header">
        <Link href="/" className="as-brand" title="Ezana Finance">
          <EzanaNavLogo width={28} height={32} className="as-brand-mark" />
          <span className="as-brand-name">Ezana Finance</span>
        </Link>
        {action === undefined ? (
          <Link href="/" className="as-header-link">
            <i className="bi bi-arrow-left" aria-hidden="true" />
            Back to home
          </Link>
        ) : (
          action
        )}
      </header>

      <main className="as-main">{children}</main>
    </div>
  );
}
