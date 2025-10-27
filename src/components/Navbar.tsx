'use client';
import React from 'react';
import Link from 'next/link';
import { Bell, Wallet, LayoutDashboard, Target, Building2, PenTool, TrendingUp } from 'lucide-react';
import { useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useAppStore } from '@/stores';
import { COLORS } from '@/styles/theme';

type GameTab = {
  label: string;
  href?: string;
  locked?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const gameTabs: GameTab[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/box-hit', label: 'Box Hit', icon: Target },
  { href: '/towers',  label: 'Towers', icon: Building2 },
  { href: '/sketch',  label: 'Sketch', icon: PenTool },
  { href: '/ahead',   label: 'Ahead', icon: TrendingUp },
];


interface NavbarProps {
  onDepositOpen: () => void;
  onNotificationsOpen: () => void;
  notificationsButtonRef: React.RefObject<HTMLButtonElement | null>;
  onSettingsOpen: () => void;
  settingsButtonRef: React.RefObject<HTMLButtonElement | null>;
  onProfileOpen: () => void;
}

const Navbar = React.memo(function Navbar({ onDepositOpen, onNotificationsOpen, notificationsButtonRef, onSettingsOpen, settingsButtonRef, onProfileOpen }: NavbarProps) {
  const path = usePathname();
  const signatureColor = useAppStore((state) => state.signatureColor);
  const balance = useAppStore((state) => state.balance);

  return (
    <>
      <header className="border-b border-zinc-800/80 backdrop-blur w-full" style={{ backgroundColor: COLORS.background.primary }}>
        <div className="w-full h-14 px-4 flex items-center gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center">
            <img 
              src="https://i.ibb.co/DPzsQbm0/a-logo.png" 
              alt="TradeRush Logo" 
              className="h-6 w-auto"
            />
          </Link>

          {/* Game tabs */}
          <nav className="flex items-center gap-2">
            {gameTabs.map((tab, index) => {
              const locked = tab.locked || !tab.href;
              const active = !!tab.href && path.startsWith(tab.href);
              const IconComponent = tab.icon;
              
              if (locked) {
                return (
                  <div
                    key={`${tab.label}-${index}`}
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 cursor-not-allowed"
                    title="Coming Soon"
                  >
                    <IconComponent size={18} className="text-zinc-500" />
                  </div>
                );
              }
              
              return (
                <Link
                  key={tab.href}
                  href={tab.href!}
                  className={clsx(
                    tab.label === 'Dashboard' 
                      ? 'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200'
                      : 'flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-200',
                    active
                      ? 'bg-zinc-800'
                      : 'hover:bg-zinc-900'
                  )}
                  style={active && tab.label === 'Dashboard' ? {
                    backgroundColor: signatureColor
                  } : {
                    backgroundColor: '#171717'
                  }}
                  title={tab.label}
                >
                  <IconComponent 
                    size={tab.label === 'Dashboard' ? 16 : 18} 
                    className={clsx(
                      'transition-colors',
                      active && tab.label === 'Dashboard'
                        ? 'text-white'
                        : active
                          ? 'text-white'
                          : ''
                    )}
                    style={{
                      color: active 
                        ? 'white' 
                        : '#797979'
                    }}
                  />
                  {tab.label === 'Dashboard' && (
                    <span 
                      className="text-sm font-medium transition-colors"
                      style={{
                        color: active 
                          ? 'white' 
                          : '#797979'
                      }}
                    >
                      {tab.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

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
                color: COLORS.text.onPrimary
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
                  <span className="text-[10px]" style={{fontWeight: 600, color: COLORS.text.onPrimary}}>12</span>
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
              <div className="text-zinc-100 text-sm" style={{fontWeight: 600}}>
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
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
});

export default Navbar;
