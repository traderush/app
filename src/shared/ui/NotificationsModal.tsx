'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '@/shared/ui/constants/notifications';
import { SlideShowSlide } from './SlideShowPopup';
import Image from 'next/image';
import Modal from './ui/modal';

interface NotificationsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function NotificationsPopup({ isOpen, onClose, triggerRef }: NotificationsPopupProps) {
  return (
    <Modal title="Notifications" isOpen={isOpen} onClose={onClose} triggerRef={triggerRef}>
       <NotificationsContent onClose={onClose} />
       <NewsUpdatesContent isOpen={isOpen} />
    </Modal>
  );
}

const NotificationsContent = ({ onClose }: { onClose: () => void }) => {
  return (
    <>
    {MOCK_NOTIFICATIONS.map((notification) => (
      <div
        key={notification.id}
        className="py-3 px-4 border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{
                backgroundColor:
                  notification.type === 'success'
                    ? '#22c55e'
                    : notification.type === 'warning'
                      ? '#facc15'
                      : '#3b82f6',
              }} />
              <div className="text-zinc-100 text-sm font-medium">
                {notification.title}
              </div>
            </div>
            <div className="text-zinc-400 text-xs leading-relaxed">
              {notification.message}
            </div>
            <div className="text-zinc-500 text-xs mt-1">
              {notification.timestamp}
            </div>
          </div>
          <button
            className="w-3 h-3 rounded hover:bg-zinc-800/50 flex items-center justify-center transition-colors"
            aria-label="Dismiss notification"
            onClick={onClose}
          >
            <X className="text-zinc-500" />
          </button>
        </div>
        {/* <HowToPlayPopup isOpen={true} onClose={() => {}} triggerRef={popupRef} /> */}
      </div>
    ))}
    </>
  )
}

const NewsUpdatesContent = ({ isOpen }: { isOpen: boolean }) => {

  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: SlideShowSlide[] = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of trading and how to place your first trade on the platform.',
      image: 'https://i.ibb.co/chN47y4X/customwallettrackernotifications-ezgif-com-optimize.gif',
    },
    {
      title: 'Advanced Strategies',
      description: 'Discover advanced trading strategies and risk management techniques.',
      image: 'https://i.ibb.co/ynd8cQB2/customtipstoastposition-ezgif-com-optimize-1.gif',
    },
    {
      title: 'Community Features',
      description: 'Connect with other traders, share insights, and track top performers.',
      image: 'https://i.ibb.co/v4YX0JJ7/newchartindicators-ezgif-com-optimize.gif',
    },
  ];

  // Reset to first slide whenever the modal reopens
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  const goToSlide = (index: number) => {
    const normalized = (index + slides.length) % slides.length;
    setCurrentSlide(normalized);
  };

  const slide = slides[currentSlide];

  return (
    <div
    className="relative w-full max-w-3xl pointer-events-auto border-zinc-800 rounded shadow-2xl transition-all duration-200 ease-out opacity-100 scale-100"
    style={{ backgroundColor: '#0E0E0E' }}
  >
    <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
      <h2 className="text-zinc-100" style={{ fontSize: '14px', fontWeight: 500 }}>
        News & Updates
      </h2>
      {/* <button
        onClick={onClose}
        className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
        aria-label="Close"
      >
        <X size={14} className="text-white" />
      </button> */}
    </div>

    <div className="p-6">
      <div className="text-center space-y-6">
        <div className="w-full max-w-lg mx-auto">
          <div className="relative w-full h-0 pb-[56%] rounded-lg overflow-hidden border border-zinc-700/50">
            <Image
              src={slide.image}
              alt={slide.imageAlt || slide.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
              loading="lazy"
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-white font-medium" style={{ fontSize: '14px' }}>
            {slide.title}
          </h3>
          <p className="text-zinc-400" style={{ fontSize: '12px' }}>
            {slide.description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => goToSlide(currentSlide - 1)}
            className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} className="text-zinc-400" />
          </button>

          <div className="flex gap-2">
            {slides.map((_, index) => {
              const isActive = index === currentSlide;
              return (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{
                    backgroundColor: isActive ? '#22c55e' : 'rgba(113, 113, 122, 0.6)',
                  }}
                  aria-label={`Go to slide ${index + 1}`}
                />
              );
            })}
          </div>

          <button
            onClick={() => goToSlide(currentSlide + 1)}
            className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight size={20} className="text-zinc-400" />
          </button>
        </div>
      </div>
    </div>
  </div>
  )
}