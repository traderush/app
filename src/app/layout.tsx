import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/shared/ui/AppShell';
import ErrorBoundary from '@/shared/ui/ErrorBoundary';

export const metadata: Metadata = {
  title: 'TradeRush',
  description: 'Push, Play, Profit.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <AppShell>{children}</AppShell>
          {/* <PerformanceDashboard /> - Temporarily disabled to prevent infinite loops */}
        </ErrorBoundary>
      </body>
    </html>
  );
}
