import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import { PerformanceDashboard } from '@/utils/performance';

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
          <PerformanceDashboard />
        </ErrorBoundary>
      </body>
    </html>
  );
}
