'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Paintbrush, RotateCcw } from 'lucide-react';
import { useSignatureColor } from '@/contexts/SignatureColorContext';

interface CustomizePopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export default function CustomizePopup({ isOpen, onClose, triggerRef }: CustomizePopupProps) {
  const { signatureColor, setSignatureColor } = useSignatureColor();
  const [localSignatureColor, setLocalSignatureColor] = useState(signatureColor);
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

  // Apply the signature color changes
  const handleApply = () => {
    setSignatureColor(localSignatureColor);
    onClose();
  };

  // Update local color when signature color changes
  useEffect(() => {
    setLocalSignatureColor(signatureColor);
  }, [signatureColor]);

  if (!isOpen) return null;

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
          className="w-72 border border-zinc-800 rounded shadow-2xl pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100"
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
          {/* Signature Color Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
                          <label className="text-zinc-300 font-medium" style={{ fontSize: '11px' }}>
              Signature Color
            </label>
                              <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-zinc-400 hover:text-zinc-300 transition-colors"
                  style={{ fontSize: '11px' }}
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
                style={{ fontSize: '11px' }}
              >
                {localSignatureColor}
              </span>
            </div>
            
            <p className="text-zinc-400" style={{ fontSize: '11px' }}>
              This color will be used throughout the app for buttons, highlights, and accents.
            </p>
          </div>

          {/* Preset Colors */}
          <div className="space-y-3">
            <label className="text-zinc-300 font-medium" style={{ fontSize: '11px' }}>
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
