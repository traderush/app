'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Pencil, RotateCcw } from 'lucide-react';
import { useTradingStore, useAppStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';

interface PnLTrackerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  isCustomizeOpen: boolean;
  onCustomizeOpen: () => void;
  onCustomizeClose: () => void;
  customization: {
    backgroundImage?: string;
    backgroundOpacity?: number;
    backgroundBlur?: number;
    generalTextColor?: string;
    balanceTextColor?: string;
    pnlTextColor?: string;
  };
}

const PnLTrackerPopup: React.FC<PnLTrackerPopupProps> = ({
  isOpen,
  onClose,
  triggerRef,
  isCustomizeOpen,
  onCustomizeOpen,
  onCustomizeClose,
  customization
}) => {
  // Get live data from stores - optimized for frequent updates
  const { balance, balanceHistory } = useAppStore(
    useShallow((state) => ({
      balance: state.balance,
      balanceHistory: state.balanceHistory,
    }))
  );
  const { stats, tradeHistory } = useTradingStore(
    useShallow((state) => ({
      stats: state.gameStats,
      tradeHistory: state.tradeHistory,
    }))
  );
  const resetStats = useTradingStore((state) => state.resetStats);
  
  // Calculate live PnL data
  const [pnlData, setPnlData] = useState({
    balance: balance,
    totalPnL: stats.netProfit,
    todayPnL: 0, // Will calculate from today's trades
    winRate: stats.winRate,
    totalTrades: stats.totalBets,
    winningTrades: stats.totalWins,
    losingTrades: stats.totalLosses,
    bestWin: 0,
    worstLoss: 0,
    currentStreak: stats.currentStreak,
    longestWinStreak: stats.bestStreak,
    longestLossStreak: 0
  });

  // Calculate recent trades from tradeHistory
  const [recentTrades, setRecentTrades] = useState<Array<{
    id: string;
    timestamp: Date;
    multiplier: number;
    pnl: number;
    type: 'win' | 'loss';
  }>>([]);

  // Draggable and resizable state
  const [position, setPosition] = useState({ x: 50, y: 100 });
  const [size, setSize] = useState({ width: 320, height: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Update PnL data from live userStore data
  useEffect(() => {
    if (!isOpen) return;

    console.log('📊 PnL Tracker updating with data:', {
      balance,
      stats: {
        netProfit: stats.netProfit,
        totalBets: stats.totalBets,
        totalWins: stats.totalWins,
        totalLosses: stats.totalLosses,
        winRate: stats.winRate
      },
      tradeHistoryLength: tradeHistory.length,
      balanceHistoryLength: balanceHistory.length
    });

    // Calculate today's PnL from today's trades (more accurate calculation)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTrades = tradeHistory.filter(trade => 
      trade.settledAt && new Date(trade.settledAt) >= today
    );
    const todayPnL = todayTrades.reduce((sum, trade) => {
      if (trade.result === 'win' && trade.payout) {
        const profit = trade.payout - trade.amount;
        return sum + profit;
      }
      if (trade.result === 'loss') {
        return sum - trade.amount;
      }
      return sum;
    }, 0);

    console.log('📊 Today PnL calculation:', {
      todayTradesCount: todayTrades.length,
      todayTrades: todayTrades.map(t => ({ 
        id: t.id, 
        result: t.result, 
        amount: t.amount, 
        payout: t.payout,
        profit: t.result === 'win' ? (t.payout || 0) - t.amount : -t.amount
      })),
      todayPnL,
      calculationBreakdown: todayTrades.map(t => {
        if (t.result === 'win' && t.payout) return `${t.payout} - ${t.amount} = ${t.payout - t.amount}`;
        if (t.result === 'loss') return `-${t.amount}`;
        return '0 (pending)';
      })
    });

    // Calculate best win and worst loss
    const wins = tradeHistory.filter(trade => trade.result === 'win' && trade.payout);
    const losses = tradeHistory.filter(trade => trade.result === 'loss');
    const bestWin = wins.length > 0 ? Math.max(...wins.map(trade => trade.payout! - trade.amount)) : 0;
    const worstLoss = losses.length > 0 ? Math.min(...losses.map(trade => -trade.amount)) : 0;

    // Calculate longest loss streak
    let longestLossStreak = 0;
    let currentLossStreak = 0;
    const sortedTrades = [...tradeHistory].sort((a, b) => 
      new Date(b.settledAt || 0).getTime() - new Date(a.settledAt || 0).getTime()
    );
    
    for (const trade of sortedTrades) {
      if (trade.result === 'loss') {
        currentLossStreak++;
        longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
      } else {
        currentLossStreak = 0;
      }
    }

    // Calculate actual total PnL from all settled trades for accuracy
    const settledTrades = tradeHistory.filter(trade => trade.result && trade.settledAt);
    const actualTotalPnL = settledTrades.reduce((sum, trade) => {
      if (trade.result === 'win' && trade.payout) {
        return sum + (trade.payout - trade.amount);
      }
      if (trade.result === 'loss') {
        return sum - trade.amount;
      }
      return sum;
    }, 0);

    console.log('📊 Actual total PnL calculation:', {
      settledTradesCount: settledTrades.length,
      actualTotalPnL,
      statsNetProfit: stats.netProfit,
      difference: actualTotalPnL - stats.netProfit
    });

    setPnlData({
      balance: balance,
      totalPnL: actualTotalPnL, // Use calculated total PnL instead of stats
      todayPnL: todayPnL,
      winRate: stats.winRate,
      totalTrades: stats.totalBets,
      winningTrades: stats.totalWins,
      losingTrades: stats.totalLosses,
      bestWin: bestWin,
      worstLoss: worstLoss,
      currentStreak: stats.currentStreak,
      longestWinStreak: stats.bestStreak,
      longestLossStreak: longestLossStreak
    });

    // Update recent trades from tradeHistory
    const recentTradeData = tradeHistory.slice(0, 10).map(trade => ({
      id: trade.id,
      timestamp: trade.settledAt || trade.placedAt,
      multiplier: trade.payout && trade.result === 'win' ? trade.payout / trade.amount : 1,
      pnl: trade.result === 'win' && trade.payout ? trade.payout - trade.amount : 
           trade.result === 'loss' ? -trade.amount : 0,
      type: trade.result === 'win' ? 'win' as const : 'loss' as const
    }));
    
    setRecentTrades(recentTradeData);
  }, [isOpen, balance, balanceHistory, stats, tradeHistory]);

  // Handle dragging and resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't start dragging if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking near edges for resizing
    const edgeThreshold = 10; // pixels from edge
    const isNearLeft = x < edgeThreshold;
    const isNearRight = x > rect.width - edgeThreshold;
    const isNearTop = y < edgeThreshold;
    const isNearBottom = y > rect.height - edgeThreshold;
    
    // Determine resize handle based on position
    let handle = null;
    if (isNearTop && isNearLeft) handle = 'nw';
    else if (isNearTop && isNearRight) handle = 'ne';
    else if (isNearBottom && isNearLeft) handle = 'sw';
    else if (isNearBottom && isNearRight) handle = 'se';
    else if (isNearTop) handle = 'n';
    else if (isNearBottom) handle = 's';
    else if (isNearLeft) handle = 'w';
    else if (isNearRight) handle = 'e';
    
    if (handle) {
      console.log('Starting resize with handle:', handle);
      setIsResizing(true);
      setResizeHandle(handle);
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      return;
    }
    
    console.log('Starting drag');
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (isResizing && resizeHandle) {
      console.log('Resizing with handle:', resizeHandle);
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      let newWidth = size.width;
      let newHeight = size.height;
      let newX = position.x;
      let newY = position.y;
      
      // Minimum and maximum sizes
      const minWidth = 200;
      const minHeight = 60;
      const maxWidth = 600;
      const maxHeight = 200;
      
      switch (resizeHandle) {
        case 'se': // Southeast (bottom-right)
          newWidth = Math.min(maxWidth, Math.max(minWidth, size.width + deltaX));
          newHeight = Math.min(maxHeight, Math.max(minHeight, size.height + deltaY));
          break;
        case 'sw': // Southwest (bottom-left)
          newWidth = Math.min(maxWidth, Math.max(minWidth, size.width - deltaX));
          newHeight = Math.min(maxHeight, Math.max(minHeight, size.height + deltaY));
          newX = position.x + (size.width - newWidth);
          break;
        case 'ne': // Northeast (top-right)
          newWidth = Math.min(maxWidth, Math.max(minWidth, size.width + deltaX));
          newHeight = Math.min(maxHeight, Math.max(minHeight, size.height - deltaY));
          newY = position.y + (size.height - newHeight);
          break;
        case 'nw': // Northwest (top-left)
          newWidth = Math.min(maxWidth, Math.max(minWidth, size.width - deltaX));
          newHeight = Math.min(maxHeight, Math.max(minHeight, size.height - deltaY));
          newX = position.x + (size.width - newWidth);
          newY = position.y + (size.height - newHeight);
          break;
        case 'e': // East (right)
          newWidth = Math.min(maxWidth, Math.max(minWidth, size.width + deltaX));
          break;
        case 'w': // West (left)
          newWidth = Math.min(maxWidth, Math.max(minWidth, size.width - deltaX));
          newX = position.x + (size.width - newWidth);
          break;
        case 's': // South (bottom)
          newHeight = Math.min(maxHeight, Math.max(minHeight, size.height + deltaY));
          break;
        case 'n': // North (top)
          newHeight = Math.min(maxHeight, Math.max(minHeight, size.height - deltaY));
          newY = position.y + (size.height - newHeight);
          break;
      }
      
      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeHandle]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate adaptive font sizes based on card dimensions
  const getAdaptiveFontSizes = () => {
    const baseWidth = 320;
    const baseHeight = 80;
    const baseValueSize = 24; // Default 24px for values
    const baseLabelSize = 14; // Default 14px for labels
    
    // Scale based on both width and height, but prioritize width for text scaling
    const widthScale = Math.min(size.width / baseWidth, 2); // Max 2x scaling
    const heightScale = Math.min(size.height / baseHeight, 2.5); // Max 2.5x scaling
    
    // Use the smaller of the two scales to prevent text from becoming too large
    const cardScale = Math.min(widthScale, heightScale);
    
    // Make text scale 2x slower than card scaling
    const textScale = 1 + (cardScale - 1) * 0.5;
    
    return {
      valueSize: Math.max(24, Math.min(48, baseValueSize * textScale)), // Min 24px, Max 48px
      labelSize: Math.max(14, Math.min(20, baseLabelSize * textScale))  // Min 14px, Max 20px
    };
  };

  const fontSizes = getAdaptiveFontSizes();

  // Calculate adaptive padding based on card size
  const getAdaptivePadding = () => {
    const basePadding = 24; // 6 * 4 = 24px (px-6)
    const scale = Math.min(size.width / 320, size.height / 80);
    return Math.max(12, Math.min(48, basePadding * scale)); // Min 12px, Max 48px
  };

  const adaptivePadding = getAdaptivePadding();

  if (!isOpen) return null;

  return (
    <>
      {/* Minimalistic Draggable and Resizable PnL Card */}
      <div
        ref={cardRef}
        className="fixed z-50"
        style={{
          left: position.x,
          top: position.y,
          width: `${size.width}px`,
          height: `${size.height}px`,
          cursor: isDragging ? 'move' : isResizing ? 'grabbing' : 
                   hoveredHandle === 'nw' ? 'nw-resize' :
                   hoveredHandle === 'ne' ? 'ne-resize' :
                   hoveredHandle === 'sw' ? 'sw-resize' :
                   hoveredHandle === 'se' ? 'se-resize' :
                   hoveredHandle === 'n' ? 'n-resize' :
                   hoveredHandle === 's' ? 's-resize' :
                   hoveredHandle === 'w' ? 'w-resize' :
                   hoveredHandle === 'e' ? 'e-resize' : 'move'
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setHoveredHandle(null);
        }}
        onMouseMove={(e) => {
          if (!isHovered) return;
          
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const edgeThreshold = 10;
          const isNearLeft = x < edgeThreshold;
          const isNearRight = x > rect.width - edgeThreshold;
          const isNearTop = y < edgeThreshold;
          const isNearBottom = y > rect.height - edgeThreshold;
          
          let handle = null;
          if (isNearTop && isNearLeft) handle = 'nw';
          else if (isNearTop && isNearRight) handle = 'ne';
          else if (isNearBottom && isNearLeft) handle = 'sw';
          else if (isNearBottom && isNearRight) handle = 'se';
          else if (isNearTop) handle = 'n';
          else if (isNearBottom) handle = 's';
          else if (isNearLeft) handle = 'w';
          else if (isNearRight) handle = 'e';
          
          setHoveredHandle(handle);
        }}
      >
        {/* Background with McLaren image */}
        <div
          className="relative w-full h-full border border-zinc-700/50 overflow-hidden"
          style={{
            borderRadius: '4px',
            backgroundImage: `url(${customization?.backgroundImage || 'https://www.carscoops.com/wp-content/uploads/2023/05/McLaren-750S-main.gif'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Background overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${(100 - (customization?.backgroundOpacity || 100)) / 100})`,
              backdropFilter: `blur(${customization?.backgroundBlur || 0}px)`
            }}
          />
          
          {/* Content */}
            <div 
              className="relative z-10 h-full flex items-center justify-between"
              style={{ 
                paddingLeft: `${adaptivePadding}px`, 
                paddingRight: `${adaptivePadding}px`,
                paddingTop: `${adaptivePadding}px`,
                paddingBottom: `${adaptivePadding}px`
              }}
            >
            {/* Left Section - Balance */}
            <div className="flex-1 text-center">
              <div 
                className="mb-1"
                style={{ 
                  color: customization?.generalTextColor || '#ffffff',
                  fontWeight: 500,
                  fontSize: `${fontSizes.valueSize}px`,
                  lineHeight: 1
                }}
              >
                {formatCurrency(pnlData.balance)}
              </div>
              <div 
                className="opacity-70"
                style={{ 
                  color: customization?.generalTextColor || '#ffffff',
                  fontWeight: 400,
                  fontSize: `${fontSizes.labelSize}px`,
                  lineHeight: 1.5
                }}
              >
                Balance
              </div>
            </div>

            {/* Right Section - PnL */}
            <div className="flex-1 text-center">
              <div 
                className="mb-1"
                style={{ 
                  color: pnlData.totalPnL >= 0 ? (customization?.pnlTextColor || '#2fe3ac') : (customization?.balanceTextColor || '#ffffff'),
                  fontWeight: 500,
                  fontSize: `${fontSizes.valueSize}px`,
                  lineHeight: 1
                }}
              >
                {pnlData.totalPnL >= 0 ? '+' : ''}{formatCurrency(pnlData.totalPnL)}
              </div>
              <div 
                className="opacity-70"
                style={{ 
                  color: customization?.generalTextColor || '#ffffff',
                  fontWeight: 400,
                  fontSize: `${fontSizes.labelSize}px`,
                  lineHeight: 1.5
                }}
              >
                PnL
              </div>
            </div>

            {/* Controls - Only visible on hover, positioned absolutely */}
            {isHovered && (
              <div className="absolute top-1 right-1 flex items-center gap-1">
                <button
                  onClick={() => {
                    resetStats();
                    setPnlData(prev => ({
                      ...prev,
                      totalPnL: 0,
                      todayPnL: 0,
                      totalTrades: 0,
                      winningTrades: 0,
                      losingTrades: 0,
                      bestWin: 0,
                      worstLoss: 0,
                      currentStreak: 0,
                      longestWinStreak: 0,
                      longestLossStreak: 0
                    }));
                    setRecentTrades([]);
                  }}
                  className="p-1.5 hover:bg-white/10 rounded mr-1"
                  title="Reset PnL Stats"
                >
                  <RotateCcw size={14} style={{ color: customization?.generalTextColor || '#ffffff' }} />
                </button>
                <button
                  onClick={onCustomizeOpen}
                  className="p-1.5 hover:bg-white/10 rounded"
                  title="Customize"
                >
                  <Pencil size={14} style={{ color: customization?.generalTextColor || '#ffffff' }} />
                </button>
                <button
                  onClick={onClose}
                  className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
                  title="Close"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </>
  );
};

export default PnLTrackerPopup;
