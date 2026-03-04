import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import { CongressProvider } from '@/contexts/CongressContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { Navbar } from '@/components/Layout/Navbar';

export const metadata = {
  title: 'Ezana Finance - Follow the moves that matter',
  description: 'Track congressional trades, analyze market intelligence, and manage your portfolio with institutional-grade tools.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      <body>
        <ThemeProvider>
          <AuthProvider>
            <CongressProvider>
              <SidebarProvider>
                <Navbar />
                {children}
              </SidebarProvider>
            </CongressProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
