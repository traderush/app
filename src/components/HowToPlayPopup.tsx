'use client';
import { useState, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/stores';

interface HowToPlayPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function HowToPlayPopup({ isOpen, onClose, triggerRef }: HowToPlayPopupProps) {
  console.log('HowToPlayPopup render - isOpen:', isOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const signatureColor = useAppStore((state) => state.signatureColor);

  const slides = [
    {
      title: "Getting Started",
      description: "Learn the basics of trading and how to place your first bet on the platform.",
      image: "https://i.ibb.co/chN47y4X/customwallettrackernotifications-ezgif-com-optimize.gif"
    },
    {
      title: "Advanced Strategies", 
      description: "Discover advanced trading strategies and risk management techniques.",
      image: "https://i.ibb.co/ynd8cQB2/customtipstoastposition-ezgif-com-optimize-1.gif"
    },
    {
      title: "Community Features",
      description: "Connect with other traders, share insights, and track top performers.",
      image: "https://i.ibb.co/v4YX0JJ7/newchartindicators-ezgif-com-optimize.gif"
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[1000] transition-all duration-300 ease-out opacity-60"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[1001] flex items-center justify-center pointer-events-none">
        <div 
          ref={popupRef}
          className="w-[600px] border border-zinc-800 rounded shadow-2xl pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100"
          style={{ backgroundColor: '#0E0E0E' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>How to Play</h2>
            <button
              onClick={onClose}
              className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="text-center space-y-6">
              {/* Demo GIF */}
              <div className="w-full max-w-lg mx-auto">
                <img 
                  src={slides[currentSlide].image}
                  alt={`${slides[currentSlide].title} Demo`}
                  className="w-full rounded-lg border border-zinc-700/50"
                />
              </div>
              
              {/* Slide Content */}
              <div className="space-y-3">
                <h3 className="text-white font-medium" style={{fontSize: '14px'}}>
                  {slides[currentSlide].title}
                </h3>
                <p className="text-zinc-400" style={{fontSize: '12px'}}>
                  {slides[currentSlide].description}
                </p>
              </div>
              
              {/* Navigation */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={prevSlide}
                  className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
                >
                  <ChevronLeft size={20} className="text-zinc-400" />
                </button>
                
                {/* Slide Indicators */}
                <div className="flex gap-2">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentSlide ? '' : 'bg-zinc-600'
                      }`}
                      style={{
                        backgroundColor: index === currentSlide ? signatureColor : undefined
                      }}
                    />
                  ))}
                </div>
                
                <button
                  onClick={nextSlide}
                  className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
                >
                  <ChevronRight size={20} className="text-zinc-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
