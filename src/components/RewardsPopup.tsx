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
  const [selectedPoint, setSelectedPoint] = useState(2); // Default to middle point
  const popupRef = useRef<HTMLDivElement>(null);

  const rewardPoints = [
    { volume: "50k", reward: "$100", x: 30, y: 150 },
    { volume: "250k", reward: "$500", x: 80, y: 120 },
    { volume: "500k", reward: "$1000", x: 130, y: 90 },
    { volume: "1000k", reward: "$2000", x: 180, y: 60 }
  ];

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
          className="w-auto border border-zinc-800 rounded shadow-2xl pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100"
          style={{ backgroundColor: '#0E0E0E' }}
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-zinc-100" style={{fontSize: '14px', fontWeight: 500}}>Rewards</h2>
            <button
              onClick={onClose}
              className="grid place-items-center w-8 h-8 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Rewards Content */}
          <div className="p-4">
            <div className="flex items-center gap-6">
              {/* Text Content */}
              <div className="space-y-2">
                <h3 className="text-white text-lg font-medium">Invite Friends and Earn</h3>
                <p className="text-white text-sm">Commissions Get up to</p>
                <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                  {rewardPoints[selectedPoint].reward}
                </div>
                <p className="text-white text-sm">Commission</p>
              </div>

              {/* Chart */}
              <div className="w-80">
                <div className="relative h-64 w-full">
                  {/* Chart Area */}
                  <svg className="w-full h-full" viewBox="0 0 300 200">
                    {/* Area fill under the line */}
                    <defs>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.05"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Area fill */}
                    <path
                      d="M 30 150 Q 80 120 130 90 Q 180 60 220 40"
                      fill="url(#areaGradient)"
                    />
                    
                    {/* Line */}
                    <path
                      d="M 30 150 Q 80 120 130 90 Q 180 60 220 40"
                      fill="none"
                      stroke="#10B981"
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
                          fill={selectedPoint === index ? "#10B981" : "white"}
                          stroke={selectedPoint === index ? "white" : "#10B981"}
                          strokeWidth="3"
                          className="pointer-events-none"
                        />
                        
                        {/* Volume labels */}
                        <text 
                          x={point.x} 
                          y="185" 
                          fontSize="10" 
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
