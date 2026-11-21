/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const { withSentryConfig } = require('@sentry/nextjs');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // NOTE: Content-Security-Policy is now set per-request in src/middleware.js so
  // it can carry a script nonce (which lets us drop script-src 'unsafe-inline').
  // Declaring it here too would emit a second, conflicting policy, so the CSP
  // lives only in the middleware. All other headers remain static here.
];

const nextConfig = {
  reactStrictMode: true,
  /* Nov 21, 2026: CI (.github/workflows/ci.yml) already runs the full ESLint
     pass on every push; repeating it inside next build cost build memory and
     time on Vercel for no extra safety. */
  eslint: { ignoreDuringBuilds: true },
  // Next.js-built-in import optimizer. For the listed packages, Next rewrites
  // named-member imports to direct submodule imports and enables aggressive
  // tree-shaking. lucide-react in particular ships >1000 icons; without this,
  // the bundler sometimes bundles the whole icon set into the shared chunk.
  // framer-motion benefits by pulling in only the features used on a page.
  experimental: {
    // Required on Next.js 14 so that `instrumentation.js` runs before
    // requests are handled (used to initialise Sentry on the server +
    // edge runtimes). Already on by default in Next.js 15+.
    instrumentationHook: true,
    /* Nov 19, 2026: production builds were killed for running out of memory
       on Vercel's 8 GB build machine. Two settings keep the build under it:
       - webpackBuildWorker runs each webpack compile in its own process, so
         its memory is returned between the server, edge and client passes.
         Next 14 turns it on by default only when there is no custom webpack
         config, and the Sentry wrapper below is one, so it was off.
       - cpus caps the workers that collect page data and pre-render pages,
         each of which holds its own copy of the server bundle. */
    webpackBuildWorker: true,
    cpus: 2,
    /* unpdf carries a prebuilt pdfjs bundle for serverless Node. Left to the
       bundler it gets rewritten and loses that, which is the whole reason it
       is used here instead of pdfjs-dist — see extractPdfText in
       src/lib/house-disclosures/parse-ptr-pdf.js. Next 14 spells this
       `experimental.serverComponentsExternalPackages`; the top-level
       `serverExternalPackages` is Next 15 syntax and is silently ignored
       here, the same trap the tracing note below records. */
    serverComponentsExternalPackages: [
      'unpdf',
      /* Nov 21, 2026: build memory. Heavy server-only SDKs and data packages
         are loaded from node_modules at runtime instead of being parsed and
         bundled by webpack into the server build (758 API routes share
         them). Vercel's file tracing still ships them with each function.
         country-state-city is mostly a 16 MB data blob; plaid and the
         snaptrade SDK are large generated clients. */
      'country-state-city',
      'plaid',
      'snaptrade-typescript-sdk',
      'stripe',
      '@anthropic-ai/sdk',
      'resend',
      'fast-xml-parser',
      'js-yaml',
      'proj4',
    ],
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      '@radix-ui/react-accordion',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      'date-fns',
    ],
    // Next 14: file-tracing includes live under experimental (top-level is
    // Next 15 syntax and is silently ignored). Ensures the privacy-policy
    // source HTML ships in the serverless bundle.
    outputFileTracingIncludes: {
      '/privacy-policy': ['./src/app/privacy-policy/privacy-policy-source.html'],
    },
  },
  /* Ezana API v1: documented URLs are ezana.world/v1/...; the router lives
     under /api/v1. */
  async rewrites() {
    return [{ source: '/v1/:path*', destination: '/api/v1/:path*' }];
  },
  async redirects() {
    return [
      /* The in-app Empire Rankings page was rebuilt on live data as the
         Global Empire Lighthouse dataset page. Query strings pass through, so
         an old ?layers= link lands on its mapped dimension. */
      {
        source: '/empire-ranking',
        destination: '/datasets/global-empire-lighthouse',
        permanent: true,
      },
      /* Inside the Capitol is no longer its own user help-centre category; its
         articles live under Research Tools. */
      {
        source: '/help-center/user/category/congressional-trading',
        destination: '/help-center/user/category/research',
        permanent: true,
      },
      /* Titans Shadow pages removed (Oct 2026, docs/cleanup/titans-pages-removal.md).
         The data, ingests and reads stay; old links land on the nearest page.
         Activist 13D/13G stakes now live in Whale Moves; Fund Holdings and
         SEC EDGAR (both /datasets/sec-filings) and Prices & Fundamentals
         (/datasets/markets) go to Institutional. A ?manager= link keeps its
         CIK so it opens Manager Fingerprint. */
      { source: '/datasets/activist', destination: '/datasets/whale-moves', permanent: true },
      {
        source: '/datasets/activist/:path*',
        destination: '/datasets/whale-moves',
        permanent: true,
      },
      {
        source: '/datasets/sec-filings',
        has: [{ type: 'query', key: 'manager' }],
        destination: '/datasets/institutional?manager=:manager',
        permanent: true,
      },
      { source: '/datasets/sec-filings', destination: '/datasets/institutional', permanent: true },
      {
        source: '/datasets/sec-filings/:path*',
        destination: '/datasets/institutional',
        permanent: true,
      },
      { source: '/datasets/markets', destination: '/datasets/institutional', permanent: true },
      {
        source: '/datasets/markets/:path*',
        destination: '/datasets/institutional',
        permanent: true,
      },
      { source: '/commodities-research', destination: '/alternative-markets', permanent: true },
      {
        source: '/commodities-research/:path*',
        destination: '/alternative-markets',
        permanent: true,
      },
      /* House and Senate disclosures merged into one Politician Tracker page
         with a chamber switch. Permanent, so anything linking an old path
         lands on the right chamber rather than a 404. The oldest path
         (/datasets/house-disclosures) previously hopped to the per-chamber
         route; it now points at the final destination directly rather than
         chaining two redirects. */
      {
        source: '/datasets/house-disclosures',
        destination: '/datasets/politician-tracker?chamber=house',
        permanent: true,
      },
      {
        source: '/datasets/house/disclosures',
        destination: '/datasets/politician-tracker?chamber=house',
        permanent: true,
      },
      {
        source: '/datasets/senate/disclosures',
        destination: '/datasets/politician-tracker?chamber=senate',
        permanent: true,
      },
      /* The per-chamber member pages were replaced by the tracker's member
         panel, which is addressed by ?member=<slug>. */
      {
        source: '/datasets/house/members/:slug',
        destination: '/datasets/politician-tracker?member=:slug',
        permanent: true,
      },
      {
        source: '/datasets/senate/members/:slug',
        destination: '/datasets/politician-tracker?member=:slug',
        permanent: true,
      },
      { source: '/crypto-research', destination: '/alternative-markets', permanent: true },
      { source: '/crypto-research/:path*', destination: '/alternative-markets', permanent: true },
    ];
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      // Long-cache static assets (images, fonts) so repeat visits don't re-download.
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2|ttf|otf)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    /* Politician portraits and other remote images change rarely; keeping
       the optimised encodes for 30 days means one cold encode per image, not
       one per minute of traffic (the default TTL is 60 seconds). */
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowSVG: false,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/**' },
      { protocol: 'https', hostname: 'financialmodelingprep.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.finnhub.io', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'logo.clearbit.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.plaid.com', pathname: '/**' },
      // Official public-domain congressional portraits (politician headshots).
      { protocol: 'https', hostname: 'unitedstates.github.io', pathname: '/images/congress/**' },
      { protocol: 'https', hostname: 'theunitedstates.io', pathname: '/images/congress/**' },
      { protocol: 'https', hostname: 'bioguide.congress.gov', pathname: '/**' },
    ],
  },
};

/* Sentry build-time options. Source-map upload + release tagging is
   gated on SENTRY_AUTH_TOKEN; when the token is missing (e.g. running
   `next build` locally without Sentry credentials) the plugin runs in
   "silent" mode and still applies its runtime wrappers, but skips the
   upload step. */
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,

  /* Upload broader source maps so original stack traces resolve in
     Sentry. Hidden so the maps are not served to end users. */
  widenClientFileUpload: true,
  hideSourceMaps: true,

  /* Tunnel browser events through a same-origin /monitoring route so
     ad-blockers don't block them in production. */
  tunnelRoute: '/monitoring',
};

/* Oct 16: Sentry turns on full "source-map" output for every server bundle.
   On a cold or mostly invalidated build that exhausts Vercel's 8 GB build
   machine and hits the 45-minute limit (BUILD_EXCEEDED_MAXIMUM_TIME). Keep
   Sentry's hidden client maps (readable browser stack traces) and skip
   server maps. */
const sentryWrapped = withSentryConfig(withBundleAnalyzer(nextConfig), sentryWebpackPluginOptions);
const sentryWebpack = sentryWrapped.webpack;
/* Nov 21: the build was OOM-killed on Vercel again (8 GB machine) after a
   large commit. Memory savers for production builds:
   - webpack's persistent cache is off. Measured on a cold build of this repo:
     with it, the server compile (194 pages + 758 API routes) passed 7 GB and
     was killed; without it the whole build peaked near 4 GB and finished in
     about 4 minutes. Restoring and re-serialising the ~1 GB cache was the
     single largest memory cost, and warm Vercel builds took about as long.
   - client source maps are generated only when SENTRY_AUTH_TOKEN is set,
     i.e. when they are actually uploaded; without the token they were built
     and thrown away.
   - webpack processes at most 25 modules in parallel (default 100), which
     lowers the peak memory of each compile for a small cost in build time.
   Dev builds are unchanged. */
sentryWrapped.webpack = (config, ctx) => {
  const out = typeof sentryWebpack === 'function' ? sentryWebpack(config, ctx) : config;
  if (!ctx.dev) {
    if (ctx.isServer) out.devtool = false;
    else if (!process.env.SENTRY_AUTH_TOKEN) out.devtool = false;
    out.parallelism = 25;
    out.cache = false;
  }
  return out;
};
module.exports = sentryWrapped;
