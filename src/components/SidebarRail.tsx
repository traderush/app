'use client';
import { useState } from 'react';
import { Play, Globe, Gift, Settings, Volume2, VolumeX, Coins } from 'lucide-react';
import clsx from 'clsx';
import { useSignatureColor } from '@/contexts/SignatureColorContext';

interface WatchedPlayer {
  id: string;
  name: string;
  address: string;
  avatar: string;
  game: string;
  isOnline: boolean;
}

interface SidebarRailProps {
  isCollapsed?: boolean;
  onSettingsOpen?: () => void;
  settingsButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onHowToPlayOpen?: () => void;
  howToPlayButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onNewsUpdatesOpen?: () => void;
  newsUpdatesButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onRewardsOpen?: () => void;
  rewardsButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onWatchlistOpen?: () => void;
  onPlayerClick?: (player: WatchedPlayer) => void;
  watchedPlayers?: WatchedPlayer[];
}

export default function SidebarRail({ 
  isCollapsed = false, 
  onSettingsOpen, 
  settingsButtonRef,
  onHowToPlayOpen,
  howToPlayButtonRef,
  onNewsUpdatesOpen,
  newsUpdatesButtonRef,
  onRewardsOpen,
  rewardsButtonRef,
  onWatchlistOpen,
  onPlayerClick,
  watchedPlayers = []
}: SidebarRailProps) {
  const [isMuted, setIsMuted] = useState(false);
  const { signatureColor } = useSignatureColor();

  return (
    <aside className={clsx(
      "hidden md:block h-[calc(100vh-56px-32px)] transition-all duration-300",
      isCollapsed ? "w-0" : "w-16"
    )}>
      <div className={clsx(
        "h-full border-r border-zinc-800/80 bg-zinc-950/60 transition-all duration-300 flex flex-col",
        isCollapsed ? "w-0" : "w-16"
      )}>
        {/* Top menu items */}
        <div className={clsx(
          "flex flex-col items-center gap-3 pt-3 transition-all duration-300",
          isCollapsed && "opacity-0 scale-95"
        )}>
          <button
            ref={howToPlayButtonRef}
            onClick={() => {
              console.log('How to Play button clicked');
              onHowToPlayOpen?.();
            }}
            className="grid place-items-center w-10 h-10 rounded text-zinc-300 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
            title="How to Play"
          >
            <Play size={26} strokeWidth={1.4} />
          </button>
          
          <button
            ref={newsUpdatesButtonRef}
            onClick={() => {
              console.log('News & Updates button clicked');
              onNewsUpdatesOpen?.();
            }}
            className="relative grid place-items-center w-10 h-10 rounded text-zinc-300 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
            title="News & Updates"
          >
            <Globe size={26} strokeWidth={1.4} />
            {/* Notification bubble */}
            <div className="absolute -top-0 -right-0 w-4 h-4 flex items-center justify-center" style={{ 
              backgroundColor: signatureColor,
              borderRadius: '7px' 
            }}>
              <span className="text-[10px]" style={{fontWeight: 600, color: '#09090B'}}>2</span>
            </div>
          </button>
          
          <button
            ref={rewardsButtonRef}
            onClick={() => {
              console.log('Rewards button clicked');
              onRewardsOpen?.();
            }}
            className="grid place-items-center w-10 h-10 rounded text-zinc-300 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
            title="Rewards"
          >
            <Gift size={26} strokeWidth={1.4} />
          </button>
          
          {/* Top 3 Players */}
          <div className="relative">
            <img 
              src="https://i.ibb.co/cXskDgbs/gasg.png" 
              alt="Top Player 1" 
              className="w-11 h-11 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
              style={{ 
                borderRadius: '4px',
                border: '1px solid #FFD700'
              }}
              title="Top Player 1"
              loading="eager"
              onClick={() => onPlayerClick?.({
                id: 'top1',
                name: 'Top Player 1',
                address: '0x1234...5678',
                avatar: 'https://i.ibb.co/cXskDgbs/gasg.png',
                game: 'Box Hit',
                isOnline: true
              })}
            />
            {/* Rank indicator circle */}
            <div 
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: '#FFD700',
                border: '1px solid #09090B'
              }}
              title="Rank 1"
            >
              <span className="text-[10px] font-bold" style={{ color: '#09090B' }}>1</span>
            </div>
          </div>
          
          <div className="relative">
            <img 
              src="https://pbs.twimg.com/profile_images/1848910264051052546/Mu18BSYv_400x400.jpg" 
              alt="Top Player 2" 
              className="w-11 h-11 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
              style={{ 
                borderRadius: '4px',
                border: '1px solid #C0C0C0'
              }}
              title="Top Player 2"
              loading="eager"
              onClick={() => onPlayerClick?.({
                id: 'top2',
                name: 'Top Player 2',
                address: '0x2345...6789',
                avatar: 'https://pbs.twimg.com/profile_images/1848910264051052546/Mu18BSYv_400x400.jpg',
                game: 'Box Hit',
                isOnline: true
              })}
            />
            {/* Rank indicator circle */}
            <div 
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: '#C0C0C0',
                border: '1px solid #09090B'
              }}
              title="Rank 2"
            >
              <span className="text-[10px] font-bold" style={{ color: '#09090B' }}>2</span>
            </div>
          </div>
          
          <div className="relative">
            <img 
              src="https://i.ibb.co/cXskDgbs/gasg.png" 
              alt="Top Player 3" 
              className="w-11 h-11 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
              style={{ 
                borderRadius: '4px',
                border: '1px solid #CD7F32'
              }}
              title="Top Player 3"
              loading="eager"
              onClick={() => onPlayerClick?.({
                id: 'top3',
                name: 'Top Player 3',
                address: '0x3456...7890',
                avatar: 'https://i.ibb.co/cXskDgbs/gasg.png',
                game: 'Box Hit',
                isOnline: true
              })}
            />
            {/* Rank indicator circle */}
            <div 
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: '#CD7F32',
                border: '1px solid #09090B'
              }}
              title="Rank 3"
            >
              <span className="text-[10px] font-bold" style={{ color: '#09090B' }}>3</span>
            </div>
          </div>
        </div>
        
        {/* Separator */}
        <div className={clsx(
          "border-t border-zinc-800/60 my-2 transition-all duration-300",
          isCollapsed && "opacity-0 scale-95"
        )}></div>
        
        {/* Active Positions placeholder */}
        <div className={clsx(
          "flex flex-col items-center gap-2 px-2 transition-all duration-300",
          isCollapsed && "opacity-0 scale-95"
        )}>
          {/* Dynamic watchlist players */}
          {watchedPlayers.map((player) => (
            <div key={player.id} className="relative">
              <img 
                src={player.avatar}
                alt={player.name} 
                className={`w-11 h-11 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity ${
                  !player.isOnline ? 'opacity-50' : ''
                }`}
                style={{ 
                  borderRadius: '4px',
                  border: `1px solid ${player.isOnline ? signatureColor : '#6B7280'}`
                }}
                title={player.name}
                loading="eager"
                onClick={() => onPlayerClick?.(player)}
              />
              {/* Game indicator circle - only show if player is online */}
              {player.isOnline && (
                <div 
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: signatureColor,
                    border: '1px solid #09090B'
                  }}
                  title="Box Hit Game"
                >
                  <svg 
                    width="10" 
                    height="10" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#09090B" 
                    strokeWidth="2.5"
                    className="target-icon"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
                    <rect x="8" y="8" width="8" height="8" rx="1" ry="1"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
          
          {/* Add to watchlist button */}
          <div className="relative">
            <div 
              className="w-11 h-11 rounded border border-zinc-600 flex items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors" 
              style={{ backgroundColor: '#171717' }}
              title="Add to Watchlist"
              onClick={onWatchlistOpen}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#9CA3AF" 
                strokeWidth="2"
              >
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            {/* Star indicator circle */}
            <div 
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: '#FFD700',
                border: '1px solid #09090B'
              }}
              title="Add Player"
            >
              {/* Star icon */}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#09090B" strokeWidth="2.5">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </div>
          </div>
          
        </div>
        
        {/* Bottom controls */}
        <div className={clsx(
          "flex flex-col items-center gap-3 mt-auto pb-3 transition-all duration-300",
          isCollapsed && "opacity-0 scale-95"
        )}>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="grid place-items-center w-10 h-10 rounded text-zinc-300 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={26} strokeWidth={1.4} /> : <Volume2 size={26} strokeWidth={1.4} />}
          </button>
          
          <button
            ref={settingsButtonRef}
            onClick={onSettingsOpen}
            className="grid place-items-center w-10 h-10 rounded text-zinc-300 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
            title="Settings"
          >
            <Settings size={26} strokeWidth={1.4} />
          </button>
        </div>
      </div>
    </aside>
  );
}
