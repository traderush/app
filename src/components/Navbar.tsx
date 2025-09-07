'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell, Wallet } from 'lucide-react';
import clsx from 'clsx';
import { useState, useRef } from 'react';
import ScrollableGameTabs, { type GameTab } from './ScrollableGameTabs';
import NotificationsPopup from './NotificationsModal';
import DepositPopup from './DepositPopup';
import { useSignatureColor } from '@/contexts/SignatureColorContext';

const gameTabs: GameTab[] = [
  { href: '/box-hit', label: 'Box Hit' },
  { href: '/towers',  label: 'Towers'  },
  { href: '/sketch',  label: 'Sketch'  },
  { href: '/ahead',   label: 'Ahead'   },
  // locked previews:
  { label: 'Soon', locked: true },
  { label: 'Soon', locked: true },
  { label: 'Soon', locked: true },
  { label: 'Soon', locked: true },
];

const menuItems = [
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/refer', label: 'Refer & Earn' },
];

interface NavbarProps {
  onDepositOpen: () => void;
  onNotificationsOpen: () => void;
  notificationsButtonRef: React.RefObject<HTMLButtonElement | null>;
  onSettingsOpen: () => void;
  settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
  onProfileOpen: () => void;
}

export default function Navbar({ onDepositOpen, onNotificationsOpen, notificationsButtonRef, onSettingsOpen, settingsButtonRef, onProfileOpen }: NavbarProps) {
  const path = usePathname();
  const { signatureColor } = useSignatureColor();

  return (
    <>
      <header className="border-b border-zinc-800/80 bg-[#09090B] backdrop-blur w-full">
        <div className="w-full h-14 px-4 flex items-center gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center">
            <img 
              src="https://i.ibb.co/DPzsQbm0/a-logo.png" 
              alt="TradeRush Logo" 
              className="h-6 w-auto"
            />
          </Link>

          {/* Scrollable game tabs */}
          <ScrollableGameTabs items={gameTabs} bg="#09090B" />

          {/* Separator */}
          <div className="hidden lg:block w-px h-5 bg-white/20 mx-2" />

          {/* Additional menu items */}
          <nav className="hidden md:flex items-center gap-4">
            {menuItems.map(t => {
              const active = path.startsWith(t.href);
              return (
                <a
                  key={t.href}
                  href={t.href}
                  className={clsx(
                    'text-[14px] transition cursor-pointer hover:text-white',
                    active
                      ? 'text-white'
                      : 'text-white/20'
                  )}
                  style={{fontWeight: 500}}
                >
                  {t.label}
                </a>
              );
            })}
          </nav>

          {/* Menu button */}
          <button className="grid place-items-center w-8 h-8 text-zinc-300 hover:text-zinc-100 cursor-pointer">
            <Menu size={16} />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right stats */}
          <div className="flex items-center gap-4">
            {/* Deposit button */}
            <button 
              onClick={onDepositOpen}
              className="px-4 py-2 text-sm rounded transition-colors cursor-pointer"
              style={{
                backgroundColor: signatureColor,
                fontWeight: 600, 
                color: '#09090B'
              }}
            >
              Deposit
            </button>

                        {/* Notifications bell */}
            <div className="relative">
              <button 
                ref={notificationsButtonRef}
                onClick={onNotificationsOpen}
                className="relative grid place-items-center w-8 h-8 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <Bell size={18} />
                <div className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center" style={{ 
                  backgroundColor: signatureColor,
                  borderRadius: '7px' 
                }}>
                  <span className="text-[10px]" style={{fontWeight: 600, color: '#09090B'}}>12</span>
                </div>
              </button>
              

            </div>
            
            {/* Daily leaderboard ranking */}
            <a href="/leaderboard" className="flex flex-col hover:opacity-80 transition-opacity cursor-pointer">
              <div className="text-xs text-zinc-400" style={{fontWeight: 500}}>Rank</div>
              <div className="text-zinc-100 text-sm" style={{fontWeight: 600}}>#23 Today</div>
            </a>
            
            {/* Vertical separator */}
            <div className="w-px h-5 bg-zinc-700" />
            
            {/* Portfolio */}
            <a href="/portfolio" className="flex flex-col hover:opacity-80 transition-opacity cursor-pointer">
              <div className="text-xs text-zinc-400" style={{fontWeight: 500}}>Portfolio</div>
              <div className="text-zinc-100 text-sm" style={{fontWeight: 600}}>$1,216</div>
            </a>
            
            {/* Profile image */}
            <button 
              onClick={onProfileOpen}
              className="flex items-center cursor-pointer"
            >
              <img 
                src="https://i.imgflip.com/2/1vq853.jpg" 
                alt="Profile" 
                className="w-10 h-10 rounded object-cover hover:opacity-80 transition-opacity"
              />
            </button>
          </div>
        </div>
      </header>
      

    </>
  );
}
