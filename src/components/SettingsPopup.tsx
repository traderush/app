'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Volume2, VolumeX, Moon, Sun, Monitor, Smartphone, Globe, Shield, Bell, User, Palette } from 'lucide-react';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function SettingsPopup({ isOpen, onClose, triggerRef }: SettingsPopupProps) {
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
            <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Settings</h2>
            <button
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <Volume2 size={16} className="text-zinc-400" />
                  <span className="text-sm text-zinc-200">Sound Effects</span>
                </div>
                <div className="w-12 h-6 rounded-full bg-zinc-700 relative cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-zinc-300 absolute top-0.5 left-0.5 transition-transform"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <Bell size={16} className="text-zinc-400" />
                  <span className="text-sm text-zinc-200">Notifications</span>
                </div>
                <div className="w-12 h-6 rounded-full bg-zinc-700 relative cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-zinc-300 absolute top-0.5 left-0.5 transition-transform"></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <Moon size={16} className="text-zinc-400" />
                  <span className="text-sm text-zinc-200">Dark Mode</span>
                </div>
                <div className="w-12 h-6 rounded-full bg-zinc-700 relative cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-zinc-300 absolute top-0.5 left-0.5 transition-transform"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <Monitor size={16} className="text-zinc-400" />
                  <span className="text-sm text-zinc-200">Compact Layout</span>
                </div>
                <div className="w-12 h-6 rounded-full bg-zinc-700 relative cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-zinc-300 absolute top-0.5 left-0.5 transition-transform"></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-zinc-400" />
                  <span className="text-sm text-zinc-200">Two-Factor Auth</span>
                </div>
                <div className="w-12 h-6 rounded-full bg-zinc-700 relative cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-zinc-300 absolute top-0.5 left-0.5 transition-transform"></div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <Globe size={16} className="text-zinc-400" />
                  <span className="text-sm text-zinc-200">Location Services</span>
                </div>
                <div className="w-12 h-6 rounded-full bg-zinc-700 relative cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-zinc-300 absolute top-0.5 left-0.5 transition-transform"></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 rounded bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 transition-colors">
                <User size={16} className="text-zinc-400" />
                <span className="text-sm text-zinc-200">Profile Settings</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 transition-colors">
                <Palette size={16} className="text-zinc-400" />
                <span className="text-sm text-zinc-200">Customize Theme</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
