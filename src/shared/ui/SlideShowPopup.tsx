'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export type SlideShowSlide = {
  title: string;
  description: string;
  image: string;
  imageAlt?: string;
};

interface SlideShowPopupProps {
  isOpen: boolean;
  onClose: () => void;
  slides: SlideShowSlide[];
  title: string;
  accentColor: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

const SlideShowPopup: React.FC<SlideShowPopupProps> = ({
  isOpen,
  onClose,
  slides,
  title,
  accentColor,
  triggerRef,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Reset to first slide whenever the modal reopens
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on outside click (ignoring clicks on trigger)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popupRef.current?.contains(target)) {
        return;
      }

      if (triggerRef?.current?.contains(target)) {
        return;
      }

      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) {
    return null;
  }

  const goToSlide = (index: number) => {
    const normalized = (index + slides.length) % slides.length;
    setCurrentSlide(normalized);
  };

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={onClose} />

      <div
        ref={popupRef}
        className="relative w-full max-w-3xl pointer-events-auto border border-zinc-800 rounded shadow-2xl transition-all duration-200 ease-out opacity-100 scale-100"
        style={{ backgroundColor: '#0E0E0E' }}
      >
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-zinc-100" style={{ fontSize: '14px', fontWeight: 500 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X size={14} className="text-white" />
          </button>
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
                        backgroundColor: isActive ? accentColor : 'rgba(113, 113, 122, 0.6)',
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
    </div>
  );
};

export default SlideShowPopup;
