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

export const metadata = {
  title: 'Ezana Finance - Follow the moves that matter',
  description: 'Track congressional trades, analyze market intelligence, and manage your portfolio with institutional-grade tools.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking theme script — must be first, prevents dark flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
        (function() {
          try {
            var theme = localStorage.getItem('ezana-theme') || 'light';
            var root = document.documentElement;
            var body = document.body;
            root.style.colorScheme = 'light';
            if (theme === 'light') {
              root.style.backgroundColor = '#ffffff';
              if (body) body.style.backgroundColor = '#ffffff';
              root.classList.add('light-mode');
              if (body) body.classList.add('light-mode');
            } else {
              root.style.backgroundColor = '#0a0e13';
              if (body) body.style.backgroundColor = '#0a0e13';
              root.classList.remove('light-mode');
              if (body) body.classList.remove('light-mode');
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
      <body className="app-body">
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <ThemeProvider>
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
