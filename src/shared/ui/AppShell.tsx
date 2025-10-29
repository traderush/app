'use client';

import React, { memo, useCallback } from 'react';
import Navbar from './Navbar';
import SidebarRail from './SidebarRail';
import Footer from './Footer';
import AppShellModals from './AppShellModals';
import { useUIStore, usePlayerStore, useModal, type WatchedPlayer } from '@/shared/state';

type ModalController = ReturnType<typeof useModal>;

type AppModals = {
  deposit: ModalController;
  notifications: ModalController;
  settings: ModalController;
  howToPlay: ModalController;
  newsUpdates: ModalController;
  rewards: ModalController;
  pnLTracker: ModalController;
  customize: ModalController;
  watchlist: ModalController;
  pnLCustomize: ModalController;
};

const useAppModals = (): AppModals => ({
  deposit: useModal('deposit'),
  notifications: useModal('notifications'),
  settings: useModal('settings'),
  howToPlay: useModal('howToPlay'),
  newsUpdates: useModal('newsUpdates'),
  rewards: useModal('rewards'),
  pnLTracker: useModal('pnLTracker'),
  customize: useModal('customize'),
  watchlist: useModal('watchlist'),
  pnLCustomize: useModal('pnLCustomize'),
});

const useAppModalRefs = () => ({
  depositButtonRef: React.useRef<HTMLButtonElement | null>(null),
  notificationsButtonRef: React.useRef<HTMLButtonElement | null>(null),
  settingsButtonRef: React.useRef<HTMLButtonElement | null>(null),
  howToPlayButtonRef: React.useRef<HTMLButtonElement | null>(null),
  newsUpdatesButtonRef: React.useRef<HTMLButtonElement | null>(null),
  rewardsButtonRef: React.useRef<HTMLButtonElement | null>(null),
  pnLTrackerButtonRef: React.useRef<HTMLButtonElement | null>(null),
  customizeButtonRef: React.useRef<HTMLButtonElement | null>(null),
});

const AppShellContent = memo(function AppShellContent({ children }: { children: React.ReactNode }) {
  const signatureColor = useUIStore((state) => state.signatureColor);
  const sidebarCollapsed = useUIStore((state) => state.layout.sidebarCollapsed);
  const watchedPlayers = usePlayerStore((state) => state.watchedPlayers);
  const selectedPlayer = usePlayerStore((state) => state.selectedPlayer);
  const setSelectedPlayer = usePlayerStore((state) => state.setSelectedPlayer);
  const isPlayerTrackerOpen = usePlayerStore((state) => state.isPlayerTrackerOpen);
  const setIsPlayerTrackerOpen = usePlayerStore((state) => state.setIsPlayerTrackerOpen);
  const setWatchedPlayers = usePlayerStore((state) => state.setWatchedPlayers);

  const modals = useAppModals();
  const modalRefs = useAppModalRefs();

  const {
    deposit,
    notifications,
    settings,
    howToPlay,
    newsUpdates,
    rewards,
    pnLTracker,
    customize,
    watchlist,
    pnLCustomize,
  } = modals;

  const {
    depositButtonRef,
    notificationsButtonRef,
    settingsButtonRef,
    howToPlayButtonRef,
    newsUpdatesButtonRef,
    rewardsButtonRef,
    pnLTrackerButtonRef,
    customizeButtonRef,
  } = modalRefs;

  const isWebSocketConnected = true;
  const isBackendConnected = true;

  const openPlayerTracker = useCallback(
    (player: WatchedPlayer) => {
      setSelectedPlayer(player);
      setIsPlayerTrackerOpen(true);
    },
    [setIsPlayerTrackerOpen, setSelectedPlayer],
  );

  const handlePlayerProfileOpen = useCallback(() => {
    openPlayerTracker({
      id: 'personal',
      name: 'Personal Profile',
      address: '0x1234...5678',
      avatar: 'https://i.imgflip.com/2/1vq853.jpg',
      game: 'Box Hit',
      isOnline: true,
    });
  }, [openPlayerTracker]);

  const handlePlayerTrackerClose = useCallback(() => {
    setIsPlayerTrackerOpen(false);
    setSelectedPlayer(null);
  }, [setIsPlayerTrackerOpen, setSelectedPlayer]);

  const handleWatchedPlayersUpdate = useCallback<React.Dispatch<React.SetStateAction<WatchedPlayer[]>>>(
    (updater) => {
      const current = usePlayerStore.getState().watchedPlayers;
      const next = typeof updater === 'function' ? updater(current) : updater;
      setWatchedPlayers(next);
    },
    [setWatchedPlayers],
  );

  const handleSoundToggle = useCallback(() => {
    if (typeof window !== 'undefined') {
      (window as typeof window & { toggleSound?: () => void }).toggleSound?.();
    }
  }, []);

  const handlePnLTrackerToggle = useCallback(() => {
    if (pnLTracker.isOpen) {
      pnLTracker.close();
    } else {
      pnLTracker.open();
    }
  }, [pnLTracker]);

  const handleCustomizeOpen = useCallback(() => {
    customize.open();
  }, [customize]);

  return (
    <div className="min-h-screen bg-background text-zinc-100">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar
          onDepositOpen={deposit.open}
          depositButtonRef={depositButtonRef}
          onNotificationsOpen={notifications.open}
          notificationsButtonRef={notificationsButtonRef}
          onProfileOpen={handlePlayerProfileOpen}
          onNewsUpdatesOpen={newsUpdates.open}
          newsUpdatesButtonRef={newsUpdatesButtonRef}
        />
      </div>

      <div className="fixed left-0 top-14 z-30 w-16">
        <div className="relative">
          <SidebarRail
            isCollapsed={sidebarCollapsed}
            onSettingsOpen={settings.open}
            settingsButtonRef={settingsButtonRef}
            onHowToPlayOpen={howToPlay.open}
            howToPlayButtonRef={howToPlayButtonRef}
            onRewardsOpen={rewards.open}
            rewardsButtonRef={rewardsButtonRef}
            onWatchlistOpen={watchlist.open}
            onPlayerClick={openPlayerTracker}
            watchedPlayers={watchedPlayers}
            onSoundToggle={handleSoundToggle}
          />
        </div>
      </div>

      <main
        className={`relative flex h-[calc(100vh-32px)] min-h-[calc(100vh-32px)] flex-col overflow-hidden pt-14 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-0' : 'ml-16'
        }`}
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(244,114,182,0.10),transparent)]" />
        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-auto [&>*]:min-h-0 [&>*]:flex-1">
          {children}
        </div>
      </main>

      <Footer
        onPnLTrackerOpen={handlePnLTrackerToggle}
        pnLTrackerButtonRef={pnLTrackerButtonRef}
        onCustomizeOpen={handleCustomizeOpen}
        customizeButtonRef={customizeButtonRef}
        isWebSocketConnected={isWebSocketConnected}
        isBackendConnected={isBackendConnected}
        onSettingsOpen={settings.open}
        settingsButtonRef={settingsButtonRef}
      />

      <AppShellModals
        signatureColor={signatureColor}
        modalRefs={{
          notificationsButtonRef,
          settingsButtonRef,
          howToPlayButtonRef,
          newsUpdatesButtonRef,
          rewardsButtonRef,
          customizeButtonRef,
        }}
        modals={{
          deposit,
          notifications,
          settings,
          howToPlay,
          newsUpdates,
          rewards,
          pnLTracker,
          customize,
          watchlist,
          pnLCustomize,
        }}
        watchedPlayers={watchedPlayers}
        onUpdateWatchedPlayers={handleWatchedPlayersUpdate}
        isPlayerTrackerOpen={isPlayerTrackerOpen}
        selectedPlayer={selectedPlayer}
        onClosePlayerTracker={handlePlayerTrackerClose}
      />
    </div>
  );
});

AppShellContent.displayName = 'AppShellContent';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellContent>{children}</AppShellContent>;
}
