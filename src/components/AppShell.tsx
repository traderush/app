'use client';
import React, { useRef } from 'react';
import Navbar from './Navbar';
import SidebarRail from './SidebarRail';
import Footer from './Footer';
// Lazy load popup components for better performance
const LazyDepositPopup = React.lazy(() => import('./DepositPopup'));
const LazyNotificationsModal = React.lazy(() => import('./NotificationsModal'));
const LazySettingsPopup = React.lazy(() => import('./SettingsPopup'));
const LazyHowToPlayPopup = React.lazy(() => import('./HowToPlayPopup'));
const LazyNewsUpdatesPopup = React.lazy(() => import('./NewsUpdatesPopup'));
const LazyRewardsPopup = React.lazy(() => import('./RewardsPopup'));
const LazyPnLTrackerPopup = React.lazy(() => import('./PnLTrackerPopup'));
const LazyCustomizePopup = React.lazy(() => import('./CustomizePopup'));
const LazyWatchlistPopup = React.lazy(() => import('./WatchlistPopup'));
const LazyPlayerTrackerPopup = React.lazy(() => import('./PlayerTrackerPopup'));
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CustomSlider from '@/components/CustomSlider';
import { useAppStore, useTradingStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';

const AppShellContent = React.memo(function AppShellContent({ children }: { children: React.ReactNode }) {
  // Get signature color from app store
  const signatureColor = useAppStore((state) => state.signatureColor);
  
  // Static connection status for demo purposes
  const isWebSocketConnected = true; // Demo mode - always connected
  const isBackendConnected = true; // Demo mode - always connected
  
  // App store - optimized batched subscriptions to prevent unnecessary re-renders
  const { layout, modals } = useAppStore(
    useShallow((state) => ({
      layout: state.layout,
      modals: state.modals,
    }))
  );
  const updateLayout = useAppStore((state) => state.updateLayout);
  const openModal = useAppStore((state) => state.openModal);
  const closeModal = useAppStore((state) => state.closeModal);
  
  // Trading store - optimized for player tracking
  const { watchedPlayers, selectedPlayer, isPlayerTrackerOpen } = useTradingStore(
    useShallow((state) => ({
      watchedPlayers: state.watchedPlayers,
      selectedPlayer: state.selectedPlayer,
      isPlayerTrackerOpen: state.isPlayerTrackerOpen,
    }))
  );
  const setSelectedPlayer = useTradingStore((state) => state.setSelectedPlayer);
  const setIsPlayerTrackerOpen = useTradingStore((state) => state.setIsPlayerTrackerOpen);
  
  // Modal hooks - using app store modals
  const depositModal = { isOpen: modals.deposit?.isOpen || false, open: () => openModal('deposit'), close: () => closeModal('deposit'), data: modals.deposit?.data };
  const notificationsModal = { isOpen: modals.notifications?.isOpen || false, open: () => openModal('notifications'), close: () => closeModal('notifications'), data: modals.notifications?.data };
  const settingsModal = { isOpen: modals.settings?.isOpen || false, open: () => openModal('settings'), close: () => closeModal('settings'), data: modals.settings?.data };
  const howToPlayModal = { isOpen: modals.howToPlay?.isOpen || false, open: () => openModal('howToPlay'), close: () => closeModal('howToPlay'), data: modals.howToPlay?.data };
  const newsUpdatesModal = { isOpen: modals.newsUpdates?.isOpen || false, open: () => openModal('newsUpdates'), close: () => closeModal('newsUpdates'), data: modals.newsUpdates?.data };
  const rewardsModal = { isOpen: modals.rewards?.isOpen || false, open: () => openModal('rewards'), close: () => closeModal('rewards'), data: modals.rewards?.data };
  const pnLTrackerModal = { isOpen: modals.pnLTracker?.isOpen || false, open: () => openModal('pnLTracker'), close: () => closeModal('pnLTracker'), data: modals.pnLTracker?.data };
  const customizeModal = { isOpen: modals.customize?.isOpen || false, open: () => openModal('customize'), close: () => closeModal('customize'), data: modals.customize?.data };
  const pnLCustomizeModal = { isOpen: modals.pnLCustomize?.isOpen || false, open: () => openModal('pnLCustomize'), close: () => closeModal('pnLCustomize'), data: modals.pnLCustomize?.data };
  const watchlistModal = { isOpen: modals.watchlist?.isOpen || false, open: () => openModal('watchlist'), close: () => closeModal('watchlist'), data: modals.watchlist?.data };
  
  // Memoized callbacks to prevent Footer re-renders
  const handlePnLTrackerToggle = React.useCallback(() => {
    if (pnLTrackerModal.isOpen) {
      pnLTrackerModal.close();
    } else {
      pnLTrackerModal.open();
    }
  }, [pnLTrackerModal]);

  const handleCustomizeOpen = React.useCallback(() => {
    customizeModal.open();
  }, [customizeModal]);

  // PnL customization state (could be moved to UI store later)
  const [pnLCustomization, setPnLCustomization] = React.useState({
    backgroundImage: 'https://www.carscoops.com/wp-content/uploads/2023/05/McLaren-750S-main.gif',
    backgroundOpacity: 100,
    backgroundBlur: 0,
    generalTextColor: '#ffffff', // Balance and general text
    balanceTextColor: '#ec397a', // Loss color (trading red)
    pnlTextColor: '#2fe3ac' // Profit color (trading green)
  });

  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const howToPlayButtonRef = useRef<HTMLButtonElement>(null);
  const newsUpdatesButtonRef = useRef<HTMLButtonElement>(null);
  const rewardsButtonRef = useRef<HTMLButtonElement>(null);
  const pnLTrackerButtonRef = useRef<HTMLButtonElement>(null);
  const customizeButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="text-zinc-100 min-h-screen" style={{backgroundColor: '#09090B'}}>
        {/* Fixed navbar */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar 
            onDepositOpen={() => depositModal.open()}
            onNotificationsOpen={() => notificationsModal.open()}
            notificationsButtonRef={notificationsButtonRef}
            onSettingsOpen={() => settingsModal.open()}
            settingsButtonRef={settingsButtonRef}
            onProfileOpen={() => {
              setSelectedPlayer({
                id: 'personal',
                username: 'Personal Profile',
                profit: 0,
                trades: 0,
                winRate: 0,
                avatar: 'https://i.imgflip.com/2/1vq853.jpg',
                level: 1,
                address: '0x1234...5678'
              });
              setIsPlayerTrackerOpen(true);
            }}
          />
        </div>
      
      {/* Fixed sidebar */}
      <div className="fixed left-0 top-14 z-30">
        <div className="relative">
          <SidebarRail 
            isCollapsed={layout.sidebarCollapsed} 
            onSettingsOpen={() => settingsModal.open()}
            settingsButtonRef={settingsButtonRef}
            onHowToPlayOpen={() => howToPlayModal.open()}
            howToPlayButtonRef={howToPlayButtonRef}
            onNewsUpdatesOpen={() => newsUpdatesModal.open()}
            newsUpdatesButtonRef={newsUpdatesButtonRef}
            onRewardsOpen={() => rewardsModal.open()}
            rewardsButtonRef={rewardsButtonRef}
            onWatchlistOpen={() => watchlistModal.open()}
            onPlayerClick={(player) => {
              setSelectedPlayer(player);
              setIsPlayerTrackerOpen(true);
            }}
            watchedPlayers={watchedPlayers}
            onSoundToggle={() => {
              // Call the global sound toggle function
              if (typeof window !== 'undefined' && (window as unknown as { toggleSound: () => void }).toggleSound) {
                (window as unknown as { toggleSound: () => void }).toggleSound();
              }
            }}
          />
          {/* Toggle button positioned outside the sidebar */}
          <button
            onClick={() => {
              console.log('Button clicked from AppShell!');
              updateLayout({ sidebarCollapsed: !layout.sidebarCollapsed });
            }}
            className="absolute -right-6 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-12 bg-zinc-800/60 border border-zinc-700/60 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700/80 transition-all z-20 rounded-r cursor-pointer"
            title={layout.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {layout.sidebarCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>
        </div>
      </div>
      
      {/* Main content with top and left margins for navbar and sidebar */}
      <main className={`pt-14 transition-all duration-300 ${layout.sidebarCollapsed ? 'ml-0' : 'ml-16'} min-h-[calc(100vh-56px-32px)]`}>
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(244,114,182,0.10),transparent)]" />
        <div className="w-full h-full">
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
      />
      
      {/* Deposit Modal */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 z-[1000]" />}>
        <LazyDepositPopup 
          isOpen={depositModal.isOpen} 
          onClose={() => depositModal.close()}
          triggerRef={{ current: null }}
        />
      </React.Suspense>
      
      {/* Notifications Popup */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 z-[1000]" />}>
        <LazyNotificationsModal 
          isOpen={notificationsModal.isOpen} 
          onClose={() => notificationsModal.close()}
          triggerRef={notificationsButtonRef}
        />
      </React.Suspense>
      
      {/* Settings Popup */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 z-[1000]" />}>
        <LazySettingsPopup 
          isOpen={settingsModal.isOpen} 
          onClose={() => settingsModal.close()}
          triggerRef={settingsButtonRef}
        />
      </React.Suspense>
      
      {/* How to Play Popup */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 z-[1000]" />}>
        <LazyHowToPlayPopup 
          isOpen={howToPlayModal.isOpen} 
          onClose={() => howToPlayModal.close()}
          triggerRef={howToPlayButtonRef}
        />
      </React.Suspense>
      
      {/* News & Updates Popup */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 z-[1000]" />}>
        <LazyNewsUpdatesPopup 
          isOpen={newsUpdatesModal.isOpen} 
          onClose={() => newsUpdatesModal.close()}
          triggerRef={newsUpdatesButtonRef}
        />
      </React.Suspense>
      
      {/* Rewards Popup */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 z-[1000]" />}>
        <LazyRewardsPopup 
          isOpen={rewardsModal.isOpen} 
          onClose={() => rewardsModal.close()}
          triggerRef={rewardsButtonRef}
        />
      </React.Suspense>
      
      {/* PnL Tracker Popup */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 z-[1000]" />}>
        <LazyPnLTrackerPopup 
          isOpen={pnLTrackerModal.isOpen} 
          onClose={() => pnLTrackerModal.close()}
          triggerRef={pnLTrackerButtonRef}
          isCustomizeOpen={pnLCustomizeModal.isOpen}
          onCustomizeOpen={() => pnLCustomizeModal.open()}
          onCustomizeClose={() => pnLCustomizeModal.close()}
          customization={pnLCustomization}
        />
      </React.Suspense>
      
      
      {/* Customize Popup */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 z-[1000]" />}>
        <LazyCustomizePopup 
          isOpen={customizeModal.isOpen} 
          onClose={() => customizeModal.close()}
          triggerRef={customizeButtonRef}
        />
      </React.Suspense>

      {/* PnL Customization Popup */}
      {pnLCustomizeModal.isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 z-[1000] transition-all duration-300 ease-out opacity-60"
            onClick={() => pnLCustomizeModal.close()}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[1001] flex items-center justify-center pointer-events-none">
            <div 
              className="w-80 border border-zinc-800 rounded shadow-2xl pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100"
              style={{ backgroundColor: '#0E0E0E' }}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Customize PnL Card</h2>
                <button
                  onClick={() => pnLCustomizeModal.close()}
                  className="grid place-items-center w-8 h-8 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-3 space-y-3">
                {/* Background Image */}
                <div className="p-2">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Background Image URL</span>
                  </div>
                  <input
                    type="text"
                    value={pnLCustomization.backgroundImage}
                    onChange={(e) => setPnLCustomization(prev => ({ ...prev, backgroundImage: e.target.value }))}
                    placeholder="Enter image URL"
                    className="w-full px-3 py-2 bg-zinc-700/50 border border-zinc-600 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 mt-2"
                  />
                </div>

                {/* Background Opacity */}
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Background Opacity</span>
                    <span className="text-zinc-400" style={{fontSize: '12px'}}>{pnLCustomization.backgroundOpacity}%</span>
                  </div>
                  <div className="mt-2">
                    <CustomSlider
                      min={0}
                      max={100}
                      step={1}
                      value={pnLCustomization.backgroundOpacity}
                      onChange={(value) => setPnLCustomization(prev => ({ ...prev, backgroundOpacity: value }))}
                      className="w-full"
                      signatureColor={signatureColor}
                    />
                  </div>
                </div>

                {/* Background Blur */}
                <div className="p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Background Blur</span>
                    <span className="text-zinc-400" style={{fontSize: '12px'}}>{pnLCustomization.backgroundBlur}px</span>
                  </div>
                  <div className="mt-2">
                    <CustomSlider
                      min={0}
                      max={8}
                      step={1}
                      value={pnLCustomization.backgroundBlur}
                      onChange={(value) => setPnLCustomization(prev => ({ ...prev, backgroundBlur: value }))}
                      className="w-full"
                      signatureColor={signatureColor}
                    />
                  </div>
                </div>

                {/* Text Colors */}
                <div className="p-2">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Text Colors</span>
                  </div>
                  
                  {/* Balance Text Color */}
                  <div className="flex items-center justify-between p-1">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Balance</span>
                    <input
                      type="color"
                      value={pnLCustomization.generalTextColor}
                      onChange={(e) => setPnLCustomization(prev => ({ ...prev, generalTextColor: e.target.value }))}
                      className="w-8 h-8 bg-zinc-700/50 border border-zinc-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Loss Text Color */}
                  <div className="flex items-center justify-between p-1">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Loss</span>
                    <input
                      type="color"
                      value={pnLCustomization.balanceTextColor}
                      onChange={(e) => setPnLCustomization(prev => ({ ...prev, balanceTextColor: e.target.value }))}
                      className="w-8 h-8 bg-zinc-700/50 border border-zinc-700/50 rounded cursor-pointer"
                    />
                  </div>

                  {/* PnL Text Color */}
                  <div className="flex items-center justify-between p-1">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Profit</span>
                    <input
                      type="color"
                      value={pnLCustomization.pnlTextColor}
                      onChange={(e) => setPnLCustomization(prev => ({ ...prev, pnlTextColor: e.target.value }))}
                      className="w-8 h-8 bg-zinc-700/50 border border-zinc-700/50 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Footer with Apply and Reset Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      setPnLCustomization({
                        backgroundImage: 'https://www.carscoops.com/wp-content/uploads/2023/05/McLaren-750S-main.gif',
                        backgroundOpacity: 100,
                        backgroundBlur: 0,
                        generalTextColor: '#ffffff', // Balance and general text
                        balanceTextColor: '#ec397a', // Loss color (trading red)
                        pnlTextColor: '#2fe3ac' // Profit color (trading green)
                      });
                    }}
                    className="flex items-center gap-1 text-zinc-400 hover:text-zinc-300 transition-colors" style={{fontSize: '12px'}}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                    Reset to Default
                  </button>
                  <button
                    onClick={() => pnLCustomizeModal.close()}
                    className="px-4 py-2 font-medium rounded transition-colors"
                    style={{ 
                      backgroundColor: signatureColor,
                      color: '#09090B',
                      fontSize: '12px'
                    }}
                  >
                    <span style={{ color: '#09090B' }}>Apply</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
        
        {/* Watchlist Popup */}
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 z-[1000]" />}>
          <LazyWatchlistPopup
            isOpen={watchlistModal.isOpen}
            onClose={() => watchlistModal.close()}
          />
        </React.Suspense>

        {/* Player Tracker Popup */}
        <React.Suspense fallback={<div className="fixed inset-0 bg-black/60 z-[1000]" />}>
          <LazyPlayerTrackerPopup
            isOpen={isPlayerTrackerOpen}
            onClose={() => {
              setIsPlayerTrackerOpen(false);
              setSelectedPlayer(null);
            }}
            player={selectedPlayer}
          />
        </React.Suspense>
    </div>
  );
});

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <AppShellContent>{children}</AppShellContent>;
}
