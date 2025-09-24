'use client';

import { createLazyComponent } from '../LazyWrapper';

// Lazy load heavy components
export const LazyChartCanvas = createLazyComponent(
  () => import('../ChartCanvas')
);

export const LazyGameCanvas = createLazyComponent(
  () => import('../../games/box-hit/GameCanvas')
);

export const LazyPriceFeedManager = createLazyComponent(
  () => import('../../games/box-hit/PriceFeedManager')
);

export const LazyPositionsTable = createLazyComponent(
  () => import('../../games/box-hit/PositionsTable')
);

export const LazyRightPanel = createLazyComponent(
  () => import('../../games/box-hit/RightPanel')
);

// Lazy load popup components
export const LazyDepositPopup = createLazyComponent(
  () => import('../DepositPopup')
);

export const LazyNotificationsModal = createLazyComponent(
  () => import('../NotificationsModal')
);

export const LazySettingsPopup = createLazyComponent(
  () => import('../SettingsPopup')
);

export const LazyHowToPlayPopup = createLazyComponent(
  () => import('../HowToPlayPopup')
);

export const LazyNewsUpdatesPopup = createLazyComponent(
  () => import('../NewsUpdatesPopup')
);

export const LazyRewardsPopup = createLazyComponent(
  () => import('../RewardsPopup')
);

export const LazyPnLTrackerPopup = createLazyComponent(
  () => import('../PnLTrackerPopup')
);

export const LazyCustomizePopup = createLazyComponent(
  () => import('../CustomizePopup')
);

export const LazyWatchlistPopup = createLazyComponent(
  () => import('../WatchlistPopup')
);

export const LazyPlayerTrackerPopup = createLazyComponent(
  () => import('../PlayerTrackerPopup')
);
