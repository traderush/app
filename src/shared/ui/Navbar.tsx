'use client';
import Image from 'next/image';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Bell, Percent, BookOpen, Wallet, Send, UserPlus, Copy, ChevronDown, Gift, Pencil } from 'lucide-react';
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
  const refcode = 'USER123'; // TODO: Get from user store or API
  const [isRefPopoverOpen, setIsRefPopoverOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDiscountButtonClicked, setIsDiscountButtonClicked] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });

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

  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Handle scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Update indicator position when path changes
  useEffect(() => {
    const updateIndicator = () => {
      const activeIndex = PRIMARY_NAVIGATION.findIndex((item) => 
        item.href === '/' ? path === '/' : path.startsWith(item.href)
      );

      if (activeIndex !== -1 && navItemRefs.current[activeIndex]) {
        const activeElement = navItemRefs.current[activeIndex];
        const navContainer = activeElement?.parentElement;
        
        if (navContainer && activeElement) {
          const containerRect = navContainer.getBoundingClientRect();
          const elementRect = activeElement.getBoundingClientRect();
          
          setIndicatorStyle({
            left: elementRect.left - containerRect.left,
            width: elementRect.width,
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
  }, [path]);

  const handleCopyRefcode = () => {
    const referralText = `r/${refcode}`;
    navigator.clipboard.writeText(referralText).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(() => {
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
      <header 
        className={clsxUtility(
          "w-full transition-all duration-300 ease-out",
          isScrolled ? "border-b border-zinc-800/50" : "border-b border-transparent"
        )} 
        style={{ 
          backgroundColor: isScrolled ? '#000000' : 'transparent',
          ...(isScrolled ? { 
            boxShadow: `0 12px 48px -12px ${hexToRgba(signatureColor, 0.1)}, 0 6px 24px -6px ${hexToRgba(signatureColor, 0.06)}` 
          } : {})
        }}
      >
        <div className="flex h-14 w-full items-center gap-4 px-4 pl-0">

          {/* Nav menu items */}
          <nav className="max-lg:hidden flex items-center gap-0 pl-4 relative">
            {/* Animated background indicator */}
            <div
              className="absolute h-8 rounded-md transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: `${indicatorStyle.left}px`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity,
                backgroundColor: hexToRgbaLightened(signatureColor, 0.15),
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            
            {PRIMARY_NAVIGATION.map((item, index) => {
              // For root path, only match exactly. For other paths, match if path starts with href
              const active = item.href === '/' ? path === '/' : path.startsWith(item.href);
              return (
                <React.Fragment key={item.href}>
                  {index > 0 && (
                    <div className="w-px h-4 bg-white/10 mx-2" />
                  )}
                  <Link
                    ref={(el) => {
                      navItemRefs.current[index] = el;
                    }}
                    href={item.href}
                    className={clsxUtility(
                      'relative flex items-center gap-1.5 px-2 text-[14px] font-normal transition-colors duration-300',
                      active ? 'text-white' : 'text-white/40 hover:text-white/60',
                    )}
                    style={{ 
                      color: active ? signatureColor : undefined,
                      lineHeight: '16px',
                      transition: 'color 0.3s ease-out',
                    }}
                  >
                    <span style={{ lineHeight: '16px' }}>{item.label}</span>
                    {item.badge && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded transition-all duration-300"
                        style={{
                          backgroundColor: active ? `${signatureColor}20` : 'transparent',
                          color: active ? signatureColor : 'inherit',
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
          <button 
            className='group shrink-0 text-[14px] rounded-md px-4 py-2 transition-all duration-200 cursor-pointer border-0 flex items-center gap-1.5' 
            style={{ 
              backgroundColor: 'rgba(249, 115, 22, 0.08)',
              transform: isDiscountButtonClicked ? 'scale(0.95)' : 'scale(1)',
            }} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.12)'} 
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(249, 115, 22, 0.08)';
              setIsDiscountButtonClicked(false);
            }}
            onMouseDown={() => setIsDiscountButtonClicked(true)}
            onMouseUp={() => setIsDiscountButtonClicked(false)}
          >
            <Percent size={16} className="text-orange-500" />
            <p className='group-hover:bg-[#f97316] bg-gradient-to-r from-[#f9731687] to-[#f97316] bg-clip-text text-transparent transition-colors'>Enjoy 0% fees on Trading</p>
          </button>

          {/* How to Trade button - only show on box-hit page */}
          {path === '/box-hit' && (
            <button 
              ref={howToPlayButtonRef}
              onClick={onHowToPlayOpen}
              className='group shrink-0 text-[14px] rounded-md px-4 py-2 transition-colors cursor-pointer border flex items-center gap-1.5' 
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
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right stats */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Refer with icon and popup */}
            <div className="relative" ref={popoverRef}>
              <button 
                onClick={() => setIsRefPopoverOpen(!isRefPopoverOpen)}
                className="flex items-center justify-center rounded-md px-3 text-zinc-300 transition-colors"
                style={{ 
                  backgroundColor: '#171717',
                  height: '36px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1f1f1f';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#171717';
                }}
                title="Refer"
              >
                <UserPlus size={18} className="text-zinc-300" />
              </button>
              {isRefPopoverOpen && (
                <>
                  {/* Dimming overlay with tech pattern */}
                  <div 
                    className="fixed inset-0 z-[1000] transition-opacity duration-300 ease-out"
                    style={{
                      background: `
                        linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)),
                        repeating-linear-gradient(
                          0deg,
                          transparent,
                          transparent 1px,
                          rgba(255, 255, 255, 0.03) 1px,
                          rgba(255, 255, 255, 0.03) 2px
                        ),
                        repeating-linear-gradient(
                          90deg,
                          transparent,
                          transparent 1px,
                          rgba(255, 255, 255, 0.03) 1px,
                          rgba(255, 255, 255, 0.03) 2px
                        ),
                        repeating-linear-gradient(
                          45deg,
                          transparent,
                          transparent 8px,
                          rgba(255, 255, 255, 0.02) 8px,
                          rgba(255, 255, 255, 0.02) 9px
                        ),
                        repeating-linear-gradient(
                          -45deg,
                          transparent,
                          transparent 8px,
                          rgba(255, 255, 255, 0.02) 8px,
                          rgba(255, 255, 255, 0.02) 9px
                        )
                      `,
                      backgroundSize: '100% 100%, 24px 24px, 24px 24px, 16px 16px, 16px 16px',
                    }}
                    onClick={() => setIsRefPopoverOpen(false)}
                  />
                  {/* Popup content */}
                  <div className="absolute top-full left-0 mt-2 w-64 p-3 rounded-md border border-zinc-800 bg-surface-850 shadow-xl z-[1002]">
                    <div className="text-xs text-zinc-400 mb-3">Your referral code</div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-zinc-800 bg-surface-900">
                        <span className="text-xs text-zinc-400">r/</span>
                        <code className="text-sm text-white font-mono">{refcode}</code>
                      </div>
                      <button 
                        onClick={handleCopyRefcode}
                        className="relative"
                        title="Copy referral code"
                      >
                        <Copy size={14} className={copySuccess ? 'text-zinc-300' : 'text-zinc-400 hover:text-white transition-colors'} />
                        {copySuccess && (
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-zinc-300 bg-zinc-900 px-2 py-1 rounded border border-zinc-700">
                            Copied!
                          </span>
                        )}
                      </button>
                      <button className="text-xs font-medium flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: signatureColor }}>
                        <Pencil size={12} style={{ color: signatureColor }} />
                        <span className="underline">Edit</span>
                      </button>
                    </div>
                    <div className="text-xs text-zinc-500">Share with friends & earn rewards</div>
                  </div>
                </>
              )}
            </div>

            {/* Deposit button */}
            <button 
              ref={depositButtonRef}
              onClick={onDepositOpen}
              className="rounded-md px-4 py-2 text-sm font-medium text-brand-foreground transition-colors flex items-center"
              style={{ backgroundColor: signatureColor, height: '36px' }}
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
