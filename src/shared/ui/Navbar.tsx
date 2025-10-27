'use client';
import Image from 'next/image';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell, Globe } from 'lucide-react';
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
  onNewsUpdatesOpen: () => void;
  newsUpdatesButtonRef: React.RefObject<HTMLButtonElement | null>;
}

const Navbar = React.memo(function Navbar({
  onDepositOpen,
  depositButtonRef,
  onNotificationsOpen,
  notificationsButtonRef,
  onProfileOpen,
  onNewsUpdatesOpen,
  newsUpdatesButtonRef,
}: NavbarProps) {
  const path = usePathname();
  const signatureColor = useUIStore((state) => state.signatureColor);
  const totalBalance = useUserStore((state) => state.totalBalance);
  const balanceHistory = useUserStore((state) => state.balanceHistory);

  return (
    <>
      <header className="border-b border-zinc-800/80 bg-[#09090B] backdrop-blur w-full">
        <div className="w-full h-14 px-4 flex items-center gap-4">
          <div className='flex justify-between w-full'>
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
            {/* <ScrollableGameTabs items={GAME_TABS} bg="#09090B" /> */}


            {/* Additional menu items */}
            <nav className="max-lg:hidden flex items-center gap-4">
              {PRIMARY_NAVIGATION.map((item) => {
                const active = path.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsxUtility(
                      'text-[13px] transition cursor-pointer hover:text-white',
                      active
                        ? 'text-white'
                        : 'text-white/20'
                    )}
                    style={{fontWeight: 400}}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>


          {/* Spacer */}
          <div className="flex-1" />

          {/* Right stats */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Deposit button */}
            <button 
              ref={depositButtonRef}
              onClick={onDepositOpen}
              className="px-2 py-1 text-sm rounded transition-colors cursor-pointer"
              style={{
                backgroundColor: signatureColor,
                fontWeight: 500, 
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


            {/* <button
            ref={newsUpdatesButtonRef}
            onClick={onNewsUpdatesOpen}
            className="relative grid place-items-center w-10 h-10 rounded text-zinc-300 hover:text-zinc-100 transition-all duration-300 cursor-pointer"
            title="News & Updates"
          >
            <Globe size={26} strokeWidth={1.4} />
            <div className="absolute -top-0 -right-0 w-4 h-4 flex items-center justify-center" style={{ 
              backgroundColor: signatureColor,
              borderRadius: '7px' 
            }}>
              <span className="text-[10px]" style={{fontWeight: 600, color: '#09090B'}}>2</span>
            </div>
          </button> */}

            {/* Vertical separator */}
            <div className="w-px h-5 bg-zinc-700" />
            
            {/* Portfolio */}
            <Link href="/portfolio" className="flex flex-col hover:opacity-80 transition-opacity cursor-pointer">
              <div className="text-xs text-zinc-400" style={{fontWeight: 500}}>Portfolio</div>
              <div className="text-zinc-100 text-sm" style={{fontWeight: 600}}>
                ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            {/* Menu button */}
            <button className="lg:hidden grid place-items-center w-8 h-8 text-zinc-300 hover:text-zinc-100 cursor-pointer">
              <Menu size={16} />
            </button>
          </div>
        </div>
      </header>
      

    </>
  );
});

export default Navbar;
