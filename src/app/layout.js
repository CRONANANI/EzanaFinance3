import '@/app/globals.css';
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
