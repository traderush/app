'use client';
import Image from 'next/image';
import React, { useEffect, useMemo } from 'react';
import { Play, Globe, Gift, Settings, Volume2, VolumeX } from 'lucide-react';
import clsxUtility from 'clsx';
import { useUIStore, usePlayerStore, type WatchedPlayer } from '@/shared/state';
import { TOP_PLAYERS } from '@/shared/ui/constants/sidebar';
import Link from 'next/link';

interface SidebarRailProps {
  isCollapsed?: boolean;
  onSettingsOpen?: () => void;
  settingsButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onHowToPlayOpen?: () => void;
  howToPlayButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onRewardsOpen?: () => void;
  rewardsButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onWatchlistOpen?: () => void;
  onPlayerClick?: (player: WatchedPlayer) => void;
  watchedPlayers?: WatchedPlayer[];
  onSoundToggle?: () => void;
}

const SidebarRail = React.memo(function SidebarRail({ 
  isCollapsed = false, 
  onSettingsOpen, 
  settingsButtonRef,
  onHowToPlayOpen,
  howToPlayButtonRef,
  onRewardsOpen,
  rewardsButtonRef,
  onWatchlistOpen,
  onPlayerClick,
  watchedPlayers = [],
  onSoundToggle
}: SidebarRailProps) {
  const signatureColor = useUIStore((state) => state.signatureColor);
  const settings = useUIStore((state) => state.settings);
  const storeWatchedPlayers = usePlayerStore((state) => state.watchedPlayers);
  const [isClient, setIsClient] = React.useState(false);

  // Use store players if not provided via props
  const displayPlayers = watchedPlayers.length > 0 ? watchedPlayers : storeWatchedPlayers;

  // Ensure consistent rendering between server and client
  useEffect(() => {
    setIsClient(true);
  }, []);

  const topPlayers = useMemo(
    () => TOP_PLAYERS,
    [],
  );

  return (
    <aside className={clsxUtility(
      "hidden md:block h-[calc(100vh-56px-32px)] transition-all duration-300",
      isCollapsed ? "w-0" : "w-18"
    )}>
      <div className={clsxUtility(
        "h-full border-r border-zinc-800/80 bg-zinc-950/60 transition-all duration-300 flex flex-col",
        isCollapsed ? "w-0" : "w-18"
      )}>
        {/* Top menu items */}
        <div className={clsxUtility(
          "flex flex-col items-center gap-3 pt-3 transition-all duration-300",
          isCollapsed && "opacity-0 scale-95"
        )}>
          <button
            ref={howToPlayButtonRef}
            onClick={() => {
              onHowToPlayOpen?.();
            }}
            className="grid place-items-center w-10 h-10 rounded text-zinc-300 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
            title="How to Play"
          >
            <Play size={26} strokeWidth={1.4} />
          </button>

        </div>

        {/* Separator */}
        <div className={clsxUtility(
          "border-t border-zinc-800/60 my-2 transition-all duration-300",
          isCollapsed && "opacity-0 scale-95"
        )}></div>
        
        {/* Active Positions placeholder */}
        <div className={clsxUtility(
          "flex flex-col items-center gap-2 px-2 transition-all duration-300 mt-2",
          isCollapsed && "opacity-0 scale-95"
        )}>
          <Link href="/box-hit">
            <div className='w-11 h-11 rounded border border-zinc-600 flex items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors'>
            <svg width="35" height="35" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 239.52 219.12">
              <defs/>
              <path fill="#191919" d="M0 0h239.52v219.12H0z"/>
              <path fill="#684b45" d="M0 0h67.58v60.73H0zM81.84 0h75.84v60.73H81.84zM171.94 0h67.58v60.73h-67.58zM0 74.83h67.58v69.47H0z"/>
              <path fill="#fa5616" d="M81.84 74.83h75.84v69.47H81.84z"/>
              <path fill="#684b45" d="M171.94 74.83h67.58v69.47h-67.58zM0 158.39h67.58v60.73H0zM81.84 158.39h75.84v60.73H81.84zM171.94 158.39h67.58v60.73h-67.58z"/>
              <path fill="#fff" d="M118.72 122.22c-.4-.94.02-2.03.96-2.44.47-.2.99-.2 1.46 0l59.37 24.37c.95.39 1.4 1.48 1.02 2.44-.22.55-.69.96-1.25 1.11l-22.72 5.92a7.48 7.48 0 0 0-5.34 5.38l-5.86 22.97c-.26 1-1.27 1.6-2.26 1.34-.57-.15-1.03-.56-1.25-1.11l-24.12-59.99Z"/>
            </svg>
            </div>
            <p className='text-[11px] text-zinc-400 text-center mt-1'>Box Hit</p>
          </Link>
          
        </div>
      </div>
    </aside>
  );
});

export default SidebarRail;
