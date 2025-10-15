import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import GlobalToast from '@/components/GlobalToast';
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
          <GlobalToast />
          {/* <PerformanceDashboard /> - Temporarily disabled to prevent infinite loops */}
        </ErrorBoundary>
      </body>
    </html>
  );
}
