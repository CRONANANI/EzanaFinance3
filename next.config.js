/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  reactStrictMode: true,
  // Next.js-built-in import optimizer. For the listed packages, Next rewrites
  // named-member imports to direct submodule imports and enables aggressive
  // tree-shaking. lucide-react in particular ships >1000 icons; without this,
  // the bundler sometimes bundles the whole icon set into the shared chunk.
  // framer-motion benefits by pulling in only the features used on a page.
  experimental: {
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
  async redirects() {
    return [
      { source: '/commodities-research', destination: '/alternative-markets', permanent: true },
      { source: '/commodities-research/:path*', destination: '/alternative-markets', permanent: true },
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
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
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

module.exports = withBundleAnalyzer(nextConfig);
