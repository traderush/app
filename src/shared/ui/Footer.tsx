import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';
import { TRADING_COLORS } from '@/shared/constants/theme';
import { ASSETS } from '@/app/box-hit/constants';
import { Settings } from 'lucide-react';

type PerformanceWithMemory = Performance & {
  memory?: {
    usedJSHeapSize: number;
  };
};

const MARKET_SUMMARY = [
  { key: 'BTC', color: '#FFA21C', icon: ASSETS.BTC.icon },
  { key: 'ETH', color: '#5080A0', icon: ASSETS.ETH.icon },
  { key: 'SOL', color: '#26FFA4', icon: ASSETS.SOL.icon },
] as const;

// Client-side only memory display component to prevent hydration mismatch
const MemoryDisplay: React.FC = () => {
  const [memoryUsage, setMemoryUsage] = useState<string>('Loading...');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const updateMemoryUsage = () => {
      if (typeof performance !== 'undefined') {
        const perf = performance as PerformanceWithMemory;
        if (perf.memory) {
          const used = Math.round(perf.memory.usedJSHeapSize / 1048576);
          setMemoryUsage(`${used}MB`);
          return;
        }
      }

      setMemoryUsage('N/A');
    };

    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return <span>{isClient ? memoryUsage : 'Loading...'}</span>;
};

interface FooterProps {
  onPnLTrackerOpen: () => void;
  pnLTrackerButtonRef: React.RefObject<HTMLButtonElement | null>;
  onCustomizeOpen: () => void;
  customizeButtonRef: React.RefObject<HTMLButtonElement | null>;
  onSettingsOpen?: () => void;
  settingsButtonRef?: React.RefObject<HTMLButtonElement | null>;
  // Connection status props
  isWebSocketConnected?: boolean;
  isBackendConnected?: boolean; // Backend API status
}

const Footer = React.memo(function Footer({ 
  onPnLTrackerOpen, 
  pnLTrackerButtonRef, 
  onCustomizeOpen, 
  customizeButtonRef,
  onSettingsOpen,
  settingsButtonRef,
  isWebSocketConnected = false,
  isBackendConnected = false
}: FooterProps) {
  // Performance metrics
  const [fps, setFps] = React.useState(60);
  
  
  // FPS measurement
  React.useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;
    
    const measureFps = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFps);
    };
    
    animationId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animationId);
  }, []);
  
  const latencySeconds = 1;
  const playerCount = useMemo(() => '1,247', []);
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-800/80 bg-zinc-950/75 backdrop-blur">
      <div className="h-8 px-4 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-4">
                    
          {/* Connection Status - Dynamic styling based on connection */}
          <div className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 relative group" style={{ 
            backgroundColor: isWebSocketConnected ? '#0E2923' : '#2A1A0E', 
            color: isWebSocketConnected ? '#10AE80' : '#EC397A' 
          }}>
            <div className="w-3 h-3 rounded-full" style={{ 
              backgroundColor: isWebSocketConnected ? '#10AE80' : '#EC397A', 
              border: `2px solid ${isWebSocketConnected ? '#134335' : '#4A2F1A'}` 
            }}></div>
            {isWebSocketConnected ? 'Connected' : 'Disconnected'}
            
            {/* Tooltip with detailed connection info and performance metrics */}
            <div 
              className="absolute bottom-full right-0 mb-2 px-3 py-2.5 border border-zinc-700/50 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 min-w-[260px]"
              style={{ 
                backgroundColor: 'rgba(14, 14, 14, 0.7)', 
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
              }}
            >
              <div className="text-xs text-zinc-300 space-y-2">
                {/* Status Header with inline status */}
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-xs`} style={{ color: isWebSocketConnected ? TRADING_COLORS.positive : TRADING_COLORS.negative }}>
                    {isWebSocketConnected ? 'Live Data Feed' : 'Connection Failed'}
                  </span>
                  <span className={`text-xs`} style={{ color: isWebSocketConnected ? TRADING_COLORS.positive : TRADING_COLORS.negative }}>
                    {isWebSocketConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                
                {isWebSocketConnected ? (
                  <>
                    {/* Performance Metrics */}
                    <div className="space-y-1 pt-1 border-t border-zinc-700/50">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">FPS:</span>
                        <span style={{ color: fps >= 55 ? TRADING_COLORS.positive : fps >= 30 ? '#facc15' : TRADING_COLORS.negative }}>
                          {fps}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Latency:</span>
                        <span style={{ color: latencySeconds <= 1 ? TRADING_COLORS.positive : latencySeconds <= 3 ? '#facc15' : TRADING_COLORS.negative }}>
                          {latencySeconds}s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Memory:</span>
                        <span className="text-zinc-300">
                          <MemoryDisplay />
                        </span>
                      </div>
                    </div>
                    
                    {/* Backend Status */}
                    <div className="pt-1 border-t border-zinc-700/50">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Backend API:</span>
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: isBackendConnected ? TRADING_COLORS.positive : TRADING_COLORS.negative }}
                          />
                          <span style={{ color: isBackendConnected ? TRADING_COLORS.positive : TRADING_COLORS.negative }}>
                            {isBackendConnected ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pt-1">No active connections</div>
                    <div className="text-zinc-500">Check your internet connection</div>
                    <div className="text-zinc-500">Retrying automatically...</div>
                  </>
                )}
              </div>
              {/* Arrow */}
              <div 
                className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent" 
                style={{ borderTopColor: 'rgba(14, 14, 14, 0.7)' }}
              />
            </div>
          </div>
        </div>
        
        {/* Right side - Styles for Dev, PnL Tracker, Customize, and social links */}
        <div className="flex items-center gap-4">
          {/* Separator */}
          <div className="w-px h-4 bg-white/20"></div>
          
          {/* PnL Tracker Button */}
          <button 
            ref={pnLTrackerButtonRef}
            onClick={onPnLTrackerOpen}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
            <span>PnL Tracker</span>
          </button>
          
          {/* Separator */}
          <div className="w-px h-4 bg-white/20"></div>
          
          {/* Customize Button */}
          <button 
            ref={customizeButtonRef}
            onClick={onCustomizeOpen}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c.84 0 1.5-.68 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8 8 8.67 8 9.5 7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5S18.33 11 17.5 11z"/>
            </svg>
            <span>Customize</span>
          </button>

          {/* Separator */}
          <div className="w-px h-4 bg-white/20"></div>
        
          {/* Settings Button */}
          <button 
            ref={settingsButtonRef}
            onClick={onSettingsOpen}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <Settings size={14} strokeWidth={1.4} />
            <span>Settings</span>
          </button>

          {/* Separator */}
          <div className="w-px h-4 bg-white/20"></div>
          
          {/* Social Links */}
          <a 
            href="https://discord.gg/traderush" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </a>
          <a 
            href="https://twitter.com/traderush" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          {/* <a 
            href="https://docs.traderush.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
            <span>Docs</span>
          </a> */}
        </div>
      </div>
    </footer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo to prevent unnecessary re-renders
  // Return true if props are equal (component should NOT re-render)
  return (
    prevProps.isWebSocketConnected === nextProps.isWebSocketConnected &&
    prevProps.isBackendConnected === nextProps.isBackendConnected &&
    prevProps.onPnLTrackerOpen === nextProps.onPnLTrackerOpen &&
    prevProps.onCustomizeOpen === nextProps.onCustomizeOpen &&
    prevProps.onSettingsOpen === nextProps.onSettingsOpen
  );
});

export default Footer;
