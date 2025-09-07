'use client';

import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

export type GameTab = {
  label: string;
  href?: string;      // omit or undefined = locked (no navigation)
  locked?: boolean;   // locked overrides href
};

export default function ScrollableGameTabs({
  items,
  bg = '#0B0B0C',     // navbar bg so fade matches perfectly
}: {
  items: GameTab[];
  bg?: string;
}) {
  const path = usePathname();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateShadow = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 2);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 2);
  };

  useEffect(() => {
    updateShadow();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateShadow();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(updateShadow);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, []);

  const scrollByPx = (px: number) => scrollerRef.current?.scrollBy({ left: px, behavior: 'smooth' });

  return (
    <div className="relative flex items-center gap-2">
      {/* Left arrow */}
      <button
        aria-label="Scroll left"
        onClick={() => scrollByPx(-260)}
        disabled={!canLeft}
        className={clsx(
          'grid place-items-center w-8 h-8 transition',
          canLeft
            ? 'text-[#C6C6CC] hover:text-white'
            : 'text-zinc-600 cursor-default'
        )}
      >
        <ChevronLeft size={16}/>
      </button>

      {/* Scroll container with fade overlay */}
      <div className="relative">
        <div
          ref={scrollerRef}
          className="max-w-[560px] overflow-x-auto no-scrollbar"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="flex items-center gap-2 pr-16"> {/* pr keeps last pill peeking */}
            {items.map((t, index) => {
              const locked = t.locked || !t.href;
              const active = !!t.href && path.startsWith(t.href);
              const base =
              'whitespace-nowrap px-3 py-1.5 text-[14px] font-medium transition-colors';
              
              // Create unique key using index and label/href
              const uniqueKey = t.href || `${t.label}-${index}`;
              
              if (locked) {
                return (
                  <span
                    key={uniqueKey}
                    aria-disabled
                    className={clsx(
                      base,
                      'text-white/20 cursor-not-allowed flex items-center gap-1.5'
                    )}
                    title="Locked"
                  >
                    <Lock size={14} className="opacity-70" /> {t.label}
                  </span>
                );
              }
              return (
                <a
                  key={uniqueKey}
                  href={t.href!}
                  className={clsx(
                    base,
                    active
                      ? 'text-white'
                      : 'text-white/20 hover:text-white'
                  )}
                >
                  {t.label}
                </a>
              );
            })}
          </div>
        </div>

        {/* Fades (right always shown slightly; left only when scrolled) */}
        {/* Right fade */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-14 z-10"
          style={{
            backgroundImage: `linear-gradient(to left, ${bg}, transparent)`,
          }}
        />
        {/* Left fade (only when we can scroll left) */}
        {canLeft && (
          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-6 z-10"
            style={{
              backgroundImage: `linear-gradient(to right, ${bg}, transparent)`,
            }}
          />
        )}
      </div>

      {/* Right arrow */}
      <button
        aria-label="Scroll right"
        onClick={() => scrollByPx(260)}
        disabled={!canRight}
        className={clsx(
          'grid place-items-center w-8 h-8 transition',
          canRight
            ? 'text-[#C6C6CC] hover:text-white'
            : 'text-zinc-600 cursor-default'
        )}
      >
        <ChevronRight size={16}/>
      </button>
    </div>
  );
}