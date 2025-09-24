'use client';
import React, { useRef } from 'react';
import Navbar from './Navbar';
import SidebarRail from './SidebarRail';
import Footer from './Footer';
import DepositPopup from './DepositPopup';
import NotificationsPopup from './NotificationsModal';
import SettingsPopup from './SettingsPopup';
import HowToPlayPopup from './HowToPlayPopup';
import NewsUpdatesPopup from './NewsUpdatesPopup';
import RewardsPopup from './RewardsPopup';
import PnLTrackerPopup from './PnLTrackerPopup';
import CustomizePopup from './CustomizePopup';
import WatchlistPopup from './WatchlistPopup';
import PlayerTrackerPopup from './PlayerTrackerPopup';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SignatureColorProvider, useSignatureColor } from '@/contexts/SignatureColorContext';
import CustomSlider from '@/components/CustomSlider';
import { useUIStore, usePlayerStore, useModal } from '@/stores';

const AppShellContent = React.memo(function AppShellContent({ children }: { children: React.ReactNode }) {
  const { signatureColor } = useSignatureColor();
  
  // Zustand stores
  const { layout, updateLayout, pnLCustomization, updatePnLCustomization } = useUIStore();
  const { watchedPlayers, selectedPlayer, setSelectedPlayer, setIsPlayerTrackerOpen } = usePlayerStore();
  
  // Modal hooks
  const depositModal = useModal('deposit');
  const notificationsModal = useModal('notifications');
  const settingsModal = useModal('settings');
  const howToPlayModal = useModal('howToPlay');
  const newsUpdatesModal = useModal('newsUpdates');
  const rewardsModal = useModal('rewards');
  const pnLTrackerModal = useModal('pnLTracker');
  const customizeModal = useModal('customize');
  const pnLCustomizeModal = useModal('pnLCustomize');
  const watchlistModal = useModal('watchlist');
  
  // PnL customization is now managed by Zustand store

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
                name: 'Personal Profile',
                address: '0x1234...5678',
                avatar: 'https://i.imgflip.com/2/1vq853.jpg',
                game: 'Box Hit',
                isOnline: true
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
        onPnLTrackerOpen={() => pnLTrackerModal.isOpen ? pnLTrackerModal.close() : pnLTrackerModal.open()}
        pnLTrackerButtonRef={pnLTrackerButtonRef}
        onCustomizeOpen={() => customizeModal.open()}
        customizeButtonRef={customizeButtonRef}
      />
      
      {/* Deposit Modal */}
      <DepositPopup 
        isOpen={depositModal.isOpen} 
        onClose={() => depositModal.close()}
        triggerRef={{ current: null }}
      />
      
      {/* Notifications Popup */}
      <NotificationsPopup 
        isOpen={notificationsModal.isOpen} 
        onClose={() => notificationsModal.close()}
        triggerRef={notificationsButtonRef}
      />
      
      {/* Settings Popup */}
      <SettingsPopup 
        isOpen={settingsModal.isOpen} 
        onClose={() => settingsModal.close()}
        triggerRef={settingsButtonRef}
      />
      
      {/* How to Play Popup */}
      <HowToPlayPopup 
        isOpen={howToPlayModal.isOpen} 
        onClose={() => howToPlayModal.close()}
        triggerRef={howToPlayButtonRef}
      />
      
      {/* News & Updates Popup */}
      <NewsUpdatesPopup 
        isOpen={newsUpdatesModal.isOpen} 
        onClose={() => newsUpdatesModal.close()}
        triggerRef={newsUpdatesButtonRef}
      />
      
      {/* Rewards Popup */}
      <RewardsPopup 
        isOpen={rewardsModal.isOpen} 
        onClose={() => rewardsModal.close()}
        triggerRef={rewardsButtonRef}
      />
      
      {/* PnL Tracker Popup */}
      <PnLTrackerPopup 
        isOpen={pnLTrackerModal.isOpen} 
        onClose={() => pnLTrackerModal.close()}
        triggerRef={pnLTrackerButtonRef}
        isCustomizeOpen={pnLCustomizeModal.isOpen}
        onCustomizeOpen={() => pnLCustomizeModal.open()}
        onCustomizeClose={() => pnLCustomizeModal.close()}
        customization={pnLCustomization}
      />
      
      
      {/* Customize Popup */}
      <CustomizePopup 
        isOpen={customizeModal.isOpen} 
        onClose={() => customizeModal.close()}
        triggerRef={customizeButtonRef}
      />

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
                    onChange={(e) => updatePnLCustomization({ backgroundImage: e.target.value })}
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
                      onChange={(value) => updatePnLCustomization({ backgroundOpacity: value })}
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
                      onChange={(value) => updatePnLCustomization({ backgroundBlur: value })}
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
                  
                  {/* General Text Color */}
                  <div className="flex items-center justify-between p-1">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Main</span>
                    <input
                      type="color"
                      value={pnLCustomization.generalTextColor}
                      onChange={(e) => updatePnLCustomization({ generalTextColor: e.target.value })}
                      className="w-8 h-8 bg-zinc-700/50 border border-zinc-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Balance Text Color */}
                  <div className="flex items-center justify-between p-1">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Loss</span>
                    <input
                      type="color"
                      value={pnLCustomization.balanceTextColor}
                      onChange={(e) => updatePnLCustomization({ balanceTextColor: e.target.value })}
                      className="w-8 h-8 bg-zinc-700/50 border border-zinc-700/50 rounded cursor-pointer"
                    />
                  </div>

                  {/* PnL Text Color */}
                  <div className="flex items-center justify-between p-1">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Profit</span>
                    <input
                      type="color"
                      value={pnLCustomization.pnlTextColor}
                      onChange={(e) => updatePnLCustomization({ pnlTextColor: e.target.value })}
                      className="w-8 h-8 bg-zinc-700/50 border border-zinc-700/50 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Footer with Apply and Reset Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => {
                      updatePnLCustomization({
                        backgroundImage: 'https://www.carscoops.com/wp-content/uploads/2023/05/McLaren-750S-main.gif',
                        backgroundOpacity: 100,
                        backgroundBlur: 0,
                        generalTextColor: '#ffffff',
                        balanceTextColor: '#ffffff',
                        pnlTextColor: '#2fe3ac'
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
        <WatchlistPopup
          isOpen={watchlistModal.isOpen}
          onClose={() => watchlistModal.close()}
          watchedPlayers={watchedPlayers}
          setWatchedPlayers={(players) => {
            const currentPlayers = usePlayerStore.getState().watchedPlayers;
            const newPlayers = typeof players === 'function' ? players(currentPlayers) : players;
            usePlayerStore.getState().setWatchedPlayers(newPlayers);
          }}
        />

        {/* Player Tracker Popup */}
        <PlayerTrackerPopup
          isOpen={usePlayerStore.getState().isPlayerTrackerOpen}
          onClose={() => {
            setIsPlayerTrackerOpen(false);
            setSelectedPlayer(null);
          }}
          player={selectedPlayer}
        />
    </div>
  );
});

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SignatureColorProvider>
      <AppShellContent>{children}</AppShellContent>
    </SignatureColorProvider>
  );
}
