'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { X, Copy, Check, AlertCircle } from 'lucide-react';
import { useUIStore } from '@/shared/state';

interface DepositPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepositPopup({ isOpen, onClose }: DepositPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const signatureColor = useUIStore((state) => state.signatureColor);
  const depositAddress = '4KtmTauUtwzTwy2U6v966xMNz961XP9iqk8WfFtpnKBe';

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

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(depositAddress);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

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
            {/* Overlay with tech pattern */}
      <div 
        className={`fixed inset-0 z-[1000] transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
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
      <div 
        ref={popupRef}
        className="fixed inset-0 z-[1001] flex items-center justify-center p-4 pointer-events-none"
      >
        <div 
          className={`w-96 border border-zinc-800 rounded shadow-2xl transition-all duration-300 ease-out pointer-events-auto ${
            isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{ backgroundColor: '#0E0E0E' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Deposit</h2>
            <button
              onClick={onClose}
              aria-label="Close deposit"
              className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
            {/* Network & Balance */}
              <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Network</span>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-800 bg-surface-900">
                  <span className="relative w-4 h-4">
                    <Image
                      src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/solana-sol-icon.png"
                      alt="SOL"
                      fill
                      className="object-contain"
                      sizes="16px"
                    />
                  </span>
                <span className="text-xs text-white">Solana</span>
              </div>
              </div>
              <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Balance</span>
                <span className="text-xs text-white">0.0000 SOL</span>
            </div>

            {/* QR Code */}
            <div className="space-y-2">
              <span className="text-xs text-zinc-400 uppercase tracking-wide">Deposit Address</span>
              <div className="flex justify-center">
                <div className="w-32 h-32 bg-white rounded flex items-center justify-center border border-zinc-800">
                  <div className="text-black text-xs">QR Code</div>
                </div>
                </div>
              </div>
              
            {/* Address */}
            <div className="space-y-2">
              <div className="bg-surface-900 border border-zinc-800 rounded p-3">
                <div className="text-xs text-white font-mono break-all leading-relaxed mb-2">
                  {depositAddress}
                </div>
                  <button
                    onClick={handleCopyAddress}
                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border text-xs transition-colors ${
                      isCopied 
                      ? 'text-zinc-300 border-zinc-700 bg-zinc-900/50' 
                      : 'text-zinc-400 border-zinc-800 bg-surface-850 hover:bg-surface-800 hover:text-white'
                    }`}
                  >
                  {isCopied ? (
                    <>
                      <Check size={12} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Address</span>
                    </>
                  )}
                  </button>
              </div>
            </div>

            {/* Warning */}
            <div className="pt-2 border-t border-zinc-800">
              <div className="flex items-start gap-2">
                <AlertCircle size={12} className="text-zinc-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Only send SOL on the Solana network to this address. Sending from other networks will result in permanent loss of funds.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
