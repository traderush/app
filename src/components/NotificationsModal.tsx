'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface NotificationsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function NotificationsPopup({ isOpen, onClose, triggerRef }: NotificationsPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle animation state
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-[1000] transition-all duration-300 ease-out ${
          isOpen ? 'opacity-60' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Popup positioned relative to trigger */}
              <div 
          ref={popupRef}
          className={`fixed w-80 border border-zinc-800 rounded shadow-2xl z-[1002] transition-all duration-300 ease-out pointer-events-auto ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            top: triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom + 8 : 0,
            right: triggerRef.current ? window.innerWidth - triggerRef.current.getBoundingClientRect().right : 0,
            backgroundColor: '#0E0E0E',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Notifications</h3>
          <div className="flex items-center gap-2">
            <button
              className="text-xs font-medium text-zinc-400 hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:pointer-events-none transition-opacity"
              disabled={true}
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="grid place-items-center w-6 h-6 rounded-full hover:bg-white/5 transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="max-h-96 overflow-auto">
          {/* Empty state */}
          <div className="p-6 text-center">
            <div className="text-zinc-400" style={{fontSize: '12px'}}>No notifications</div>
          </div>
        </div>
      </div>
    </>
  );
}
