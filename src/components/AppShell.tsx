'use client';
import { useState, useRef, useEffect } from 'react';
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

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { signatureColor } = useSignatureColor();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [isNewsUpdatesOpen, setIsNewsUpdatesOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isPnLTrackerOpen, setIsPnLTrackerOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [isPnLCustomizeOpen, setIsPnLCustomizeOpen] = useState(false);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [isPlayerTrackerOpen, setIsPlayerTrackerOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    id: string;
    name: string;
    address: string;
    avatar: string;
    game: string;
    isOnline: boolean;
  } | null>(null);
  const [watchedPlayers, setWatchedPlayers] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('watchedPlayers');
      if (saved) {
        return JSON.parse(saved);
      } else {
        // Default watchlist with 4 users
        const defaultWatchlist = [
          {
            id: '1',
            name: 'CryptoTrader',
            address: '0x1234...5678',
            avatar: 'https://pbs.twimg.com/profile_images/1944058901713805312/Hl1bsg0D_400x400.jpg',
            game: 'Box Hit',
            isOnline: true
          },
          {
            id: '2',
            name: 'DeFiMaster',
            address: '0x2345...6789',
            avatar: 'https://pbs.twimg.com/profile_images/1785913384590061568/OcNP_wnv_400x400.png',
            game: 'Box Hit',
            isOnline: false
          },
          {
            id: '3',
            name: 'BlockchainPro',
            address: '0x3456...7890',
            avatar: 'https://pbs.twimg.com/profile_images/1760274165070798848/f5V5qbs9_400x400.jpg',
            game: 'Box Hit',
            isOnline: true
          },
          {
            id: '4',
            name: 'TradingGuru',
            address: '0x4567...8901',
            avatar: 'https://pbs.twimg.com/profile_images/1962797155623608320/hOVUVd1G_400x400.jpg',
            game: 'Box Hit',
            isOnline: false
          }
        ];
        // Save to localStorage
        localStorage.setItem('watchedPlayers', JSON.stringify(defaultWatchlist));
        return defaultWatchlist;
      }
    }
    return [];
  });
  const [pnLCustomization, setPnLCustomization] = useState({
    backgroundImage: 'https://www.carscoops.com/wp-content/uploads/2023/05/McLaren-750S-main.gif',
    backgroundOpacity: 100,
    backgroundBlur: 0,
    generalTextColor: '#ffffff',
    balanceTextColor: '#ffffff',
    pnlTextColor: '#2fe3ac'
  });

  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const howToPlayButtonRef = useRef<HTMLButtonElement>(null);
  const newsUpdatesButtonRef = useRef<HTMLButtonElement>(null);
  const rewardsButtonRef = useRef<HTMLButtonElement>(null);
  const pnLTrackerButtonRef = useRef<HTMLButtonElement>(null);
  const customizeButtonRef = useRef<HTMLButtonElement>(null);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('watchedPlayers', JSON.stringify(watchedPlayers));
    }
  }, [watchedPlayers]);

  return (
    <div className="text-zinc-100 min-h-screen" style={{backgroundColor: '#09090B'}}>
        {/* Fixed navbar */}
        <div className="fixed top-0 left-0 right-0 z-50">
                  <Navbar 
          onDepositOpen={() => setIsDepositOpen(true)}
          onNotificationsOpen={() => setIsNotificationsOpen(true)}
          notificationsButtonRef={notificationsButtonRef}
          onSettingsOpen={() => setIsSettingsOpen(true)}
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
            isCollapsed={isSidebarCollapsed} 
            onSettingsOpen={() => setIsSettingsOpen(true)}
            settingsButtonRef={settingsButtonRef}
            onHowToPlayOpen={() => {
              console.log('Setting How to Play open to true');
              setIsHowToPlayOpen(true);
            }}
            howToPlayButtonRef={howToPlayButtonRef}
            onNewsUpdatesOpen={() => {
              console.log('Setting News Updates open to true');
              setIsNewsUpdatesOpen(true);
            }}
            newsUpdatesButtonRef={newsUpdatesButtonRef}
            onRewardsOpen={() => {
              console.log('Setting Rewards open to true');
              setIsRewardsOpen(true);
            }}
            rewardsButtonRef={rewardsButtonRef}
                               onWatchlistOpen={() => setIsWatchlistOpen(true)}
                   onPlayerClick={(player) => {
                     setSelectedPlayer(player);
                     setIsPlayerTrackerOpen(true);
                   }}
                   watchedPlayers={watchedPlayers}
          />
          {/* Toggle button positioned outside the sidebar */}
          <button
            onClick={() => {
              console.log('Button clicked from AppShell!');
              setIsSidebarCollapsed(!isSidebarCollapsed);
            }}
            className="absolute -right-6 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-12 bg-zinc-800/60 border border-zinc-700/60 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700/80 transition-all z-20 rounded-r cursor-pointer"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight size={14} />
            ) : (
              <ChevronLeft size={14} />
            )}
          </button>
        </div>
      </div>
      
      {/* Main content with top and left margins for navbar and sidebar */}
      <main className={`pt-14 transition-all duration-300 ${isSidebarCollapsed ? 'ml-0' : 'ml-16'} min-h-[calc(100vh-56px-32px)]`}>
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(244,114,182,0.10),transparent)]" />
        <div className="w-full h-full">
          {children}
        </div>
      </main>
      
      <Footer 
        onPnLTrackerOpen={() => setIsPnLTrackerOpen(!isPnLTrackerOpen)}
        pnLTrackerButtonRef={pnLTrackerButtonRef}
        onCustomizeOpen={() => setIsCustomizeOpen(true)}
        customizeButtonRef={customizeButtonRef}
      />
      
      {/* Deposit Modal */}
      <DepositPopup 
        isOpen={isDepositOpen} 
        onClose={() => setIsDepositOpen(false)}
        triggerRef={{ current: null }}
      />
      
      {/* Notifications Popup */}
      <NotificationsPopup 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)}
        triggerRef={notificationsButtonRef}
      />
      
      {/* Settings Popup */}
      <SettingsPopup 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        triggerRef={settingsButtonRef}
      />
      
      {/* How to Play Popup */}
      <HowToPlayPopup 
        isOpen={isHowToPlayOpen} 
        onClose={() => setIsHowToPlayOpen(false)}
        triggerRef={howToPlayButtonRef}
      />
      
      {/* News & Updates Popup */}
      <NewsUpdatesPopup 
        isOpen={isNewsUpdatesOpen} 
        onClose={() => setIsNewsUpdatesOpen(false)}
        triggerRef={newsUpdatesButtonRef}
      />
      
      {/* Rewards Popup */}
      <RewardsPopup 
        isOpen={isRewardsOpen} 
        onClose={() => setIsRewardsOpen(false)}
        triggerRef={rewardsButtonRef}
      />
      
      {/* PnL Tracker Popup */}
      <PnLTrackerPopup 
        isOpen={isPnLTrackerOpen} 
        onClose={() => setIsPnLTrackerOpen(false)}
        triggerRef={pnLTrackerButtonRef}
        isCustomizeOpen={isPnLCustomizeOpen}
        onCustomizeOpen={() => setIsPnLCustomizeOpen(true)}
        onCustomizeClose={() => setIsPnLCustomizeOpen(false)}
        customization={pnLCustomization}
      />
      
      
      {/* Customize Popup */}
      <CustomizePopup 
        isOpen={isCustomizeOpen} 
        onClose={() => setIsCustomizeOpen(false)}
        triggerRef={customizeButtonRef}
      />

      {/* PnL Customization Popup */}
      {isPnLCustomizeOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 z-[1000] transition-all duration-300 ease-out opacity-60"
            onClick={() => setIsPnLCustomizeOpen(false)}
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
                  onClick={() => setIsPnLCustomizeOpen(false)}
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
                  
                  {/* General Text Color */}
                  <div className="flex items-center justify-between p-1">
                    <span className="text-zinc-200" style={{fontSize: '12px'}}>Main</span>
                    <input
                      type="color"
                      value={pnLCustomization.generalTextColor}
                      onChange={(e) => setPnLCustomization(prev => ({ ...prev, generalTextColor: e.target.value }))}
                      className="w-8 h-8 bg-zinc-700/50 border border-zinc-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Balance Text Color */}
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
                    onClick={() => setIsPnLCustomizeOpen(false)}
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
        </div>
        
        {/* Watchlist Popup */}
        <WatchlistPopup
          isOpen={isWatchlistOpen}
          onClose={() => setIsWatchlistOpen(false)}
          watchedPlayers={watchedPlayers}
          setWatchedPlayers={setWatchedPlayers}
        />

        {/* Player Tracker Popup */}
        <PlayerTrackerPopup
          isOpen={isPlayerTrackerOpen}
          onClose={() => {
            setIsPlayerTrackerOpen(false);
            setSelectedPlayer(null);
          }}
          player={selectedPlayer}
        />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SignatureColorProvider>
      <AppShellContent>{children}</AppShellContent>
    </SignatureColorProvider>
  );
}
