'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Trash2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '@/shared/ui/constants/notifications';
import { SlideShowSlide } from './SlideShowPopup';
import Image from 'next/image';
import Modal from './ui/modal';
import { useUIStore } from '@/shared/state';

interface NotificationsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function NotificationsPopup({ isOpen, onClose, triggerRef }: NotificationsPopupProps) {
  const signatureColor = useUIStore((state) => state.signatureColor);
  const notificationCount = MOCK_NOTIFICATIONS.length;
  
  return (
    <Modal 
      title="Notifications" 
      isOpen={isOpen} 
      onClose={onClose} 
      triggerRef={triggerRef}
      badge={notificationCount}
      signatureColor={signatureColor}
    >
       <NotificationsContent onClose={onClose} />
       <NewsUpdatesContent isOpen={isOpen} />
    </Modal>
  );
}

const NotificationsContent = ({ onClose }: { onClose: () => void }) => {
  const signatureColor = useUIStore((state) => state.signatureColor);
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToSlide = (index: number) => {
    const normalized = (index + MOCK_NOTIFICATIONS.length) % MOCK_NOTIFICATIONS.length;
    setCurrentIndex(normalized);
  };

  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < MOCK_NOTIFICATIONS.length - 1;

  const currentNotification = MOCK_NOTIFICATIONS[currentIndex];

  return (
    <div className="relative">
      {/* Notification Card - Full Width */}
      <div className="py-3 px-4 border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-all duration-300 relative">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {currentNotification.type === 'success' ? (
                  <CheckCircle2 
                    className="text-green-500 shrink-0" 
                    size={16}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.5))' }}
                  />
                ) : currentNotification.type === 'warning' ? (
                  <AlertTriangle 
                    className="text-yellow-500 shrink-0" 
                    size={16}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(250, 204, 21, 0.5))' }}
                  />
                ) : (
                  <Info 
                    className="text-blue-500 shrink-0" 
                    size={16}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' }}
                  />
                )}
                <div className="text-zinc-100 text-sm font-medium">
                  {currentNotification.title}
                </div>
              </div>
              <button
                className="rounded hover:bg-zinc-800/50 flex items-center justify-center transition-colors shrink-0"
                aria-label="Dismiss notification"
                onClick={onClose}
                style={{ width: '20px', height: '20px' }}
              >
                <Trash2 className="text-zinc-500" size={14} />
              </button>
            </div>
            <div className="text-zinc-400 text-xs leading-relaxed mb-2">
              {currentNotification.message}
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-zinc-500 text-xs">
                {currentNotification.timestamp}
              </div>
              {/* Arrow Controls - Same level as timestamp */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToSlide(currentIndex - 1)}
                  className={`p-1 hover:opacity-80 transition-opacity ${!canGoLeft ? 'opacity-30 cursor-not-allowed' : ''}`}
                  aria-label="Previous notification"
                  disabled={!canGoLeft}
                >
                  <ChevronLeft size={16} className="text-white" />
                </button>
                <button
                  onClick={() => goToSlide(currentIndex + 1)}
                  className={`p-1 hover:opacity-80 transition-opacity ${!canGoRight ? 'opacity-30 cursor-not-allowed' : ''}`}
                  aria-label="Next notification"
                  disabled={!canGoRight}
                >
                  <ChevronRight size={16} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const NewsUpdatesContent = ({ isOpen }: { isOpen: boolean }) => {
  const signatureColor = useUIStore((state) => state.signatureColor);
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
    className="relative w-full pointer-events-auto border-zinc-800 rounded shadow-2xl transition-all duration-200 ease-out opacity-100 scale-100"
    style={{ backgroundColor: '#0E0E0E' }}
  >
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-zinc-100" style={{ fontSize: '14px', fontWeight: 500 }}>
          News & Updates
        </h2>
        <button
          onClick={() => {
            // Clear news & updates functionality
          }}
          className="text-zinc-400 hover:text-white transition-colors text-xs font-medium"
          aria-label="Clear"
        >
          Clear
        </button>
      </div>
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

        <div>
          <h3 className="text-white font-medium mb-2" style={{ fontSize: '14px' }}>
            {slide.title}
          </h3>
          <p className="text-zinc-400 mb-2" style={{ fontSize: '12px' }}>
            {slide.description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => goToSlide(currentSlide - 1)}
            className="p-1 hover:opacity-80 transition-opacity"
            aria-label="Previous slide"
          >
            <ChevronLeft size={16} className="text-white" />
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
                    backgroundColor: isActive ? signatureColor : 'rgba(113, 113, 122, 0.6)',
                  }}
                  aria-label={`Go to slide ${index + 1}`}
                />
              );
            })}
          </div>

          <button
            onClick={() => goToSlide(currentSlide + 1)}
            className="p-1 hover:opacity-80 transition-opacity"
            aria-label="Next slide"
          >
            <ChevronRight size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  </div>
  )
}