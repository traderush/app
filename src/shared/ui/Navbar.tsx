'use client';
import Image from 'next/image';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell, Percent, BookOpen, Wallet, Send, UserPlus, Copy, ChevronDown } from 'lucide-react';
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
  onHowToPlayOpen: () => void;
  howToPlayButtonRef: React.RefObject<HTMLButtonElement | null>;
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
  onHowToPlayOpen,
  howToPlayButtonRef,
}: NavbarProps) {
  const path = usePathname();
  const signatureColor = useUIStore((state) => state.signatureColor);
  const totalBalance = useUserStore((state) => state.totalBalance);
  const username = useUserStore((state) => state.user?.username || 'User');
  const refcode = 'ABC123'; // TODO: Get from user store or API
  const [isRefPopoverOpen, setIsRefPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleCopyRefcode = () => {
    navigator.clipboard.writeText(refcode).catch(() => {
      // Fallback if clipboard API fails
      console.error('Failed to copy refcode');
    });
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsRefPopoverOpen(false);
      }
    };

    if (isRefPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isRefPopoverOpen]);

  return (
    <>
      <header className="w-full">
        <div className="flex h-14 w-full items-center gap-4 px-4 pl-0">

          {/* Nav menu items */}
          <nav className="max-lg:hidden flex items-center gap-0 pl-4">
            {PRIMARY_NAVIGATION.map((item, index) => {
              const active = path.startsWith(item.href);
              const Icon = item.icon;
              return (
                <React.Fragment key={item.href}>
                  {index > 0 && (
                    <div className="w-px h-4 bg-white/10 mx-2" />
                  )}
                  <Link
                    href={item.href}
                    className={clsxUtility(
                      'flex items-center gap-1.5 px-2 text-[13px] font-normal transition-colors',
                      active ? 'text-white' : 'text-white/40 hover:text-white/60',
                    )}
                    style={{ 
                      ...(active ? { color: signatureColor } : {}),
                      lineHeight: '16px'
                    }}
                  >
                    <Icon 
                      size={16} 
                      className={clsxUtility(
                        active ? '' : 'text-white/40'
                      )}
                    />
                    <span style={{ lineHeight: '16px' }}>{item.label}</span>
                    {item.badge && (
                      <span 
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: `${signatureColor}20`,
                          color: signatureColor 
                        }}
                      >
                        #{item.badge}
                      </span>
                    )}
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>

          {/* Discount button */}
          <button className='group shrink-0 text-[13px] rounded-md px-4 py-2 transition-colors cursor-pointer border-0 flex items-center gap-1.5' style={{ backgroundColor: 'rgba(249, 115, 22, 0.08)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.12)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.08)'}>
            <Percent size={16} className="text-orange-500" />
            <p className='group-hover:bg-[#f97316] bg-gradient-to-r from-[#f9731687] to-[#f97316] bg-clip-text text-transparent transition-colors'>Enjoy 0% fees on Trading</p>
          </button>

          {/* How to Trade button */}
          <button 
            ref={howToPlayButtonRef}
            onClick={onHowToPlayOpen}
            className='group shrink-0 text-[13px] rounded-md px-4 py-2 transition-colors cursor-pointer border flex items-center gap-1.5' 
            style={{ backgroundColor: 'rgba(236, 72, 153, 0.08)', borderColor: 'rgba(236, 72, 153, 0.5)' }} 
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.7)';
            }} 
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.5)';
            }}
          >
            <BookOpen size={16} className="text-pink-500" />
            <p className='group-hover:bg-[#ec4899] bg-gradient-to-r from-[#ec489987] to-[#ec4899] bg-clip-text text-transparent transition-colors'>How to Trade</p>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right stats */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Refer with icon and popup */}
            <div className="relative" ref={popoverRef}>
              <button 
                onClick={() => setIsRefPopoverOpen(!isRefPopoverOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-surface-900 text-sm text-zinc-300 hover:bg-surface-850 transition-colors"
              >
                <span>Refer</span>
                <UserPlus size={18} className="text-zinc-300" />
              </button>
              {isRefPopoverOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 p-3 rounded-md border border-zinc-800 bg-surface-850 shadow-xl z-50">
                  <div className="text-xs text-zinc-400 mb-2">Your referral code</div>
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-sm text-white font-mono">{refcode}</code>
                    <button onClick={handleCopyRefcode}>
                      <Copy size={14} className="text-zinc-400 hover:text-white" />
                    </button>
                  </div>
                  <div className="text-xs text-zinc-500">Share this code with friends</div>
                </div>
              )}
            </div>

            {/* Deposit button */}
            <button 
              ref={depositButtonRef}
              onClick={onDepositOpen}
              className="rounded-md px-4 py-2 text-sm font-medium text-brand-foreground transition-colors"
              style={{ backgroundColor: signatureColor }}
            >
              Deposit
            </button>

            {/* Notifications bell and Portfolio icon */}
            <div className="flex items-center gap-1">
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

              {/* Portfolio icon */}
              <Link 
                href="/portfolio"
                className="grid place-items-center w-8 h-8 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Portfolio"
              >
                <Wallet size={18} />
              </Link>
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
            
            {/* Balance with username */}
            <div className="flex flex-col hover:opacity-80 transition-opacity cursor-pointer">
              <div className="text-xs font-medium text-zinc-400">{username}</div>
              <div className="text-sm font-semibold text-zinc-100">
                ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            
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
                className="w-10 h-10 rounded-md object-cover hover:opacity-80 transition-opacity"
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
