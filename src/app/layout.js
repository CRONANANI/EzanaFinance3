import './globals.css';
import { Suspense } from 'react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { CongressProvider } from '@/contexts/CongressContext';
import { PinProvider } from '@/contexts/PinContext';
import { Navbar } from '@/components/Layout/Navbar';

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
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
        />
      </head>
      <body className="app-body" style={{ backgroundColor: '#0f1419', color: '#ffffff' }}>
        <ThemeProvider>
          <AuthProvider>
            <CongressProvider>
              <PinProvider>
                <Suspense fallback={<nav className="main-nav" style={{ minHeight: 64 }} />}>
                  <Navbar />
                </Suspense>
                {children}
              </PinProvider>
            </CongressProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
