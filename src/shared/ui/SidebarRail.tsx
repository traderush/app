'use client';
import React from 'react';
import { Settings, Volume2, Share2 } from 'lucide-react';
import clsxUtility from 'clsx';
import Link from 'next/link';
import type { WatchedPlayer } from '@/shared/state';
import Image from 'next/image';
import Logo from '../../../public/medias/logo.png';
import { useUIStore } from '@/shared/state';
import { usePathname } from 'next/navigation';

interface SidebarRailProps {
  isCollapsed?: boolean;
  onSettingsOpen?: () => void;
  settingsButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onHowToPlayOpen?: () => void;
  howToPlayButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onRewardsOpen?: () => void;
  rewardsButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onReferralOpen?: () => void;
  referralButtonRef?: React.RefObject<HTMLButtonElement | null>;
  onWatchlistOpen?: () => void;
  onPlayerClick?: (player: WatchedPlayer) => void;
  watchedPlayers?: WatchedPlayer[];
  onSoundToggle?: () => void;
}

interface GameIconProps {
  isActive: boolean;
  iconColor: string;
  hoverIconColor: string;
  backgroundColor: string;
  hoverBackgroundColor: string;
  icon: React.ReactNode;
  signatureColor: string;
}

interface BottomIconButtonProps {
  onClick?: () => void;
  icon: React.ReactNode;
  signatureColor: string;
  title?: string;
  hasStrikethrough?: boolean;
}

const BottomIconButton = React.forwardRef<HTMLButtonElement, BottomIconButtonProps>(
  function BottomIconButton({ onClick, icon, signatureColor, title, hasStrikethrough = false }, ref) {
    const [isHovered, setIsHovered] = React.useState(false);
    
    // Convert hex to rgba for opacity and lighten by mixing with white
    const hexToRgbaLightened = (hex: string, opacity: number, whiteMix: number = 0.3) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      // Mix with white (255, 255, 255)
      const lightenedR = Math.round(r + (255 - r) * whiteMix);
      const lightenedG = Math.round(g + (255 - g) * whiteMix);
      const lightenedB = Math.round(b + (255 - b) * whiteMix);
      return `rgba(${lightenedR}, ${lightenedG}, ${lightenedB}, ${opacity})`;
    };
    
    const backgroundColor = isHovered 
      ? hexToRgbaLightened(signatureColor, 0.1)
      : '#0D0D0D';
    const iconColor = isHovered ? signatureColor : '#626262';
    const strikethroughColor = isHovered ? signatureColor : '#71717a';
    
    return (
      <button
        ref={ref}
        onClick={onClick}
        className="relative group w-11 h-11 flex flex-col items-center justify-center gap-2 transition-all duration-200 rounded-md cursor-pointer"
        style={{ 
          backgroundColor,
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={title}
      >
        <div style={{ color: iconColor, transition: 'color 0.2s' }}>
          {icon}
        </div>
        {hasStrikethrough && (
          <div className="pointer-events-none absolute inset-0">
            <span
              className="absolute left-1/2 top-1/2 h-[2px] w-8 -translate-x-1/2 -translate-y-1/2 rotate-45 transition-colors duration-200"
              style={{ backgroundColor: strikethroughColor }}
            />
          </div>
        )}
      </button>
    );
  }
);

const GameIconButton = React.memo(function GameIconButton({
  isActive,
  iconColor,
  hoverIconColor,
  backgroundColor,
  hoverBackgroundColor,
  icon
}: GameIconProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const currentIconColor = isHovered && !isActive ? hoverIconColor : iconColor;
  const currentBackgroundColor = isHovered && !isActive ? hoverBackgroundColor : backgroundColor;
  
  return (
    <div
      className='w-11 h-11 rounded-md flex items-center justify-center cursor-pointer transition-all duration-200'
      style={{ 
        backgroundColor: currentBackgroundColor,
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ color: currentIconColor, transition: 'color 0.2s' }}>
        {icon}
      </div>
    </div>
  );
});

const SidebarRail = React.memo(function SidebarRail({ 
  isCollapsed = false, 
  onSettingsOpen: _onSettingsOpen, 
  settingsButtonRef: _settingsButtonRef,
  onHowToPlayOpen,
  howToPlayButtonRef,
  onRewardsOpen: _onRewardsOpen,
  rewardsButtonRef: _rewardsButtonRef,
  onReferralOpen,
  referralButtonRef,
  onWatchlistOpen: _onWatchlistOpen,
  onPlayerClick: _onPlayerClick,
  watchedPlayers: _watchedPlayers = [],
  onSoundToggle: _onSoundToggle
}: SidebarRailProps) {
  const pathname = usePathname();
  const signatureColor = useUIStore((state) => state.signatureColor);
  const soundEnabled = useUIStore((state) => state.settings.soundEnabled);
  const isBoxHitActive = pathname === '/box-hit';

  return (
    <aside className={clsxUtility(
      "hidden md:block fixed left-0 top-0 h-screen transition-all duration-300 border-r border-zinc-800/50",
      isCollapsed ? "w-0" : "w-18"
    )}>
      <div className="h-full w-full items-center transition-all duration-300 flex flex-col justify-between py-1.5 pb-20">
        <div className='flex flex-col items-center gap-24'>
          {/* Brand */}
          <Link href="/" className="relative aspect-square w-8 mt-1.5 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 304 234.53">
              <g>
                <path fill="#fe7701" d="M150.5 22 76.75 234l-1.47.53L26 234 81.01 73.26 0 72.5 18.25 22H150.5z"/>
                <path fill="#bf5401" d="m304 0-19 49.75L205.25 51l-55.5 161.5H99.5L172.75 0H304z"/>
              </g>
            </svg>
          </Link>
          
          {/* Active Positions placeholder */}
          <div className={clsxUtility(
            "flex flex-col items-center gap-5 rounded-md transition-all duration-300",
            isCollapsed && "opacity-0 scale-95"
          )}>
            {/* Convert hex to rgba for opacity and lighten by mixing with white */}
            {(() => {
              const hexToRgbaLightened = (hex: string, opacity: number, whiteMix: number = 0.3) => {
                const r = parseInt(hex.slice(1, 3), 16);
                const g = parseInt(hex.slice(3, 5), 16);
                const b = parseInt(hex.slice(5, 7), 16);
                // Mix with white (255, 255, 255)
                const lightenedR = Math.round(r + (255 - r) * whiteMix);
                const lightenedG = Math.round(g + (255 - g) * whiteMix);
                const lightenedB = Math.round(b + (255 - b) * whiteMix);
                return `rgba(${lightenedR}, ${lightenedG}, ${lightenedB}, ${opacity})`;
              };
              
              return (
                <>
                  {[
              { href: '/box-hit', isLink: true },
              { href: '/sketch', isLink: true },
              { href: '/towers', isLink: true },
              { href: '/ahead', isLink: true },
            ].map((game, index) => {
              const isActive = index === 0 && isBoxHitActive;
              const iconColor = isActive ? signatureColor : '#626262';
              
              const backgroundColor = isActive 
                ? hexToRgbaLightened(signatureColor, 0.15)
                : '#0D0D0D';
              
              const hoverIconColor = signatureColor;
              const hoverBackgroundColor = hexToRgbaLightened(signatureColor, 0.1);
              
              const boxHitIcon = (
                <svg width="20" height="20" viewBox="0 0 239.52 219.12" fill="none">
                  <path fill="currentColor" d="M 0,0.0910005 67.58,0 V 60.73 H 0 Z M 81.84,0 h 75.84 V 60.73 H 81.84 Z m 90.1,0 h 67.58 V 60.73 H 171.94 Z M 0,74.83 H 67.58 V 144.3 H 0 Z" />
                  <path fill="none" stroke="currentColor" strokeWidth="6.84343" d="m 81.84,74.83 h 75.84 V 144.3 H 81.84 Z" />
                  <path fill="currentColor" d="m 171.94,74.83 h 67.58 V 144.3 H 171.94 Z M 0,158.39 h 67.58 v 60.73 H 0 Z m 81.84,0 h 75.84 v 60.73 H 81.84 Z m 90.1,0 h 67.58 v 60.73 h -67.58 z" />
                  <path fill="currentColor" d="m 105.8831,96.546203 c -0.4,-0.94 0.02,-2.03 0.96,-2.44 0.47,-0.2 0.99,-0.2 1.46,0 l 59.37,24.369997 c 0.95,0.39 1.4,1.48 1.02,2.44 -0.22,0.55 -0.69,0.96 -1.25,1.11 l -22.72,5.92 c -2.62417,0.69184 -4.66776,2.75074 -5.34,5.38 l -5.86,22.97 c -0.26,1 -1.27,1.6 -2.26,1.34 -0.57,-0.15 -1.03,-0.56 -1.25,-1.11 l -24.12,-59.989997 z" />
                </svg>
              );
              
              return (
                <Link key={index} href={game.href}>
                  <GameIconButton
                    isActive={isActive}
                    iconColor={iconColor}
                    hoverIconColor={hoverIconColor}
                    backgroundColor={backgroundColor}
                    hoverBackgroundColor={hoverBackgroundColor}
                    icon={boxHitIcon}
                    signatureColor={signatureColor}
                  />
                </Link>
              );
            })}
            
            {/* PnL Button */}
            <button
              ref={referralButtonRef}
              onClick={onReferralOpen}
              className="border-0 bg-transparent p-0"
            >
              <GameIconButton
                isActive={false}
                iconColor="#626262"
                hoverIconColor={signatureColor}
                backgroundColor="#0D0D0D"
                hoverBackgroundColor={hexToRgbaLightened(signatureColor, 0.1)}
                icon={
                  <span className="text-xs font-medium">
                    PnL
                  </span>
                }
                signatureColor={signatureColor}
              />
            </button>
                </>
              );
            })()}
          </div>
        </div>

        <div className='flex flex-col gap-5'>
          <BottomIconButton
            onClick={_onSoundToggle}
            icon={<Volume2 size={20} strokeWidth={1.5} />}
            signatureColor={signatureColor}
            title="Sound"
            hasStrikethrough={!soundEnabled}
          />
          <BottomIconButton
            onClick={_onSettingsOpen}
            ref={_settingsButtonRef}
            icon={<Settings size={20} strokeWidth={1.5} />}
            signatureColor={signatureColor}
            title="Settings"
          />
        </div>
      </div>
    </aside>
  );
});

export default SidebarRail;
