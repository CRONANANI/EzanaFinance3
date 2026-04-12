/**
 * Dashboard route Suspense fallback.
 *
 * Next.js App Router automatically uses this as the loading
 * boundary for every page nested under src/app/(dashboard)/.
 * It paints the moment a navigation starts, before the new
 * route's bundles or data have finished loading, so users see
 * a structured skeleton instead of an empty layout shell.
 *
 * Server component — no 'use client', no imports, no data
 * fetches. Renders synchronously.
 */
export default function DashboardLoading() {
  // Two layers of styles: a fixed top inset that matches the
  // existing layout's --navbar-height (64px), and a content
  // area that holds the pulse-animated skeleton blocks.
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{
        minHeight: '100vh',
        paddingTop: 'calc(var(--navbar-height, 64px) + 1.5rem)',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        paddingBottom: '2rem',
        backgroundColor: '#050a08',
        // Light-mode override is handled by the body.light-mode rules
        // already loaded by the global stylesheet — see the inline
        // <style> tag below for the skeleton-specific overrides.
      }}
    >
      <span style={{ position: 'absolute', left: '-9999px' }}>Loading…</span>

      {/* Top row — wide hero card */}
      <div className="dl-skel dl-skel-hero" />

      {/* Two-column row */}
      <div className="dl-skel-row">
        <div className="dl-skel dl-skel-card" />
        <div className="dl-skel dl-skel-card" />
      </div>

      {/* Three-column row */}
      <div className="dl-skel-row dl-skel-row-3">
        <div className="dl-skel dl-skel-card-sm" />
        <div className="dl-skel dl-skel-card-sm" />
        <div className="dl-skel dl-skel-card-sm" />
      </div>

      <style>{`
        .dl-skel {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04) 0%,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(255, 255, 255, 0.04) 100%
          );
          background-size: 200% 100%;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          animation: dl-shimmer 1.4s ease-in-out infinite;
          will-change: background-position;
        }
        .dl-skel-hero {
          height: 200px;
          margin-bottom: 1.25rem;
        }
        .dl-skel-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .dl-skel-row-3 {
          grid-template-columns: 1fr 1fr 1fr;
        }
        .dl-skel-card {
          height: 280px;
        }
        .dl-skel-card-sm {
          height: 180px;
        }
        @media (max-width: 1024px) {
          .dl-skel-row,
          .dl-skel-row-3 {
            grid-template-columns: 1fr;
          }
        }
        @keyframes dl-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Light-mode skeleton — softer grays against the light background.
           The earlier root-color fix made the page bg #050a08 in BOTH modes,
           so we keep the dark surface here too — but if you ever flip the
           dashboard to a true light surface, change the body bg below. */
        body.light-mode .dl-skel {
          background: linear-gradient(
            90deg,
            rgba(0, 0, 0, 0.04) 0%,
            rgba(0, 0, 0, 0.08) 50%,
            rgba(0, 0, 0, 0.04) 100%
          );
          background-size: 200% 100%;
          border-color: rgba(0, 0, 0, 0.06);
        }
      `}</style>
    </div>
  );
}
