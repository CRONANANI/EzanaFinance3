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
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.vercel-insights.com https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
      "connect-src 'self' https://api.open-meteo.com https://archive-api.open-meteo.com https://www.alphavantage.co https://financialmodelingprep.com https://finnhub.io https://api.stripe.com https://gamma-api.polymarket.com https://clob.polymarket.com https://*.supabase.co wss://*.supabase.co https://*.alpaca.markets https://*.vercel-insights.com https://*.finnhub.io wss://*.finnhub.io https://*.vercel.live https://api.anthropic.com https://raw.githubusercontent.com https://*.sentry.io",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
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
    optimizePackageImports: [
      'lucide-react',
      'react-icons',
      'framer-motion',
      'recharts',
      '@radix-ui/react-accordion',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      'date-fns',
    ],
  },
  outputFileTracingIncludes: {
    '/privacy-policy': ['./src/app/privacy-policy/privacy-policy-source.html'],
  },
  async redirects() {
    return [
      { source: '/commodities-research', destination: '/alternative-markets', permanent: true },
      {
        source: '/commodities-research/:path*',
        destination: '/alternative-markets',
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
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: 'https', hostname: '**', pathname: '/**' },
      { protocol: 'http', hostname: '**', pathname: '/**' },
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

module.exports = withSentryConfig(withBundleAnalyzer(nextConfig), sentryWebpackPluginOptions);
