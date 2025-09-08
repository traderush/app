'use client';
import { useState, useRef, useEffect } from 'react';
import { X, Gift, Trophy, Star, TrendingUp, Users, Target, Zap, Coins } from 'lucide-react';
import { useSignatureColor } from '@/contexts/SignatureColorContext';

interface RewardsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

export default function RewardsPopup({ isOpen, onClose, triggerRef }: RewardsPopupProps) {
  console.log('RewardsPopup render - isOpen:', isOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(2); // Default to middle point
  const [referralCode] = useState(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  });
  const popupRef = useRef<HTMLDivElement>(null);
  const { signatureColor } = useSignatureColor();

  const rewardPoints = [
    { volume: "50k", reward: "$100", x: 20, y: 90 },
    { volume: "250k", reward: "$500", x: 50, y: 80 },
    { volume: "500k", reward: "$1000", x: 80, y: 65 },
    { volume: "1000k", reward: "$2000", x: 110, y: 40 }
  ];

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

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
          className="w-auto border border-zinc-800 rounded shadow-2xl pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100 p-4"
          style={{ backgroundColor: '#0E0E0E' }}
        >
          {/* Header */}
          <div className="py-2 border-b border-zinc-800 flex items-center justify-between -mt-4">
            <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Rewards</h2>
            <button
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Rewards Content */}
          <div>
            <div className="flex items-center gap-8">
            {/* Text Content */}
            <div className="space-y-1">
              <h3 className="text-white" style={{fontSize: '18px'}}>Invite Friends and Earn</h3>
              <p className="text-white" style={{fontSize: '18px'}}>Commissions Get up to</p>
              <div className="flex items-baseline gap-2">
                <span style={{fontSize: '28px', fontWeight: 500, color: signatureColor}}>
                  {rewardPoints[selectedPoint].reward}
                </span>
                <span className="text-white" style={{fontSize: '18px'}}>Commission</span>
              </div>
                
                {/* Referral Code */}
                <div className="mt-3">
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded">
                    <span className="text-zinc-400 text-lg font-mono">{referralCode}</span>
                    <button 
                      className="p-1 hover:bg-zinc-700 rounded transition-colors"
                      onClick={handleCopyReferral}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 hover:text-white">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="w-48 h-32 flex items-center justify-center">
                <div className="relative w-full h-full">
                  {/* Chart Area */}
                  <svg className="w-full h-full" viewBox="0 0 120 110">
                    {/* Area fill under the line */}
                    <defs>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={signatureColor} stopOpacity="0.3"/>
                        <stop offset="100%" stopColor={signatureColor} stopOpacity="0.05"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Area fill */}
                    <path
                      d="M 20 90 L 50 80 L 80 65 L 110 40 L 110 40 L 110 90 L 20 90 Z"
                      fill="url(#areaGradient)"
                    />
                    
                    {/* Line */}
                    <path
                      d="M 20 90 L 50 80 L 80 65 L 110 40"
                      fill="none"
                      stroke={signatureColor}
                      strokeWidth="3"
                    />
                    
                    {/* Clickable Data points */}
                    {rewardPoints.map((point, index) => (
                      <g key={index}>
                        {/* Invisible larger click area */}
                        <circle 
                          cx={point.x} 
                          cy={point.y} 
                          r="12" 
                          fill="transparent"
                          className="cursor-pointer"
                          onClick={() => setSelectedPoint(index)}
                        />
                        {/* Visible circle */}
                        <circle 
                          cx={point.x} 
                          cy={point.y} 
                          r="6" 
                          fill={selectedPoint === index ? signatureColor : "white"}
                          stroke={selectedPoint === index ? "white" : signatureColor}
                          strokeWidth="3"
                          className="pointer-events-none"
                        />
                        
                        {/* Volume labels */}
                      <text
                        x={point.x}
                        y="105"
                        fontSize="6"
                        fill="#9CA3AF"
                        textAnchor="middle"
                      >
                        Vol.{point.volume}
                      </text>
                      </g>
                    ))}
                    
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
