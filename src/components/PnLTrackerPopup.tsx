'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Pencil } from 'lucide-react';

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
  const [pnlData, setPnlData] = useState({
    balance: 1250.75,
    totalPnL: 1250.75,
    todayPnL: 125.50,
    winRate: 68.5,
    totalTrades: 47,
    winningTrades: 32,
    losingTrades: 15,
    bestWin: 450.25,
    worstLoss: -125.75,
    currentStreak: 3,
    longestWinStreak: 8,
    longestLossStreak: 4
  });

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

  // Simulate PnL data updates
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setPnlData(prev => ({
        ...prev,
        balance: prev.balance + (Math.random() - 0.4) * 2,
        totalPnL: prev.totalPnL + (Math.random() - 0.4) * 2,
        todayPnL: prev.todayPnL + (Math.random() - 0.4) * 1,
        totalTrades: prev.totalTrades + Math.floor(Math.random() * 2),
        winningTrades: prev.winningTrades + (Math.random() > 0.6 ? 1 : 0),
        losingTrades: prev.losingTrades + (Math.random() > 0.7 ? 1 : 0),
        winRate: Math.max(0, Math.min(100, prev.winRate + (Math.random() - 0.5) * 2)),
        bestWin: Math.max(prev.bestWin, Math.random() * 50),
        worstLoss: Math.min(prev.worstLoss, -Math.random() * 30),
        currentStreak: Math.floor(Math.random() * 10) - 5,
        longestWinStreak: Math.max(prev.longestWinStreak, Math.floor(Math.random() * 15)),
        longestLossStreak: Math.max(prev.longestLossStreak, Math.floor(Math.random() * 10))
      }));

      // Add recent trade
      if (Math.random() > 0.8) {
        const newTrade = {
          id: Date.now().toString(),
          timestamp: new Date(),
          multiplier: Math.random() * 10 + 1,
          pnl: (Math.random() - 0.4) * 20,
          type: Math.random() > 0.5 ? 'win' as const : 'loss' as const
        };
        
        setRecentTrades(prev => [newTrade, ...prev.slice(0, 9)]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

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
                  color: customization?.balanceTextColor || '#ffffff',
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
