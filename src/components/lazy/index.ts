'use client';

import { createLazyComponent } from '../LazyWrapper';

// Critical popups (preloaded)
export const LazyDepositPopup = createLazyComponent(
  () => import('../DepositPopup'),
  true // preload
);

export const LazyNotificationsModal = createLazyComponent(
  () => import('../NotificationsModal'),
  true // preload
);

export const LazySettingsPopup = createLazyComponent(
  () => import('../SettingsPopup'),
  true // preload
);

// Secondary popups (load on demand)
export const LazyHowToPlayPopup = createLazyComponent(() => import('../HowToPlayPopup'));
export const LazyNewsUpdatesPopup = createLazyComponent(() => import('../NewsUpdatesPopup'));
export const LazyRewardsPopup = createLazyComponent(() => import('../RewardsPopup'));
export const LazyPnLTrackerPopup = createLazyComponent(() => import('../PnLTrackerPopup'));
export const LazyCustomizePopup = createLazyComponent(() => import('../CustomizePopup'));
export const LazyWatchlistPopup = createLazyComponent(() => import('../WatchlistPopup'));
export const LazyPlayerTrackerPopup = createLazyComponent(() => import('../PlayerTrackerPopup'));
