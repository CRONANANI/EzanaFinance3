import './globals.css';
import { Suspense } from 'react';
import { validateEnv } from '@/lib/env';

validateEnv();
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { PartnerProvider } from '@/contexts/PartnerContext';
import { CongressProvider } from '@/contexts/CongressContext';
import { PinnedCardsProvider } from '@/contexts/PinnedCardsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ActiveTaskProvider } from '@/contexts/ActiveTaskContext';
import { ConditionalNavbar } from '@/components/Layout/ConditionalNavbar';

export const metadata = {
  title: 'Ezana Finance - Follow the moves that matter',
  description: 'Track congressional trades, analyze market intelligence, and manage your portfolio with institutional-grade tools.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      <body className="app-body" style={{ backgroundColor: '#0f1419', color: '#ffffff' }}>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              <ActiveTaskProvider>
                <PartnerProvider>
                  <CongressProvider>
                    <PinnedCardsProvider>
                      <ToastProvider>
                        <Suspense fallback={<nav className="main-nav" style={{ minHeight: 64 }} />}>
                          <ConditionalNavbar />
                        </Suspense>
                        {children}
                      </ToastProvider>
                    </PinnedCardsProvider>
                  </CongressProvider>
                </PartnerProvider>
              </ActiveTaskProvider>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
