'use client';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
}

export default function Modal({ title, isOpen, onClose, triggerRef, children, className }: ModalProps) {
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

  const containerClassName = cn('fixed inset-0 bg-black/60 z-[1000] transition-all duration-300 ease-out opacity-60', {
    className,
    'opacity-0 pointer-events-none': !isOpen,
  });
  
  return (
    <>
      {/* Overlay */}
      <div 
        className={containerClassName}
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
            <h3 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="grid place-items-center w-4 h-4 rounded hover:bg-white/5 transition-colors"
            >
              <X className="text-white" size={16} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="max-h-[calc(100vh-10rem)] overflow-auto">
          {children}
        </div>
      </div>
    </>
  );
}