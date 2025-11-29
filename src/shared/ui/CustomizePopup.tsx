'use client';
import { useState, useEffect, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { useUIStore } from '@/shared/state';

interface CustomizePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomizePopup({ isOpen, onClose }: CustomizePopupProps) {
  const signatureColor = useUIStore((state) => state.signatureColor);
  const setSignatureColor = useUIStore((state) => state.setSignatureColor);
  const tradingPositiveColor = useUIStore((state) => state.tradingPositiveColor);
  const tradingNegativeColor = useUIStore((state) => state.tradingNegativeColor);
  const setTradingPositiveColor = useUIStore((state) => state.setTradingPositiveColor);
  const setTradingNegativeColor = useUIStore((state) => state.setTradingNegativeColor);
  const resetTradingColors = useUIStore((state) => state.resetTradingColors);
  const [localSignatureColor, setLocalSignatureColor] = useState(signatureColor);
  const [localTradingPositiveColor, setLocalTradingPositiveColor] = useState(tradingPositiveColor);
  const [localTradingNegativeColor, setLocalTradingNegativeColor] = useState(tradingNegativeColor);
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
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

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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

  // Popup is now centered, no positioning logic needed

  // Reset to default signature orange
  const handleReset = () => {
    setLocalSignatureColor('#FA5616');
  };

  // Reset trading colors
  const handleResetTradingColors = () => {
    setLocalTradingPositiveColor('#2ecc71');
    setLocalTradingNegativeColor('#ff5a5f');
  };

  // Apply all color changes
  const handleApply = () => {
    setSignatureColor(localSignatureColor);
    setTradingPositiveColor(localTradingPositiveColor);
    setTradingNegativeColor(localTradingNegativeColor);
    onClose();
  };

  // Update local colors when store colors change
  useEffect(() => {
    setLocalSignatureColor(signatureColor);
  }, [signatureColor]);

  useEffect(() => {
    setLocalTradingPositiveColor(tradingPositiveColor);
  }, [tradingPositiveColor]);

  useEffect(() => {
    setLocalTradingNegativeColor(tradingNegativeColor);
  }, [tradingNegativeColor]);

  if (!isOpen) return null;

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
          <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Customize Theme</h2>
          <button
            onClick={onClose}
            className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
          >
            <X size={14} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Trading Colors Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium" style={{ fontSize: '12px' }}>
                Trading Colors
              </label>
              <button
                onClick={handleResetTradingColors}
                className="flex items-center gap-1 text-zinc-400 hover:text-zinc-300 transition-colors"
                style={{ fontSize: '12px' }}
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
            
            {/* Trading Colors - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Positive Color (Green/Win) */}
              <div className="space-y-2">
                <label className="text-zinc-400" style={{ fontSize: '12px' }}>
                  Positive (Win/Green)
                </label>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded border border-zinc-600"
                    style={{ backgroundColor: localTradingPositiveColor }}
                  />
                  <input
                    type="color"
                    value={localTradingPositiveColor}
                    onChange={(e) => setLocalTradingPositiveColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-600 cursor-pointer"
                  />
                  <span 
                    className="text-zinc-300 font-mono"
                    style={{ fontSize: '12px' }}
                  >
                    {localTradingPositiveColor}
                  </span>
                </div>
              </div>

              {/* Negative Color (Red/Loss) */}
              <div className="space-y-2">
                <label className="text-zinc-400" style={{ fontSize: '12px' }}>
                  Negative (Loss/Red)
                </label>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-6 h-6 rounded border border-zinc-600"
                    style={{ backgroundColor: localTradingNegativeColor }}
                  />
                  <input
                    type="color"
                    value={localTradingNegativeColor}
                    onChange={(e) => setLocalTradingNegativeColor(e.target.value)}
                    className="w-6 h-6 rounded border border-zinc-600 cursor-pointer"
                  />
                  <span 
                    className="text-zinc-300 font-mono"
                    style={{ fontSize: '12px' }}
                  >
                    {localTradingNegativeColor}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature Color Section */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium" style={{ fontSize: '12px' }}>
              Signature Color
            </label>
                              <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-zinc-400 hover:text-zinc-300 transition-colors"
                style={{ fontSize: '12px' }}
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
            </div>
            
            {/* Color Preview */}
            <div className="flex items-center gap-3">
              <div 
                className="w-6 h-6 rounded border border-zinc-600"
                style={{ backgroundColor: localSignatureColor }}
              />
              <input
                type="color"
                value={localSignatureColor}
                onChange={(e) => setLocalSignatureColor(e.target.value)}
                className="w-6 h-6 rounded border border-zinc-600 cursor-pointer"
              />
              <span 
                className="text-zinc-300 font-mono"
                style={{ fontSize: '12px' }}
              >
                {localSignatureColor}
              </span>
            </div>
            
            <p className="text-zinc-400" style={{ fontSize: '12px' }}>
              This color will be used throughout the app for buttons, highlights, and accents.
            </p>
          </div>

          {/* Preset Colors */}
          <div className="space-y-3">
            <label className="text-zinc-300 font-medium" style={{ fontSize: '12px' }}>
              Quick Colors
            </label>
            <div className="grid grid-cols-6 gap-2">
              {[
                '#FA5616', // Original orange
                '#3B82F6', // Blue
                '#10B981', // Green
                '#EF4444', // Red
                '#8B5CF6', // Purple
                '#F59E0B', // Amber
                '#EC4899', // Pink
                '#06B6D4', // Cyan
                '#84CC16', // Lime
                '#F97316', // Orange
                '#6366F1', // Indigo
                '#14B8A6', // Teal
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => setLocalSignatureColor(color)}
                  className={`w-6 h-6 rounded border-2 transition-all hover:scale-105 ${
                    localSignatureColor === color 
                      ? 'scale-110' 
                      : ''
                  }`}
                  style={{ 
                    backgroundColor: color,
                    borderColor: localSignatureColor === color ? localSignatureColor : '#52525B'
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-zinc-300 transition-colors rounded"
            style={{ fontSize: '12px' }}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 font-medium rounded transition-colors"
            style={{ 
              backgroundColor: localSignatureColor,
              color: '#09090B',
              fontSize: '12px'
            }}
            onClick={handleApply}
          >
            <span style={{ color: '#09090B' }}>Apply Changes</span>
          </button>
        </div>
              </div>
            </div>
          </>
        );
      }
