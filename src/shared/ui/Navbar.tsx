'use client';
import Image from 'next/image';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell } from 'lucide-react';
import clsxUtility from 'clsx';
import { useUIStore } from '@/shared/state';
import { useUserStore } from '@/shared/state/userStore';

import {
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
  mobileMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
  onMobileMenuOpen: () => void;
}

const Navbar = React.memo(function Navbar({
  onDepositOpen,
  depositButtonRef,
  onNotificationsOpen,
  notificationsButtonRef,
  onProfileOpen,
  onNewsUpdatesOpen: _onNewsUpdatesOpen,
  newsUpdatesButtonRef: _newsUpdatesButtonRef,
  mobileMenuButtonRef: _mobileMenuButtonRef,
  onMobileMenuOpen: _onMobileMenuOpen,
}: NavbarProps) {
  const path = usePathname();
  const signatureColor = useUIStore((state) => state.signatureColor);
  const totalBalance = useUserStore((state) => state.totalBalance);

  return (
    <>
      <header className="w-full border-b border-zinc-800/80 bg-background backdrop-blur">
        <div className="flex h-14 w-full items-center gap-4 px-4">

          <button className='group shrink-0 text-xs bg-[#FFFFFF05] hover:bg-[#FFFFFF10] rounded-sm px-4 py-2 transition-colors cursor-pointer'>
            <p className='group-hover:bg-[#0445c6] bg-gradient-to-r from-[#0475C687] to-[#0475C6] bg-clip-text text-transparent transition-colors'>Get a 20% Discount on Trading Fees ⋆˙⟡</p>
          </button>

          <div className="flex w-full justify-end">

            {/* Additional menu items */}
            <nav className="max-lg:hidden flex items-center gap-4">
              {PRIMARY_NAVIGATION.map((item) => {
                const active = path.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsxUtility(
                      'text-[13px] font-normal transition-colors hover:text-white',
                      active ? 'text-white' : 'text-white/20',
                    )}
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
              className="rounded px-2 py-1 text-sm font-medium text-brand-foreground transition-colors"
              style={{ backgroundColor: signatureColor }}
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
                  <div
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-md"
                    style={{ backgroundColor: signatureColor }}
                  >
                    <span className="text-[10px] font-semibold text-brand-foreground">
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
              <div className="text-xs font-medium text-zinc-400">Portfolio</div>
              <div className="text-sm font-semibold text-zinc-100">
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
            <button ref={_mobileMenuButtonRef} onClick={_onMobileMenuOpen} className="lg:hidden grid place-items-center w-8 h-8 text-zinc-300 hover:text-zinc-100 cursor-pointer">
              <Menu size={16} />
            </button>
          </div>
        </div>
      </header>
      

    </>
  );
});

export default Navbar;
