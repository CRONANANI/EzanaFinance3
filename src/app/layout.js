import './globals.css';
import { Suspense } from 'react';
import { headers } from 'next/headers';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { validateEnv } from '@/lib/env';

/* Self-host the two fonts we actually use. This replaces the render-blocking
   <link href="https://fonts.googleapis.com/..."> pair that used to sit in
   <head>. next/font inlines font-face declarations, preloads the files, and
   swaps via font-display:swap so the first paint is never blocked on the
   Google Fonts round-trip. Only the weights actually used across the app
   are loaded; Latin subset only. */
const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  fallback: ['ui-monospace', 'Menlo', 'Consolas', 'monospace'],
});

validateEnv();
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { ProGateProvider } from '@/components/upgrade/ProGateContext';
import { PartnerProvider } from '@/contexts/PartnerContext';
import { OrgProvider } from '@/contexts/OrgContext';
import { CongressProvider } from '@/contexts/CongressContext';
import { PinnedCardsProvider } from '@/contexts/PinnedCardsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ActiveTaskProvider } from '@/contexts/ActiveTaskContext';
import { ConditionalNavbar } from '@/components/Layout/ConditionalNavbar';
import { PartnerChromeEffects } from '@/components/partner/PartnerChromeEffects';
import { getServerTheme } from '@/lib/user-preferences/server';
import { resolveRouteShellClasses } from '@/lib/route-shell';

/* Force dynamic rendering on every route. The root layout reads `cookies()`
   (inside getServerTheme) and the forwarded `x-pathname` header, both of
   which are per-request — so caching the layout/HTML would ship stale theme
   classes to logged-in users on Home / Dashboard (the exact split-theme
   flash this fix is eliminating). Explicit opt-out keeps the intent
   obvious and prevents a future `export const` elsewhere from flipping
   any route back to static. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'Ezana Finance - Follow the moves that matter',
  description: 'Track congressional trades, analyze market intelligence, and manage your portfolio with institutional-grade tools.',
};

export default async function RootLayout({ children }) {
  /* Resolve the user's theme server-side so the correct class is part of the
     SSR HTML *before* the browser paints. This prevents the split-theme
     flash on first load / login where the nav rendered dark while the
     main content rendered light. */
  const initialTheme = await getServerTheme();
  const isDark = initialTheme === 'dark';

  /* Read the request pathname forwarded by middleware so we can pre-apply
     route-scoped body classes (`dashboard-page`, `route-regular-dashboard`,
     `route-market-analysis`). Historically these were set by a useEffect
     inside the dashboard layout, which meant the first paint was missing
     them — the root cause of the "nav dark, content light" split that
     resolved only after client-side navigation to another dashboard
     route. Setting them in SSR eliminates that race. */
  const pathname = headers().get('x-pathname') ?? '';
  const routeShellClasses = resolveRouteShellClasses(pathname);

  const bodyClassName = ['app-body', isDark ? null : 'light-mode', ...routeShellClasses]
    .filter(Boolean)
    .join(' ');

  const htmlClassName = isDark ? 'dark' : 'light-mode';
  const htmlStyle = isDark
    ? { backgroundColor: '#0a0e13', colorScheme: 'light' }
    : { backgroundColor: '#ffffff', colorScheme: 'light' };

  const fontClassName = `${plusJakartaSans.variable} ${jetBrainsMono.variable}`;

  return (
    <html
      lang="en"
      className={`${htmlClassName} ${fontClassName}`}
      style={htmlStyle}
      suppressHydrationWarning
    >
      <head>
        {/* Blocking theme script — must be first, prevents theme flash.

            Priority: server-resolved initialTheme > ezana.theme cookie.

            WHY NOT COOKIE-FIRST ANYMORE:
            When a logged-in user has a *stale* ezana.theme cookie (e.g. a
            cookie from a previous anonymous browsing session), putting the
            cookie first caused a three-way split on first paint:
              - server rendered html.light-mode + body.light-mode
              - blocking script stripped light-mode because cookie=dark
              - nav + body background then resolved to the DARK token while
                inner cards were already committed to their light styling
            …i.e. the "black frame around light content" bug on Home,
            Dashboard, and Messages after fresh login.

            The server already does the right fallback chain
            (profiles.user_settings.theme → cookie → 'light') inside
            getServerTheme(), so initialTheme is the authoritative value.
            We keep the cookie as a secondary signal only — ThemeProvider
            re-writes it on mount so it can never drift again. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
        (function() {
          try {
            var serverTheme = '${initialTheme}';
            var theme = (serverTheme === 'dark' || serverTheme === 'light') ? serverTheme : null;
            if (!theme) {
              var cookieMatch = document.cookie.match(/(?:^|;\\s*)ezana\\.theme=([^;]+)/);
              var cookieTheme = cookieMatch ? cookieMatch[1] : null;
              theme = (cookieTheme === 'dark' || cookieTheme === 'light') ? cookieTheme : 'light';
            }
            var root = document.documentElement;
            var body = document.body;
            root.style.colorScheme = 'light';
            if (theme === 'dark') {
              root.classList.add('dark');
              root.classList.remove('light-mode');
              root.style.backgroundColor = '#0a0e13';
              if (body) {
                body.classList.remove('light-mode');
                body.style.backgroundColor = '#0a0e13';
              }
            } else {
              root.classList.add('light-mode');
              root.classList.remove('dark');
              root.style.backgroundColor = '#ffffff';
              if (body) {
                body.classList.add('light-mode');
                body.style.backgroundColor = '#ffffff';
              }
            }
          } catch (e) {
            document.documentElement.classList.add('light-mode');
            document.documentElement.style.backgroundColor = '#ffffff';
            document.documentElement.style.colorScheme = 'light';
          }
        })();
      `,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Bootstrap Icons: preconnect so the jsdelivr CDN is warmed early,
            preload the stylesheet so it races with other assets, then attach
            it non-blocking via media="print" → "all" swap. This removes the
            render-blocking CSS request from the critical path (Lighthouse
            flagged the old <link rel="stylesheet"> as a top opportunity on
            both mobile and desktop). React SSR doesn't serialize onload
            attributes, so we emit the whole block as raw HTML. noscript
            fallback keeps icons working for users with JS disabled. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="preload"
          as="style"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var l=document.querySelector('link[href*=\"bootstrap-icons\"][media=\"print\"]');if(l){l.media='all';}})();",
          }}
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
          />
        </noscript>
      </head>
      <body className={bodyClassName} suppressHydrationWarning>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <ThemeProvider initialTheme={initialTheme}>
          <AuthProvider>
            <ProGateProvider>
            <SettingsProvider>
              <ActiveTaskProvider>
                <PartnerProvider>
                  <OrgProvider>
                  <CongressProvider>
                    <PinnedCardsProvider>
                      <ToastProvider>
                        <Suspense fallback={<nav className="main-nav" style={{ minHeight: 64 }} />}>
                          <ConditionalNavbar />
                        </Suspense>
                        <PartnerChromeEffects />
                        {children}
                      </ToastProvider>
                    </PinnedCardsProvider>
                  </CongressProvider>
                  </OrgProvider>
                </PartnerProvider>
              </ActiveTaskProvider>
            </SettingsProvider>
            </ProGateProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
