import './globals.css';
import { Suspense } from 'react';
import { validateEnv } from '@/lib/env';

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

  const htmlClassName = isDark ? 'dark' : 'light-mode';
  const htmlStyle = isDark
    ? { backgroundColor: '#0a0e13', colorScheme: 'light' }
    : { backgroundColor: '#ffffff', colorScheme: 'light' };

  return (
    <html
      lang="en"
      className={htmlClassName}
      style={htmlStyle}
      suppressHydrationWarning
    >
      <head>
        {/* Blocking theme script — must be first, prevents theme flash.
            Priority: ezana.theme cookie > server-resolved initialTheme.
            The cookie lets the client reflect a local preference change
            across reloads even before the server has re-read profiles. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
        (function() {
          try {
            var cookieMatch = document.cookie.match(/(?:^|;\\s*)ezana\\.theme=([^;]+)/);
            var cookieTheme = cookieMatch ? cookieMatch[1] : null;
            var theme = (cookieTheme === 'dark' || cookieTheme === 'light')
              ? cookieTheme
              : '${initialTheme}';
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
        />
      </head>
      <body className={`app-body ${isDark ? '' : 'light-mode'}`}>
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
