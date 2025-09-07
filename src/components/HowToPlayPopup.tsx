'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Play, Target, TrendingUp, Award, BookOpen, Video, Users } from 'lucide-react';

interface HowToPlayPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function HowToPlayPopup({ isOpen, onClose, triggerRef }: HowToPlayPopupProps) {
  console.log('HowToPlayPopup render - isOpen:', isOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

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
          className="w-96 border border-zinc-800 rounded shadow-2xl pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100"
          style={{ backgroundColor: '#0E0E0E' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>How to Play</h2>
            <button
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Slider Content */}
          <div className="p-6">
            <div className="text-center space-y-4">
              {/* Title */}
              <h3 className="text-white text-lg font-medium">Custom Wallet Tracker Notifications</h3>
              <div className="text-green-500 text-sm">✅ Slider Content Updated!</div>
              
              {/* Description */}
              <p className="text-zinc-400 text-sm">Customize card data items, URL opening option, Toast Duration</p>
              
              {/* Demo Video */}
              <div className="w-full max-w-md mx-auto">
                <video 
                  className="w-full rounded-lg border border-zinc-700/50"
                  controls
                  preload="metadata"
                >
                  <source src="https://gmgn.ai/static/opstatic/customwallettrackernotifications.mp4?v=1" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              
              {/* Pagination Dots */}
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
