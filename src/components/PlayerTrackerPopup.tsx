'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Copy, Star, Share, Search, Calendar, ExternalLink } from 'lucide-react';
import { useSignatureColor } from '@/contexts/SignatureColorContext';

interface PlayerTrackerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    id: string;
    name: string;
    address: string;
    avatar: string;
    game: string;
    isOnline: boolean;
  } | null;
}

const PlayerTrackerPopup: React.FC<PlayerTrackerPopupProps> = ({
  isOpen,
  onClose,
  player
}) => {
  const { signatureColor } = useSignatureColor();
  const [selectedTimeframe, setSelectedTimeframe] = useState('Max');
  const [activeTab, setActiveTab] = useState('Activity');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; pnl: string; date: string } | null>(null);
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
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Mock data for the player
  const mockData = {
    pnl: '+$268K',
    winrate: '65%',
    wins: 812,
    losses: 1477,
    profileCreationDate: 'Jan 15, 2024',
    totalTransactions: 19479,
    buyTransactions: 9585,
    sellTransactions: 9894,
    performance: {
      '>500%': 40,
      '200% ~ 500%': 0,
      '0% ~ 200%': 249,
      '0% ~ -50%': 109,
      '<-50%': 19
    },
    recentActivity: [
      { result: 'Win', gameName: 'Box Hit', betAmount: '2.5 SOL', targetPrice: '+15%', age: '20s' },
      { result: 'Loss', gameName: 'Towers', betAmount: '1.2 ETH', targetPrice: '-8%', age: '56s' },
      { result: 'Win', gameName: 'Sketch', betAmount: '0.05 BTC', targetPrice: '+22%', age: '1m' },
      { result: 'Loss', gameName: 'Box Hit', betAmount: '15 AVAX', targetPrice: '-12%', age: '2m' },
      { result: 'Win', gameName: 'Towers', betAmount: '500 MATIC', targetPrice: '+18%', age: '3m' }
    ]
  };

  // Chart data points for hover functionality
  const chartData = [
    { x: 0, y: 100, pnl: '+$2.1K', date: 'Mon, Sep 1, 2025, 9:00 AM' },
    { x: 50, y: 95, pnl: '+$3.2K', date: 'Mon, Sep 1, 2025, 10:30 AM' },
    { x: 100, y: 85, pnl: '+$4.1K', date: 'Mon, Sep 1, 2025, 12:00 PM' },
    { x: 150, y: 75, pnl: '+$5.3K', date: 'Mon, Sep 1, 2025, 1:30 PM' },
    { x: 200, y: 65, pnl: '+$6.2K', date: 'Mon, Sep 1, 2025, 3:00 PM' },
    { x: 250, y: 55, pnl: '+$7.1K', date: 'Mon, Sep 1, 2025, 4:30 PM' },
    { x: 300, y: 45, pnl: '+$7.6K', date: 'Mon, Sep 1, 2025, 6:00 PM' },
    { x: 350, y: 35, pnl: '+$8.2K', date: 'Mon, Sep 1, 2025, 7:30 PM' },
    { x: 400, y: 25, pnl: '+$9.1K', date: 'Mon, Sep 1, 2025, 9:00 PM' }
  ];

  const timeframes = ['1d', '7d', '30d', 'Max'];
  const tabs = ['Activity'];

  const handleCopyAddress = () => {
    if (player?.address) {
      navigator.clipboard.writeText(player.address);
    }
  };

  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartWidth = rect.width;
    const relativeX = (x / chartWidth) * 400; // Convert to chart coordinates
    
    // Find the closest data point
    const closestPoint = chartData.reduce((prev, curr) => 
      Math.abs(curr.x - relativeX) < Math.abs(prev.x - relativeX) ? curr : prev
    );
    
    setHoveredPoint({
      x: x,
      y: (closestPoint.y / 120) * rect.height, // Convert to pixel coordinates
      pnl: closestPoint.pnl,
      date: closestPoint.date
    });
  };

  const handleChartMouseLeave = () => {
    setHoveredPoint(null);
  };

  if (!isOpen || !player) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[1000] transition-all duration-300 ease-out opacity-60"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[1001] flex items-center justify-center pointer-events-none p-4">
        <div 
          ref={popupRef}
          className="w-full max-w-6xl border border-zinc-800/70 rounded-lg shadow-2xl pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100 overflow-hidden"
          style={{ backgroundColor: '#0E0E0E' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/70">
            <div className="flex items-center gap-3">
              <h2 className="text-white text-sm font-medium">Rename to track</h2>
              <div className="flex items-center gap-2">
                <span className="text-zinc-300 text-xs font-mono">{player.address}</span>
                <button
                  onClick={handleCopyAddress}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="text-zinc-400 hover:text-white transition-colors">
                <Star size={16} />
              </button>
              <button className="text-zinc-400 hover:text-white transition-colors">
                <Share size={16} />
              </button>
              <button className="text-zinc-400 hover:text-white transition-colors">
                <Search size={16} />
              </button>
              <button className="text-zinc-400 hover:text-white transition-colors">
                <Calendar size={16} />
              </button>
              
              {/* Timeframe Selector */}
              <div className="flex gap-1">
                {timeframes.map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => setSelectedTimeframe(timeframe)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedTimeframe === timeframe
                        ? 'text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    style={{
                      backgroundColor: selectedTimeframe === timeframe ? signatureColor : 'transparent'
                    }}
                  >
                    {timeframe}
                  </button>
                ))}
              </div>
              
              <button
                onClick={onClose}
                className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-4">
            <div className="grid grid-cols-12 gap-6">
              {/* Performance Section */}
              <div className="col-span-3">
                <h3 className="text-white text-sm font-medium mb-4">Performance</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-zinc-400 text-xs mb-1">PNL</div>
                    <div className="text-green-400 text-lg font-medium">{mockData.pnl}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-xs mb-1">Winrate</div>
                    <div className="text-white text-sm font-medium">{mockData.winrate}</div>
                    <div className="text-xs">
                      <span className="text-green-500">{mockData.wins}W</span>
                      <span className="text-zinc-500"> / </span>
                      <span className="text-red-500">{mockData.losses}L</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PNL Chart Section */}
              <div className="col-span-6">
                <h3 className="text-white text-sm font-medium mb-4">PNL</h3>
                <div className="h-32 bg-zinc-900/50 rounded-lg relative overflow-hidden">
                  {/* Demo Chart */}
                  <svg 
                    className="w-full h-full cursor-crosshair" 
                    viewBox="0 0 400 120" 
                    preserveAspectRatio="none"
                    onMouseMove={handleChartMouseMove}
                    onMouseLeave={handleChartMouseLeave}
                  >
                    {/* Chart background */}
                    <rect width="400" height="120" fill="transparent" />
                    
                    {/* Chart line and fill */}
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2fe3ac" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#2fe3ac" stopOpacity="0.05"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Filled area under the line */}
                    <path
                      d="M 0,100 
                         C 20,95 40,85 60,80
                         C 80,75 100,70 120,65
                         C 140,60 160,55 180,50
                         C 200,45 220,40 240,35
                         C 260,30 280,25 300,20
                         C 320,15 340,10 360,5
                         C 380,0 400,0 400,0
                         L 400,120 L 0,120 Z"
                      fill="url(#chartGradient)"
                    />
                    
                    {/* Main chart line */}
                    <path
                      d="M 0,100 
                         C 20,95 40,85 60,80
                         C 80,75 100,70 120,65
                         C 140,60 160,55 180,50
                         C 200,45 220,40 240,35
                         C 260,30 280,25 300,20
                         C 320,15 340,10 360,5
                         C 380,0 400,0 400,0"
                      fill="none"
                      stroke="#2fe3ac"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Hover line */}
                    {hoveredPoint && (
                      <line
                        x1={hoveredPoint.x}
                        y1="0"
                        x2={hoveredPoint.x}
                        y2="120"
                        stroke="white"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                        opacity="0.8"
                      />
                    )}
                  </svg>
                  
                  {/* Tooltip */}
                  {hoveredPoint && (
                    <div 
                      className="absolute bg-zinc-800 border border-zinc-700 rounded px-3 py-2 pointer-events-none z-10"
                      style={{
                        left: Math.min(hoveredPoint.x + 10, 280), // Prevent tooltip from going off screen
                        top: Math.max(hoveredPoint.y - 30, 10), // Keep tooltip above the line
                      }}
                    >
                      <div className="text-white text-sm font-medium">{hoveredPoint.pnl}</div>
                      <div className="text-zinc-400 text-xs">{hoveredPoint.date}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* History Section */}
              <div className="col-span-3">
                <h3 className="text-white text-sm font-medium mb-4">History</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-zinc-400 text-xs mb-1">Profile Creation Date</div>
                    <div className="text-white text-sm font-medium">{mockData.profileCreationDate}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400 text-xs mb-1">Total Trades</div>
                    <div className="text-white text-sm font-medium">{mockData.totalTransactions}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Section */}
            <div className="mt-6">
              {/* Tabs */}
              <div className="flex gap-6 border-b border-zinc-800/70">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 text-sm transition-colors ${
                      activeTab === tab
                        ? 'text-white border-b-2 border-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Activity Table */}
              <div className="mt-4">
                <div className="grid grid-cols-12 gap-4 pb-3 border-b border-zinc-800/70 text-zinc-400 text-xs font-medium">
                  <div className="col-span-2">Result</div>
                  <div className="col-span-3">Game Name</div>
                  <div className="col-span-2">Bet Amount</div>
                  <div className="col-span-2">Target Price</div>
                  <div className="col-span-2">Age</div>
                  <div className="col-span-1">Explorer</div>
                </div>

                <div className="space-y-2 mt-3">
                  {mockData.recentActivity.map((activity, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-center py-2 hover:bg-zinc-900/30 rounded px-1 transition-colors">
                      <div className="col-span-2">
                        <span className={`text-xs font-medium ${
                          activity.result === 'Win' ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {activity.result}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-white text-xs font-medium">{activity.gameName}</span>
                      </div>
                      <div className="col-span-2 text-white text-xs">{activity.betAmount}</div>
                      <div className="col-span-2 text-zinc-300 text-xs">{activity.targetPrice}</div>
                      <div className="col-span-2 text-zinc-400 text-xs">{activity.age}</div>
                      <div className="col-span-1">
                        <button className="text-zinc-400 hover:text-white transition-colors">
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlayerTrackerPopup;