'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { X, User, Settings, LogOut, Shield, CreditCard, Bell } from 'lucide-react';

interface ProfilePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfilePopup({ isOpen, onClose }: ProfilePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={popupRef}
      className="fixed inset-0 z-[1001] flex items-center justify-center transition-all duration-300 ease-out"
    >
      {/* Overlay with tech pattern */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 1px,
              rgba(255, 255, 255, 0.03) 1px,
              rgba(255, 255, 255, 0.03) 2px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 1px,
              rgba(255, 255, 255, 0.03) 1px,
              rgba(255, 255, 255, 0.03) 2px
            ),
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 8px,
              rgba(255, 255, 255, 0.02) 8px,
              rgba(255, 255, 255, 0.02) 9px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 8px,
              rgba(255, 255, 255, 0.02) 8px,
              rgba(255, 255, 255, 0.02) 9px
            )
          `,
          backgroundSize: '100% 100%, 24px 24px, 24px 24px, 16px 16px, 16px 16px',
        }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-96 border border-zinc-800 rounded shadow-2xl transition-all duration-300 ease-out opacity-100 scale-100" style={{ backgroundColor: '#0E0E0E' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Profile</h2>
          <button
            onClick={onClose}
            className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Profile Info */}
          <div className="flex items-center gap-3">
            <Image
              src="https://i.imgflip.com/2/1vq853.jpg"
              alt="Profile"
              width={48}
              height={48}
              className="w-12 h-12 rounded object-cover"
            />
            <div>
              <div className="text-zinc-100 font-medium">John Doe</div>
              <div className="text-zinc-400 text-sm">john.doe@example.com</div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 p-3 rounded text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
              <User size={16} />
              <span className="text-sm">Edit Profile</span>
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 rounded text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
              <Settings size={16} />
              <span className="text-sm">Settings</span>
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 rounded text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
              <Bell size={16} />
              <span className="text-sm">Notifications</span>
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 rounded text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
              <Shield size={16} />
              <span className="text-sm">Security</span>
            </button>
            
            <button className="w-full flex items-center gap-3 p-3 rounded text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
              <CreditCard size={16} />
              <span className="text-sm">Payment Methods</span>
            </button>
          </div>

          {/* Logout */}
          <div className="pt-2 border-t border-zinc-800">
            <button className="w-full flex items-center gap-3 p-3 rounded text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors">
              <LogOut size={16} />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
