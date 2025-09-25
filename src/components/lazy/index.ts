'use client';

import { createLazyComponent } from '../LazyWrapper';

// Lazy load heavy components
export const LazyChartCanvas = createLazyComponent(
  () => import('../ChartCanvas') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyGameCanvas = createLazyComponent(
  () => import('../../games/box-hit/GameCanvas') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyPriceFeedManager = createLazyComponent(
  () => import('../../games/box-hit/PriceFeedManager') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyPositionsTable = createLazyComponent(
  () => import('../../games/box-hit/PositionsTable') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyRightPanel = createLazyComponent(
  () => import('../../games/box-hit/RightPanel') as Promise<{ default: React.ComponentType<any> }>
);

// Lazy load popup components
export const LazyDepositPopup = createLazyComponent(
  () => import('../DepositPopup') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyNotificationsModal = createLazyComponent(
  () => import('../NotificationsModal') as Promise<{ default: React.ComponentType<any> }>
);

export const LazySettingsPopup = createLazyComponent(
  () => import('../SettingsPopup') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyHowToPlayPopup = createLazyComponent(
  () => import('../HowToPlayPopup') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyNewsUpdatesPopup = createLazyComponent(
  () => import('../NewsUpdatesPopup') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyRewardsPopup = createLazyComponent(
  () => import('../RewardsPopup') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyPnLTrackerPopup = createLazyComponent(
  () => import('../PnLTrackerPopup') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyCustomizePopup = createLazyComponent(
  () => import('../CustomizePopup') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyWatchlistPopup = createLazyComponent(
  () => import('../WatchlistPopup') as Promise<{ default: React.ComponentType<any> }>
);

export const LazyPlayerTrackerPopup = createLazyComponent(
  () => import('../PlayerTrackerPopup') as Promise<{ default: React.ComponentType<any> }>
);
