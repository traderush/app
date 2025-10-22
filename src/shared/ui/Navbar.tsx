'use client';
import Image from 'next/image';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell } from 'lucide-react';
import clsxUtility from 'clsx';
import ScrollableGameTabs from './ScrollableGameTabs';
import { useUIStore } from '@/shared/state';
import { useUserStore } from '@/shared/state/userStore';
import {
  GAME_TABS,
  PRIMARY_NAVIGATION,
  NOTIFICATION_COUNT,
  PROFILE_AVATAR,
} from '@/shared/ui/constants/navigation';

interface NavbarProps {
  onDepositOpen: () => void;
  depositButtonRef: React.RefObject<HTMLButtonElement | null>;
  onNotificationsOpen: () => void;
  notificationsButtonRef: React.RefObject<HTMLButtonElement | null>;
  onProfileOpen: () => void;
}

const Navbar = React.memo(function Navbar({
  onDepositOpen,
  depositButtonRef,
  onNotificationsOpen,
  notificationsButtonRef,
  onProfileOpen,
}: NavbarProps) {
  const path = usePathname();
  const signatureColor = useUIStore((state) => state.signatureColor);
  const balance = useUserStore((state) => state.balance);
  const lockedBalance = useUserStore((state) => state.lockedBalance);
  const totalBalance = useUserStore((state) => state.totalBalance);
  const balanceHistory = useUserStore((state) => state.balanceHistory);
  const lastChangeEntry = balanceHistory.length > 0 ? balanceHistory[balanceHistory.length - 1] : undefined;
  const lastBalanceChange = lastChangeEntry?.change ?? 0;

  return (
    <>
      <header className="border-b border-zinc-800/80 bg-[#09090B] backdrop-blur w-full">
        <div className="w-full h-14 px-4 flex items-center gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center">
            <Image
              src="https://i.ibb.co/DPzsQbm0/a-logo.png"
              alt="TradeRush Logo"
              width={96}
              height={24}
              className="h-6 w-auto"
              priority
            />
          </Link>

          {/* Scrollable game tabs */}
          <ScrollableGameTabs items={GAME_TABS} bg="#09090B" />

          {/* Separator */}
          <div className="hidden lg:block w-px h-5 bg-white/20 mx-2" />

          {/* Additional menu items */}
          <nav className="hidden md:flex items-center gap-4">
            {PRIMARY_NAVIGATION.map((item) => {
              const active = path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsxUtility(
                    'text-[14px] transition cursor-pointer hover:text-white',
                    active
                      ? 'text-white'
                      : 'text-white/20'
                  )}
                  style={{fontWeight: 500}}
                >
                  {item.label}
                </Link>
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
              ref={depositButtonRef}
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
                {NOTIFICATION_COUNT > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center" style={{ 
                  backgroundColor: signatureColor,
                  borderRadius: '7px' 
                }}>
                  <span className="text-[10px]" style={{fontWeight: 600, color: '#09090B'}}>
                      {Math.min(NOTIFICATION_COUNT, 99)}
                    </span>
                  </div>
                )}
              </button>
              

            </div>
            
            {/* Daily leaderboard ranking */}
            <Link href="/leaderboard" className="flex flex-col hover:opacity-80 transition-opacity cursor-pointer">
              <div className="text-xs text-zinc-400" style={{fontWeight: 500}}>Rank</div>
              <div className="text-zinc-100 text-sm" style={{fontWeight: 600}}>#23 Today</div>
            </Link>
            
            {/* Vertical separator */}
            <div className="w-px h-5 bg-zinc-700" />
            
            {/* Portfolio */}
            <Link href="/portfolio" className="flex flex-col hover:opacity-80 transition-opacity cursor-pointer">
              <div className="text-xs text-zinc-400" style={{fontWeight: 500}}>Portfolio</div>
              <div className="text-zinc-100 text-sm" style={{fontWeight: 600}}>
                ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-zinc-400" style={{fontWeight: 500}}>
                Active ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Locked ${lockedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div
                className="text-xs"
                style={{
                  fontWeight: 500,
                  color: lastBalanceChange >= 0 ? '#2fe3ac' : '#ec397a',
                }}
              >
                Δ {`${lastBalanceChange >= 0 ? '+' : '-'}$${Math.abs(lastBalanceChange).toFixed(2)}`}
              </div>
            </Link>
            
            {/* Profile image */}
            <button 
              onClick={onProfileOpen}
              className="flex items-center cursor-pointer"
            >
              <Image
                src={PROFILE_AVATAR}
                alt="Profile"
                width={40}
                height={40}
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
