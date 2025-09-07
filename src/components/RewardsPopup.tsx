'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Gift, Trophy, Star, TrendingUp, Users, Target, Zap, Coins } from 'lucide-react';

interface RewardsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function RewardsPopup({ isOpen, onClose, triggerRef }: RewardsPopupProps) {
  console.log('RewardsPopup render - isOpen:', isOpen);
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
          className="w-[600px] border border-zinc-800 rounded shadow-2xl pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100"
          style={{ backgroundColor: '#0E0E0E' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Referral Program</h2>
            <button
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Referral Program Content */}
          <div className="p-6">
            <div className="flex items-center justify-between h-64">
              {/* Left Side - Text Content */}
              <div className="flex flex-col justify-center space-y-2 w-1/2 pr-4">
                <h3 className="text-white text-lg font-medium">Invite Friends and Earn</h3>
                <p className="text-white text-sm">Commissions Get up to</p>
                <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                  $2000
                </div>
                <p className="text-white text-sm">Commission</p>
              </div>

              {/* Right Side - Chart */}
              <div className="w-1/2 pl-4">
                <div className="relative h-48 w-full">
                  {/* Chart Area */}
                  <svg className="w-full h-full" viewBox="0 0 200 120">
                    {/* Area fill under the line */}
                    <defs>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.05"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Area fill */}
                    <path
                      d="M 20 100 Q 50 80 80 60 Q 110 40 140 30 Q 170 20 180 15"
                      fill="url(#areaGradient)"
                    />
                    
                    {/* Line */}
                    <path
                      d="M 20 100 Q 50 80 80 60 Q 110 40 140 30 Q 170 20 180 15"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2"
                    />
                    
                    {/* Data points */}
                    <circle cx="20" cy="100" r="2" fill="white"/>
                    <circle cx="50" cy="80" r="2" fill="white"/>
                    <circle cx="80" cy="60" r="2" fill="white"/>
                    <circle cx="110" cy="40" r="2" fill="white"/>
                    <circle cx="140" cy="30" r="2" fill="white"/>
                    
                    {/* Volume labels */}
                    <text x="50" y="115" fontSize="8" fill="#9CA3AF" textAnchor="middle">Vol.50k</text>
                    <text x="80" y="115" fontSize="8" fill="#9CA3AF" textAnchor="middle">Vol.250k</text>
                    <text x="110" y="115" fontSize="8" fill="#9CA3AF" textAnchor="middle">Vol.500k</text>
                    <text x="140" y="115" fontSize="8" fill="#9CA3AF" textAnchor="middle">Vol.1000k</text>
                    
                    {/* Annotation line and text for Vol.500k */}
                    <line x1="110" y1="40" x2="110" y2="25" stroke="white" strokeWidth="1" strokeDasharray="2,2"/>
                    <rect x="95" y="15" width="30" height="20" fill="rgba(0,0,0,0.8)" rx="2"/>
                    <text x="110" y="22" fontSize="6" fill="white" textAnchor="middle">Earn commission</text>
                    <text x="110" y="30" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">$2000/month</text>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
