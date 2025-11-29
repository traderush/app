'use client';
import { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Switch } from './ui/switch';

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function SettingsPopup({ isOpen, onClose, triggerRef }: SettingsPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  
  // Demo state for settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  const [showTooltips, setShowTooltips] = useState(true);
  const [language, setLanguage] = useState('en');

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
      {/* Overlay with tech pattern */}
      <div 
        className="fixed inset-0 z-[1000] transition-all duration-300 ease-out"
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
              className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {/* Sound Settings */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wide">Sound</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-200">Enable Sound</span>
                    <span className="text-xs text-zinc-500">Play sound effects during trading</span>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wide">Notifications</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-200">Push Notifications</span>
                    <span className="text-xs text-zinc-500">Receive browser notifications</span>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-200">Email Notifications</span>
                    <span className="text-xs text-zinc-500">Get updates via email</span>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wide">Display</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-200">Dark Mode</span>
                    <span className="text-xs text-zinc-500">Use dark theme</span>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-200">Show Tooltips</span>
                    <span className="text-xs text-zinc-500">Display helpful tooltips</span>
                  </div>
                  <Switch
                    checked={showTooltips}
                    onCheckedChange={setShowTooltips}
                  />
                </div>
              </div>
            </div>

            {/* Trading Settings */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wide">Trading</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-200">Auto Start</span>
                    <span className="text-xs text-zinc-500">Automatically start trading session</span>
                  </div>
                  <Switch
                    checked={autoStart}
                    onCheckedChange={setAutoStart}
                  />
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="space-y-3 pt-2 border-t border-zinc-800">
              <h3 className="text-xs font-medium text-zinc-300 uppercase tracking-wide">Language</h3>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
