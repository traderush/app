'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { X, Copy, Share, Search, Calendar, ExternalLink, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { useUIStore } from '@/shared/state';
import RealizedPnlChart from '@/app/portfolio/components/RealizedPnlChart';
import { PROFILE_AVATAR } from '@/shared/ui/constants/navigation';

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
  const signatureColor = useUIStore((state) => state.signatureColor);
  const tradingPositiveColor = useUIStore((state) => state.tradingPositiveColor);
  const tradingNegativeColor = useUIStore((state) => state.tradingNegativeColor);
  const [selectedTimeframe, setSelectedTimeframe] = useState('Max');
  const [activeTab, setActiveTab] = useState('Activity');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const popupRef = useRef<HTMLDivElement>(null);

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
    volume: '$2.4M',
    availableBalance: '$12,450.33',
    mostPlayedGame: 'Box Hit',
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
    multipliers: {
      '>5x': 0,
      '2x~5x': 0,
      '1x~2x': 13,
      '0x': 36
    },
    recentActivity: [
      { result: 'Win', gameName: 'Box Hit', tradeAmount: '$10', targetPrice: '+15%', age: '20s' },
      { result: 'Loss', gameName: 'Box Hit', tradeAmount: '$50', targetPrice: '-8%', age: '56s' },
      { result: 'Win', gameName: 'Box Hit', tradeAmount: '$100', targetPrice: '+22%', age: '1m' },
      { result: 'Loss', gameName: 'Box Hit', tradeAmount: '$250', targetPrice: '-12%', age: '2m' },
      { result: 'Win', gameName: 'Box Hit', tradeAmount: '$10', targetPrice: '+18%', age: '3m' },
      { result: 'Win', gameName: 'Sketch', tradeAmount: '$500', targetPrice: '+35%', age: '5m' },
      { result: 'Loss', gameName: 'Box Hit', tradeAmount: '$100', targetPrice: '-5%', age: '7m' },
      { result: 'Win', gameName: 'Box Hit', tradeAmount: '$50', targetPrice: '+28%', age: '10m' },
      { result: 'Win', gameName: 'Sketch', tradeAmount: '$200', targetPrice: '+42%', age: '12m' },
      { result: 'Loss', gameName: 'Box Hit', tradeAmount: '$25', targetPrice: '-15%', age: '15m' },
      { result: 'Win', gameName: 'Box Hit', tradeAmount: '$75', targetPrice: '+19%', age: '18m' },
      { result: 'Loss', gameName: 'Sketch', tradeAmount: '$150', targetPrice: '-10%', age: '20m' },
      { result: 'Win', gameName: 'Box Hit', tradeAmount: '$300', targetPrice: '+31%', age: '25m' },
      { result: 'Win', gameName: 'Box Hit', tradeAmount: '$125', targetPrice: '+24%', age: '30m' },
      { result: 'Loss', gameName: 'Box Hit', tradeAmount: '$80', targetPrice: '-7%', age: '35m' }
    ]
  };

  const timeframes = ['1d', '7d', '30d', 'Max'];
  const tabs = ['Activity'];

  const handleCopyAddress = async () => {
    if (player?.address) {
      try {
        await navigator.clipboard.writeText(player.address);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  // Format address to show first 6 and last 4 characters
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Sort and filter activity data
  const sortedActivity = useMemo(() => {
    let filtered = mockData.recentActivity;
    
    // Filter by selected game
    if (selectedGame) {
      filtered = filtered.filter(activity => activity.gameName === selectedGame);
    }
    
    if (!sortBy) return filtered;
    
    return [...filtered].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      
      switch (sortBy) {
        case 'result':
          aVal = a.result;
          bVal = b.result;
          break;
        case 'gameName':
          aVal = a.gameName;
          bVal = b.gameName;
          break;
        case 'tradeAmount':
          aVal = parseFloat(a.tradeAmount.replace('$', ''));
          bVal = parseFloat(b.tradeAmount.replace('$', ''));
          break;
        case 'targetPrice':
          aVal = parseFloat(a.targetPrice.replace(/[+%]/g, ''));
          bVal = parseFloat(b.targetPrice.replace(/[+%]/g, ''));
          break;
        case 'age':
          // Convert age to seconds for comparison
          const ageToSeconds = (age: string) => {
            if (age.endsWith('s')) return parseFloat(age);
            if (age.endsWith('m')) return parseFloat(age) * 60;
            if (age.endsWith('h')) return parseFloat(age) * 3600;
            if (age.endsWith('d')) return parseFloat(age) * 86400;
            return 0;
          };
          aVal = ageToSeconds(a.age);
          bVal = ageToSeconds(b.age);
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, [sortBy, sortOrder, selectedGame]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/70">
            <div className="flex items-center gap-2">
              <span className="text-zinc-300 text-xs font-mono">{formatAddress(player.address)}</span>
              <button
                onClick={handleCopyAddress}
                className="relative text-zinc-400 hover:text-white transition-colors"
                title="Copy address"
              >
                <Copy size={12} />
                {copySuccess && (
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-zinc-300 bg-zinc-900 px-2 py-1 rounded border border-zinc-700">
                    Copied!
                  </span>
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="text-zinc-400 hover:text-white transition-colors">
                <Share size={14} />
              </button>
              <button className="text-zinc-400 hover:text-white transition-colors">
                <Search size={14} />
              </button>
              <button className="text-zinc-400 hover:text-white transition-colors">
                <Calendar size={14} />
              </button>
              
              {/* Timeframe Selector */}
              <div className="flex gap-0.5">
                {timeframes.map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => setSelectedTimeframe(timeframe)}
                    className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
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
                className="grid place-items-center w-5 h-5 rounded hover:bg-white/5 transition-colors"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div>
            <div className="p-4 pb-0">
              <div className="grid grid-cols-12 gap-6">
                {/* Performance Section */}
                <div className="col-span-3 border-r border-zinc-800/50 pr-6">
                <h3 className="text-white text-sm font-medium mb-4">User Info</h3>
                <div className="flex items-start gap-4 mb-6">
                  <Image
                    src={PROFILE_AVATAR}
                    alt="Profile"
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-md object-cover flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-3">
                      <div className="text-white text-sm font-medium">{player?.name || 'User'}</div>
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${signatureColor}20`,
                          color: signatureColor
                        }}
                      >
                        #1,247
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-zinc-400">PNL:</span>
                      <div className="font-medium" style={{ color: tradingPositiveColor, fontSize: '14px', fontWeight: 500 }}>
                        {mockData.pnl}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {/* First Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border-r border-zinc-800/50 pr-4">
                      <div className="text-zinc-400 text-xs mb-0.5">Balance</div>
                      <div className="text-white text-sm font-medium">{mockData.availableBalance}</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 text-xs mb-0.5">Volume</div>
                      <div className="text-white text-sm font-medium">{mockData.volume}</div>
                    </div>
                  </div>
                  
                  {/* Second Row */}
                  <div className="mt-4">
                    <div className="text-zinc-400 text-xs mb-0.5">Winrate</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-white text-sm font-medium">{mockData.winrate}</div>
                      <div className="text-xs">
                        <span style={{ color: tradingPositiveColor }}>{mockData.wins}W</span>
                        <span className="text-zinc-500"> / </span>
                        <span style={{ color: tradingNegativeColor }}>{mockData.losses}L</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PNL Chart Section */}
              <div className="col-span-6 border-r border-zinc-800/50 pr-6">
                <h3 className="text-white text-sm font-medium mb-4">PNL</h3>
                <div className="h-48 relative">
                  <RealizedPnlChart />
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
                  <div className="mt-4 pt-3 border-t border-zinc-800/50 flex flex-wrap gap-2">
                    <span
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white"
                      style={{
                        background: 'linear-gradient(135deg, rgba(250, 86, 22, 0.2) 0%, rgba(250, 86, 22, 0.1) 100%)',
                        border: '1px solid rgba(250, 86, 22, 0.3)'
                      }}
                    >
                      Early supporter
                    </span>
                    <span
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-white"
                      style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      Verified
                    </span>
                  </div>
                </div>
                </div>
              </div>
            </div>

            {/* Horizontal Separator */}
            <div className="border-t border-zinc-800/50 mt-6 mb-0" />

            {/* Activity Section */}
            <div>
              <div className="flex flex-col">
                <div className="flex items-center justify-between py-3 px-4 border-b border-zinc-800/50 mt-0">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedGame(null)}
                      className={`text-sm font-medium transition-colors ${
                        selectedGame === null
                          ? 'text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      Activity
                    </button>
                    <button
                      onClick={() => setSelectedGame('Box Hit')}
                      className={`text-sm font-medium transition-colors ${
                        selectedGame === 'Box Hit'
                          ? 'text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      Box Hit
                    </button>
                    <button
                      onClick={() => setSelectedGame('Sketch')}
                      className={`text-sm font-medium transition-colors ${
                        selectedGame === 'Sketch'
                          ? 'text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      Sketch
                    </button>
                  </div>
                </div>
                <div 
                  className="max-h-96 overflow-y-auto [&::-webkit-scrollbar-thumb]:bg-zinc-800/50 [&::-webkit-scrollbar-thumb]:hover:bg-zinc-800/50 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(39, 39, 42, 0.5) transparent'
                  }}
                >
                  <table className="w-full text-sm">
                    <thead 
                      className="sticky top-0 z-10" 
                      style={{ 
                        backgroundColor: '#0E0E0E',
                        boxShadow: '0 1px 0 0 rgba(39, 39, 42, 0.5)'
                      }}
                    >
                      <tr>
                        <th 
                          className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                          onClick={() => handleSort('result')}
                        >
                          <div className="flex items-center gap-1">
                            Result
                            {sortBy === 'result' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ChevronsUpDown className="w-3 h-3 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                          onClick={() => handleSort('gameName')}
                        >
                          <div className="flex items-center gap-1">
                            Game Name
                            {sortBy === 'gameName' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ChevronsUpDown className="w-3 h-3 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                          onClick={() => handleSort('tradeAmount')}
                        >
                          <div className="flex items-center gap-1">
                            Trade Amount
                            {sortBy === 'tradeAmount' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ChevronsUpDown className="w-3 h-3 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                          onClick={() => handleSort('targetPrice')}
                        >
                          <div className="flex items-center gap-1">
                            Target Price
                            {sortBy === 'targetPrice' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ChevronsUpDown className="w-3 h-3 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-2 text-left text-xs font-normal text-zinc-400 cursor-pointer hover:text-zinc-300 transition-colors"
                          onClick={() => handleSort('age')}
                        >
                          <div className="flex items-center gap-1">
                            Age
                            {sortBy === 'age' ? (
                              sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ChevronsUpDown className="w-3 h-3 opacity-50" />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-normal text-zinc-400">
                          Explorer
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-normal text-zinc-200">
                      {sortedActivity.length > 0 ? (
                        sortedActivity.map((activity, index) => (
                          <tr
                            key={index}
                            className={`border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors ${
                              index % 2 === 0 && 'bg-zinc-950/30'
                            }`}
                          >
                            <td className="px-4 py-3">
                              <span 
                                className="text-xs font-medium"
                                style={{
                                  color: activity.result === 'Win' ? tradingPositiveColor : tradingNegativeColor
                                }}
                              >
                                {activity.result}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-100">{activity.gameName}</td>
                            <td className="px-4 py-3">{activity.tradeAmount}</td>
                            <td className="px-4 py-3 text-zinc-300">{activity.targetPrice}</td>
                            <td className="px-4 py-3 text-zinc-400">{activity.age}</td>
                            <td className="px-4 py-3">
                              <button className="text-zinc-400 hover:text-white transition-colors">
                                <ExternalLink size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                            No activity available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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
