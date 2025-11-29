'use client';
import React, { useEffect, useRef, useState } from 'react';
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
  
  // Grey bubble for inactive, colored for active
  const getBackgroundColor = () => {
    if (isActive) {
      return backgroundColor; // Colored background for active
    }
    if (isHovered) {
      return hoverBackgroundColor; // Lighter grey on hover
    }
    return '#0D0D0D'; // Grey bubble for inactive (matches bottom icons)
  };
  
  return (
    <div
      className='w-11 h-11 rounded-md flex items-center justify-center cursor-pointer transition-all duration-300 relative z-10'
      style={{ 
        backgroundColor: getBackgroundColor(),
        transition: 'background-color 0.3s ease-out'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ color: currentIconColor, transition: 'color 0.3s ease-out' }}>
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
  const gamePaths = ['/box-hit', '/sketch', '/towers', '/ahead'];
  const activeGameIndex = gamePaths.findIndex(path => pathname === path);
  const gameItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{ top: number; height: number; opacity: number }>({ top: 0, height: 0, opacity: 0 });

  // Update indicator position when pathname changes
  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = activeGameIndex;
      
      if (activeIndex !== -1 && gameItemRefs.current[activeIndex]) {
        const activeElement = gameItemRefs.current[activeIndex];
        const container = activeElement?.closest('.flex.flex-col.items-center.gap-5');
        
        if (container && activeElement) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = activeElement.getBoundingClientRect();
          
          setIndicatorStyle({
            top: elementRect.top - containerRect.top,
            height: elementRect.height,
            opacity: 1,
          });
        }
      } else {
        setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

      // Initial update
      updateIndicator();

      // Update on resize
      window.addEventListener('resize', updateIndicator);
      return () => window.removeEventListener('resize', updateIndicator);
    }, [pathname, activeGameIndex]);

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
            "relative flex flex-col items-center gap-5 rounded-md transition-all duration-300",
            isCollapsed && "opacity-0 scale-95"
          )}>
            {/* Animated background indicator */}
            <div
              className="absolute w-11 rounded-md transition-all duration-300 ease-out pointer-events-none"
              style={{
                top: `${indicatorStyle.top}px`,
                height: `${indicatorStyle.height}px`,
                opacity: indicatorStyle.opacity,
                backgroundColor: (() => {
                  const hexToRgbaLightened = (hex: string, opacity: number, whiteMix: number = 0.3) => {
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    const lightenedR = Math.round(r + (255 - r) * whiteMix);
                    const lightenedG = Math.round(g + (255 - g) * whiteMix);
                    const lightenedB = Math.round(b + (255 - b) * whiteMix);
                    return `rgba(${lightenedR}, ${lightenedG}, ${lightenedB}, ${opacity})`;
                  };
                  return hexToRgbaLightened(signatureColor, 0.15);
                })(),
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />
            
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
              
              // Game icons
              const gameIcons = [
                // Box Hit
                <svg key="box-hit" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 3V2.25H2.25V3H3ZM10.2 3H10.95V2.25H10.2V3ZM10.2 10.2V10.95H10.95V10.2H10.2ZM3 10.2H2.25V10.95H3V10.2ZM13.8 13.8V13.05H13.05V13.8H13.8ZM21 13.8H21.75V13.05H21V13.8ZM21 21V21.75H21.75V21H21ZM13.8 21H13.05V21.75H13.8V21ZM3 16.5L2.73666 15.7978C2.42924 15.913 2.23254 16.2149 2.25121 16.5426C2.26988 16.8704 2.49958 17.148 2.8181 17.2276L3 16.5ZM10.2 13.8L10.9022 14.0633C11.0055 13.788 10.9383 13.4776 10.7303 13.2697C10.5224 13.0617 10.212 12.9945 9.93666 13.0978L10.2 13.8ZM7.5 21L6.77239 21.1819C6.85202 21.5004 7.12956 21.7301 7.45735 21.7488C7.78514 21.7675 8.08697 21.5708 8.20225 21.2633L7.5 21ZM6.6 17.4L7.32761 17.2181C7.26043 16.9494 7.05062 16.7396 6.7819 16.6724L6.6 17.4ZM13.8 3V2.25H13.05V3H13.8ZM21 3H21.75V2.25H21V3ZM21 10.2V10.95H21.75V10.2H21ZM13.8 10.2H13.05V10.95H13.8V10.2ZM3 3V3.75H10.2V3V2.25H3V3ZM10.2 3H9.45V10.2H10.2H10.95V3H10.2ZM10.2 10.2V9.45H3V10.2V10.95H10.2V10.2ZM3 10.2H3.75V3H3H2.25V10.2H3ZM13.8 13.8V14.55H21V13.8V13.05H13.8V13.8ZM21 13.8H20.25V21H21H21.75V13.8H21ZM21 21V20.25H13.8V21V21.75H21V21ZM13.8 21H14.55V13.8H13.8H13.05V21H13.8ZM3 16.5L3.26334 17.2022L10.4633 14.5022L10.2 13.8L9.93666 13.0978L2.73666 15.7978L3 16.5ZM10.2 13.8L9.49775 13.5367L6.79775 20.7367L7.5 21L8.20225 21.2633L10.9022 14.0633L10.2 13.8ZM7.5 21L8.22761 20.8181L7.32761 17.2181L6.6 17.4L5.87239 17.5819L6.77239 21.1819L7.5 21ZM6.6 17.4L6.7819 16.6724L3.1819 15.7724L3 16.5L2.8181 17.2276L6.4181 18.1276L6.6 17.4ZM13.8 3V3.75H21V3V2.25H13.8V3ZM21 3H20.25V10.2H21H21.75V3H21ZM21 10.2V9.45H13.8V10.2V10.95H21V10.2ZM13.8 10.2H14.55V3H13.8H13.05V10.2H13.8Z" fill="currentColor"/>
                </svg>,
                // Sketch
                <svg key="sketch" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.5694 10.4349L11.0378 9.90583C10.9421 10.0019 10.8743 10.1222 10.8416 10.2538L11.5694 10.4349ZM10.561 14.4866L9.83321 14.3055C9.76959 14.5612 9.84477 14.8315 10.0313 15.0175C10.2177 15.2036 10.4882 15.2782 10.7437 15.2141L10.561 14.4866ZM14.5944 13.4737L14.7771 14.2011C14.9092 14.1679 15.0298 14.0994 15.1259 14.0028L14.5944 13.4737ZM16.6105 5.37028L16.0791 4.84103L16.0789 4.84119L16.6105 5.37028ZM20.5385 5.26407L20.007 5.79319L20.007 5.7932L20.5385 5.26407ZM20.5385 7.50235L21.0699 8.0316L21.0701 8.03148L20.5385 7.50235ZM19.7417 4.46356L20.2732 3.93444L20.2732 3.93444L19.7417 4.46356ZM17.5135 4.46356L18.0449 4.99281L18.0451 4.99269L17.5135 4.46356ZM2.46847 19.4709C2.17624 19.7644 2.17732 20.2393 2.47088 20.5315C2.76443 20.8238 3.23931 20.8227 3.53153 20.5291L3 20L2.46847 19.4709ZM5.59064 17.3976L6.12217 16.8684C5.98143 16.7271 5.79014 16.6476 5.59064 16.6476C5.39114 16.6476 5.19986 16.7271 5.05911 16.8684L5.59064 17.3976ZM7.14503 18.959L6.61349 19.4882C6.75424 19.6295 6.94552 19.709 7.14503 19.709C7.34453 19.709 7.53581 19.6295 7.67656 19.4882L7.14503 18.959ZM9.74907 17.4062C10.0413 17.1126 10.0402 16.6378 9.74666 16.3455C9.45311 16.0533 8.97823 16.0544 8.68601 16.348L9.21754 16.8771L9.74907 17.4062ZM11.5694 10.4349L10.8416 10.2538L9.83321 14.3055L10.561 14.4866L11.2888 14.6678L12.2972 10.6161L11.5694 10.4349ZM10.561 14.4866L10.7437 15.2141L14.7771 14.2011L14.5944 13.4737L14.4117 12.7463L10.3783 13.7592L10.561 14.4866ZM14.5944 13.4737L15.1259 12.9446L12.1009 9.9058L11.5694 10.4349L11.0378 10.9641L14.0628 14.0028L14.5944 13.4737ZM16.6105 5.37028L16.0789 5.89941L19.104 8.9382L19.6355 8.40907L20.167 7.87995L17.142 4.84116L16.6105 5.37028ZM19.6355 8.40907L19.1039 7.87998L14.0628 12.9446L14.5944 13.4737L15.1259 14.0028L20.1671 8.93817L19.6355 8.40907ZM11.5694 10.4349L12.1009 10.964L17.142 5.89938L16.6105 5.37028L16.0789 4.84119L11.0378 9.90583L11.5694 10.4349ZM19.7417 4.46356L19.2101 4.99269L20.007 5.79319L20.5385 5.26407L21.0701 4.73495L20.2732 3.93444L19.7417 4.46356ZM20.5385 7.50235L20.0071 6.9731L19.1041 7.87982L19.6355 8.40907L20.1669 8.93832L21.0699 8.0316L20.5385 7.50235ZM16.6105 5.37028L17.1419 5.89953L18.0449 4.99281L17.5135 4.46356L16.9821 3.93431L16.0791 4.84103L16.6105 5.37028ZM20.5385 5.26407L20.007 5.7932C20.331 6.11866 20.331 6.64776 20.007 6.97323L20.5385 7.50235L21.0701 8.03148C21.9766 7.12078 21.9766 5.64565 21.0701 4.73495L20.5385 5.26407ZM19.7417 4.46356L20.2732 3.93444C19.3647 3.02185 17.8904 3.02185 16.982 3.93444L17.5135 4.46356L18.0451 4.99269C18.3672 4.6691 18.888 4.6691 19.2101 4.99269L19.7417 4.46356ZM3 20L3.53153 20.5291L6.12217 17.9267L5.59064 17.3976L5.05911 16.8684L2.46847 19.4709L3 20ZM5.59064 17.3976L5.05911 17.9267L6.61349 19.4882L7.14503 18.959L7.67656 18.4299L6.12217 16.8684L5.59064 17.3976ZM7.14503 18.959L7.67656 19.4882L9.74907 17.4062L9.21754 16.8771L8.68601 16.348L6.61349 18.4299L7.14503 18.959Z" fill="currentColor"/>
                </svg>,
                // Towers
                <svg key="towers" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3H3V12H8V3ZM8 3H12M8 3V8H12V3M12 3H16M12 3V9H16V3M16 3H21V8H16V3ZM16 21H21L21 12H16V21ZM16 21H12M16 21L16 16H12V21M12 21H8M12 21L12 15H8L8 21M8 21H3L3 16H8L8 21Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>,
                // Ahead
                <svg key="ahead" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9H10.5V13.5H6V9Z" fill="currentColor"/>
                  <path d="M3 16.5H7.5V21H3V16.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M6 9H10.5V13.5H6V9Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M13.5 10.5H18V15H13.5V10.5Z" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M16.5 3H21V7.5H16.5V3Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>,
              ];
              
              return (
                <>
                  {[
              { href: '/box-hit', isLink: true },
              { href: '/sketch', isLink: true },
              { href: '/towers', isLink: true },
              { href: '/ahead', isLink: true },
            ].map((game, index) => {
              const isActive = index === activeGameIndex;
              const iconColor = isActive ? signatureColor : '#626262';
              
              // Active: colored background, Inactive: grey bubble (matches bottom icons)
              const backgroundColor = isActive 
                ? hexToRgbaLightened(signatureColor, 0.15)
                : '#0D0D0D';
              
              const hoverIconColor = signatureColor;
              // Hover: signature color background for both (matches bottom icons)
              const hoverBackgroundColor = hexToRgbaLightened(signatureColor, 0.1);
              
              return (
                <Link 
                  key={index} 
                  href={game.href}
                  ref={(el) => {
                    gameItemRefs.current[index] = el;
                  }}
                >
                  <GameIconButton
                    isActive={isActive}
                    iconColor={iconColor}
                    hoverIconColor={hoverIconColor}
                    backgroundColor={backgroundColor}
                    hoverBackgroundColor={hoverBackgroundColor}
                    icon={gameIcons[index]}
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
