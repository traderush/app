'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { X, Copy, Info, ArrowDown, Check } from 'lucide-react';

interface DepositPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepositPopup({ isOpen, onClose }: DepositPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

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
      await navigator.clipboard.writeText('4KtmTauUtwzTwy2U6v966xMNz961XP9iqk8WfFtpnKBe');
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000); // Reset after 2 seconds
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
            {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-[1000] transition-all duration-300 ease-out ${
          isOpen ? 'opacity-60' : 'opacity-0'
        }`}
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
            <h3 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Deposit</h3>
            <button
              onClick={onClose}
              aria-label="Close deposit"
              className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Deposit Token Section */}
            <div className="border border-zinc-700/50 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">Deposit Token</span>
                <button className="flex items-center gap-2 px-2 py-1 rounded border border-zinc-600 bg-zinc-800/50 hover:bg-zinc-700/50 hover:border-zinc-500 transition-colors">
                  <span className="relative w-4 h-4">
                    <Image
                      src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/solana-sol-icon.png"
                      alt="SOL"
                      fill
                      className="object-contain"
                      sizes="16px"
                    />
                  </span>
                  <span className="text-xs text-white">SOL</span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase tracking-wide">Current Balance</span>
                <span className="text-xs text-white">0.0000 SOL</span>
              </div>
            </div>

            {/* Deposit Address Section */}
            <div className="border border-zinc-700/50 rounded p-3 space-y-3">
              <span className="text-xs text-zinc-400 uppercase tracking-wide">Deposit Address</span>
              
              {/* QR Code */}
              <div className="flex justify-center mt-4">
                <div className="w-32 h-32 bg-white rounded flex items-center justify-center">
                  <div className="text-black text-xs">QR Code</div>
                </div>
              </div>
              
              {/* Address Box */}
              <div className="bg-zinc-700/50 rounded p-3 text-center">
                <div className="text-xs text-white font-mono break-all">
                  4KtmTauUtwzTwy2U6v966xMNz961XP9iqk8WfFtpnKBe
                </div>
                <div className="flex justify-center mt-2">
                  <button
                    onClick={handleCopyAddress}
                    className={`flex items-center justify-center gap-1 text-xs transition-colors ${
                      isCopied 
                        ? 'text-green-500' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    {isCopied ? 'Copied!' : 'Click to copy'}
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-zinc-400 text-center">
                Scan QR code or copy address to deposit SOL
              </div>
            </div>

            {/* Warning Section */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 border border-zinc-700/50 rounded p-3">
                <Info size={14} className="text-white mt-0.5 flex-shrink-0" />
                <span className="text-xs text-white">Only send SOL to this address.</span>
              </div>
              
              <div className="flex items-start gap-2 border border-zinc-700/50 rounded p-3">
                <ArrowDown size={14} className="text-white mt-0.5 flex-shrink-0" />
                <span className="text-xs text-white">
                  This address can only receive SOL on the Solana network. Don&apos;t send SOL on any other network or it may be lost.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
