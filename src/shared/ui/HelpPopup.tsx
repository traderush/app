'use client';
import { useRef, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

interface HelpPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function HelpPopup({ isOpen, onClose, triggerRef }: HelpPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

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

  const helpLinks = [
    {
      title: 'How Detection Works',
      description: 'Learn how our price detection system identifies trading opportunities',
      href: '#',
    },
    {
      title: 'Fee Structure',
      description: 'Understand our transparent fee structure and pricing model',
      href: '#',
    },
    {
      title: 'Getting Started',
      description: 'New to trading? Start here with our beginner guide',
      href: '#',
    },
    {
      title: 'API Documentation',
      description: 'Access our API documentation for developers',
      href: '#',
    },
    {
      title: 'Community Guidelines',
      description: 'Read our community guidelines and code of conduct',
      href: '#',
    },
  ];

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
            <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Help</h2>
            <button
              onClick={onClose}
              className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[600px] overflow-y-auto">
            <div className="space-y-2">
              {helpLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    // In a real app, this would navigate to the help page
                  }}
                  className="block p-3 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                          {link.title}
                        </h3>
                        <ExternalLink size={12} className="text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                      </div>
                      <p className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                        {link.description}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Footer section */}
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 text-center">
                Need more help?{' '}
                <a href="#" className="text-zinc-400 hover:text-white transition-colors underline">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

