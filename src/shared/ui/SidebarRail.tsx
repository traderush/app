'use client';
import React from 'react';
import { LogOut, Volume2 } from 'lucide-react';
import clsxUtility from 'clsx';
import Link from 'next/link';
import type { WatchedPlayer } from '@/shared/state';
import Image from 'next/image';
import Logo from '../../../public/medias/logo.png';

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
  onSettingsOpen: _onSettingsOpen, 
  settingsButtonRef: _settingsButtonRef,
  onHowToPlayOpen,
  howToPlayButtonRef,
  onRewardsOpen: _onRewardsOpen,
  rewardsButtonRef: _rewardsButtonRef,
  onWatchlistOpen: _onWatchlistOpen,
  onPlayerClick: _onPlayerClick,
  watchedPlayers: _watchedPlayers = [],
  onSoundToggle: _onSoundToggle
}: SidebarRailProps) {
  return (
    <aside className={clsxUtility(
      "hidden md:block h-screen transition-all duration-300",
      isCollapsed ? "w-0" : "w-16"
    )}>
      <div className={clsxUtility(
        "h-full items-center border-r border-zinc-800/80 bg-zinc-950/60 transition-all duration-300 flex flex-col justify-between py-1.5 pb-2",
        isCollapsed ? "w-0" : "w-16"
      )}>
        <div className='flex flex-col items-center gap-4'>
          {/* Brand */}
          <Link href="/" className="relative aspect-square w-12 flex items-center">
            <Image  
              src={Logo}
              alt="TradeRush Logo"
              className="object-contain"
              fill
              priority
            />
          </Link>
          
          {/* Active Positions placeholder */}
          <div className={clsxUtility(
            "flex flex-col items-center gap-2 px-2 transition-all duration-300",
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

        <div className='flex flex-col gap-6 mb-2'>
          <div className={clsxUtility(
            "group flex flex-col items-center gap-2 transition-all duration-300",
            isCollapsed && "opacity-0 scale-95"
          )}>
            <button
              ref={howToPlayButtonRef}
              onClick={() => {}}
              className="grid place-items-center w-10 h-10 rounded text-zinc-300 group-hover:text-zinc-100 transition-all duration-300 cursor-pointer"
              title="Sound"
            >
              <Volume2 className='text-gray-500' size={26} strokeWidth={2} />
              <p className='text-[11px] text-zinc-400 text-center mt-1 group-hover:text-zinc-100 transition-all duration-300'>Sound</p>
            </button>

          </div>
          <div className={clsxUtility(
            "group flex flex-col items-center gap-2 transition-all duration-300",
            isCollapsed && "opacity-0 scale-95"
          )}>
            <button
              ref={howToPlayButtonRef}
              onClick={() => {}}
              className="grid place-items-center w-10 h-10 rounded text-zinc-300 group-hover:text-zinc-100 transition-all duration-300 cursor-pointer"
              title="Sound"
            >
              <LogOut className='text-gray-500' size={26} strokeWidth={2} />
              <p className='text-[11px] text-zinc-400 text-center mt-1 group-hover:text-zinc-100 transition-all duration-300'>Log out</p>
            </button>

          </div>
        </div>
      </div>
    </aside>
  );
});

export default SidebarRail;
