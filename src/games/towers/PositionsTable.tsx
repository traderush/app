'use client';
import { useState, useEffect, useMemo } from 'react';
import { useUIStore } from '@/stores';

/** centralized trading colors */
const TRADING_COLORS = {
  positive: '#2fe3ac',  // Green for positive values (gains, up movements)
  negative: '#ec397a',  // Red for negative values (losses, down movements)
} as const;

interface PositionsTableProps {
  selectedCount: number;
  selectedMultipliers: number[];
  betAmount: number;
  currentBTCPrice: number;
  onPositionHit?: (positionId: string) => void;
  onPositionMiss?: (positionId: string) => void;
  hitBoxes?: string[]; // Array of box IDs that were successfully hit
  missedBoxes?: string[]; // Array of box IDs that were missed
}

export default function PositionsTable({ selectedCount, selectedMultipliers, betAmount, currentBTCPrice, onPositionHit, onPositionMiss, hitBoxes = [], missedBoxes = [] }: PositionsTableProps) {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const signatureColor = useUIStore((state) => state.signatureColor);
  
  // Ensure stable default values to prevent dependency array size changes
  const stableSelectedCount = selectedCount || 0;
  const stableSelectedMultipliers = selectedMultipliers || [];
  const stableBetAmount = betAmount || 0;
  const stableCurrentBTCPrice = currentBTCPrice || 0;
  
  // Memoize the stable values to prevent unnecessary re-renders
  const memoizedStableValues = useMemo(() => ({
    selectedCount: stableSelectedCount,
    selectedMultipliers: stableSelectedMultipliers,
    betAmount: stableBetAmount,
    currentBTCPrice: stableCurrentBTCPrice
  }), [stableSelectedCount, stableSelectedMultipliers, stableBetAmount, stableCurrentBTCPrice]);
  
  // Active positions (boxes that are selected but not yet hit)
  const [activePositions, setActivePositions] = useState<Array<{
    id: string;
    time: string;
    size: number;
    equity: string;
    hit: string;
    prog: string;
    entry: string;
    betAmount: number;
    selectedMultipliers: number[];
    multiplier: number; // Individual multiplier for this position
  }>>([]);

  // History positions (completed trades - keep only last 10)
  const [historyPositions, setHistoryPositions] = useState<Array<{
    id: string;
    time: string;
    size: number;
    equity: string;
    hit: string;
    prog: string;
    entry: string;
    result: 'Won' | 'Lost';
    betAmount: number;
    selectedMultipliers: number[];
    multiplier: number; // Individual multiplier for this position
  }>>([]);

  // Function to add a new active position when boxes are selected
  const addActivePosition = (betAmount: number, multiplier: number, entryPrice: string) => {
    const newPosition = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      size: betAmount,
      equity: `$${(betAmount * multiplier).toFixed(2)}`,
      hit: `${Math.round(Math.random() * 100)}%`,
      prog: '0%',
      entry: entryPrice.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
      betAmount,
      selectedMultipliers: [multiplier], // Store as array for compatibility
      multiplier // Individual multiplier for this position
    };
    
    setActivePositions(prev => [...prev, newPosition]);
  };

  // Function to move position from active to history when hit
  const moveToHistory = (positionId: string, result: 'Won' | 'Lost') => {
    const position = activePositions.find(p => p.id === positionId);
    if (position) {
      const historyPosition = {
        ...position,
        entry: position.entry.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        result,
        prog: '100%',
        equity: result === 'Won' ? `$${(position.betAmount * position.multiplier).toFixed(2)}` : '$0.00'
      };
      
      setHistoryPositions(prev => {
        const newHistory = [historyPosition, ...prev];
        // Keep only last 10 positions
        return newHistory.slice(0, 10);
      });
      
      setActivePositions(prev => prev.filter(p => p.id !== positionId));
    }
  };

  // Function to handle when a position is hit (called from parent component)
  const handlePositionHit = (positionId: string) => {
    moveToHistory(positionId, 'Won');
  };

  // Function to handle when a position is missed (called from parent component)
  const handlePositionMiss = (positionId: string) => {
    moveToHistory(positionId, 'Lost');
  };

  // Function to update position progress
  const updatePositionProgress = (positionId: string, progress: string) => {
    setActivePositions(prev => 
      prev.map(p => p.id === positionId ? { ...p, prog: progress } : p)
    );
  };

  // Sync active positions with selected boxes - create one position per selected box
  useEffect(() => {
    if (stableSelectedCount > 0 && stableSelectedMultipliers.length > 0 && stableBetAmount > 0) {
      // Calculate bet amount per box (divide total bet by number of selected boxes)
      const betPerBox = stableBetAmount / stableSelectedCount;
      
      // Get current position multipliers to detect new selections
      const currentPositionMultipliers = new Set(activePositions.map(p => p.multiplier));
      
      // Find new multipliers that don't have positions yet
      const newMultipliers = stableSelectedMultipliers.filter(mult => !currentPositionMultipliers.has(mult));
      
              // Create positions only for newly selected boxes
        if (newMultipliers.length > 0) {
          const newPositions = newMultipliers.map((multiplier, index) => {
            // Create truly unique ID using timestamp and index to prevent duplicates
            const timestamp = Date.now();
            const uniqueIndex = index;
            const positionId = `box-${multiplier}-${timestamp}-${uniqueIndex}`;
            return {
              id: positionId,
              time: new Date().toLocaleTimeString(),
              size: betPerBox,
              equity: `$${(betPerBox * multiplier).toFixed(2)}`,
              hit: `${Math.round(Math.random() * 100)}%`,
              prog: '0%',
              entry: `$${stableCurrentBTCPrice.toFixed(2)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
              betAmount: betPerBox,
              selectedMultipliers: [multiplier],
              multiplier
            };
          });
        
        // Add new positions to existing ones, ensuring no duplicate IDs
        setActivePositions(prev => {
          // Filter out any existing positions with the same multipliers to prevent duplicates
          const existingMultipliers = new Set(prev.map(p => p.multiplier));
          const filteredNewPositions = newPositions.filter(pos => !existingMultipliers.has(pos.multiplier));
          
          return [...prev, ...filteredNewPositions];
        });
      }
      
      // Remove positions for deselected boxes
      const selectedMultipliersSet = new Set(stableSelectedMultipliers);
      setActivePositions(prev => prev.filter(pos => selectedMultipliersSet.has(pos.multiplier)));
      
    } else if (stableSelectedCount === 0) {
      // Clear all active positions when no boxes are selected
      setActivePositions([]);
    }
  }, [memoizedStableValues.selectedCount, memoizedStableValues.selectedMultipliers, memoizedStableValues.betAmount, memoizedStableValues.currentBTCPrice]);

  // Monitor for changes in selectedMultipliers to detect when boxes are hit
  useEffect(() => {
    // If selectedMultipliers decreased, it means some boxes were hit
    if (stableSelectedMultipliers.length < activePositions.length) {
      // Find positions that no longer have matching multipliers
      const positionsToRemove = activePositions.filter(position => {
        // Check if this position's multipliers are still in the current selection
        const hasMatchingMultipliers = position.selectedMultipliers.every(mult => 
          stableSelectedMultipliers.includes(mult)
        );
        return !hasMatchingMultipliers;
      });

      // Evaluate each position based on actual hit/miss data
      positionsToRemove.forEach(position => {
        // Check if this position's boxes were hit or missed
        const positionMultipliers = position.selectedMultipliers;
        
        // For now, we'll use a more realistic approach:
        // If the position had high probability (>=70%), it's more likely to be a hit
        // If it had low probability (<30%), it's more likely to be a miss
        // Middle range (30-70%) is random
        
        const hitProbability = parseInt(position.hit);
        let isHit = false;
        
        if (hitProbability >= 70) {
          isHit = true; // High probability = likely hit
        } else if (hitProbability < 30) {
          isHit = false; // Low probability = likely miss
        } else {
          // Middle range - random outcome for realistic gameplay
          isHit = Math.random() > 0.5;
        }
        
        if (isHit) {
          handlePositionHit(position.id);
        } else {
          handlePositionMiss(position.id);
        }
      });
    }
  }, [stableSelectedMultipliers, activePositions]);

  // Simulate position progress updates (in real app, this would come from chart movement)
  useEffect(() => {
    if (activePositions.length > 0) {
      const interval = setInterval(() => {
        setActivePositions(prev => 
          prev.map(pos => {
            // Only update progress if it's not already at 100%
            if (pos.prog === '100%') return pos;
            
            // More stable progress updates - smaller increments, less random
            const currentProgress = parseInt(pos.prog) || 0;
            const increment = Math.min(Math.floor(Math.random() * 5) + 1, 100 - currentProgress); // 1-5% increments
            const newProgress = Math.min(currentProgress + increment, 100);
            
            return {
              ...pos,
              prog: `${newProgress}%`
            };
          })
        );
      }, 5000); // Increased from 3s to 5s for more stability

      return () => clearInterval(interval);
    }
  }, [activePositions.length]);

  return (
    <div>
      {/* Menu Tabs */}
      <div className="flex items-center">
        <button
          onClick={() => setActiveTab('positions')}
          className={`px-3 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'positions' 
              ? 'text-zinc-100' 
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
          style={{ fontSize: '14px', fontWeight: '500' }}
        >
          Positions
          {activeTab === 'positions' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-2 text-sm font-medium transition-colors relative ${
            activeTab === 'history' 
              ? 'text-zinc-100' 
              : 'text-zinc-400 hover:text-zinc-300'
          }`}
          style={{ fontSize: '14px', fontWeight: '500' }}
        >
          Position History
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100"></div>
          )}
        </button>
      </div>
      
      {/* Full-width border line under menu */}
      <div className="border-b mx-0" style={{ borderColor: '#0E0E0E' }}></div>

      {/* Content based on active tab */}
              {activeTab === 'positions' && (
          <div className="overflow-x-auto pb-3" style={{ height: '256px' }}>
            <div className="h-full overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-zinc-400 sticky top-0 border-t border-b border-zinc-800" style={{ backgroundColor: '#09090B' }}>
                  <tr className="[&>th]:py-1 [&>th]:px-3 text-left">
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Time</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Bet Size</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Multiplier</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Equity</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Probability of Hit</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Trade Progression</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Entry Price</th>
                  </tr>
                </thead>
            <tbody className="text-zinc-200" style={{ fontSize: '12px', fontWeight: '400' }}>
              {activePositions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-zinc-500">
                    No active positions. Select boxes to start trading.
                  </td>
                </tr>
              ) : (
                activePositions.map((r,i)=>(
                  <tr key={r.id} className="[&>td]:py-2 [&>td]:px-3 border-t border-zinc-800/70" style={{ backgroundColor: (i + 1) % 2 === 0 ? '#18181B' : 'transparent' }}>
                    <td>{r.time}</td>
                    <td>${r.size.toFixed(2)}</td>
                    <td className="font-medium" style={{ color: signatureColor }}>{r.multiplier.toFixed(1)}x</td>
                    <td style={{ color: r.equity.includes('-') ? TRADING_COLORS.negative : TRADING_COLORS.positive }}>{r.equity}</td>
                    <td style={{ color: parseFloat(r.hit) >= 50 ? TRADING_COLORS.positive : TRADING_COLORS.negative }}>{r.hit}</td>
                    <td>
                      <div className="h-4 w-24 relative">
                        <div 
                          className="h-4" 
                          style={{ 
                            width: r.prog,
                            background: `linear-gradient(to right, rgba(250, 86, 22, 0) 0%, rgba(250, 86, 22, 1) 100%)`
                          }} 
                        />
                        <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs text-white font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>
                          {r.prog}
                        </span>
                      </div>
                    </td>
                    <td>{r.entry}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
            </div>
          </div>
        )}

      {activeTab === 'history' && (
        <div className="overflow-x-auto pb-3" style={{ height: '256px' }}>
          <div className="h-full overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
                              <thead className="text-zinc-400 sticky top-0 border-t border-b border-zinc-800" style={{ backgroundColor: '#09090B' }}>
                  <tr className="[&>th]:py-1 [&>th]:px-3 text-left">
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Time</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Bet Size</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Multiplier</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Equity</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Probability of Hit</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Trade Progression</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Entry Price</th>
                    <th className="text-xs font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>Result</th>
                  </tr>
                </thead>
                        <tbody className="text-zinc-200" style={{ fontSize: '12px', fontWeight: '400' }}>
              {historyPositions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-zinc-500">
                    No completed trades yet.
                  </td>
                </tr>
              ) : (
                historyPositions.map((r,i)=>(
                  <tr key={r.id} className="[&>td]:py-2 [&>td]:px-3 border-t border-zinc-800/70" style={{ backgroundColor: (i + 1) % 2 === 0 ? '#18181B' : 'transparent' }}>
                    <td>{r.time}</td>
                    <td>${r.size.toFixed(2)}</td>
                    <td className="font-medium" style={{ color: signatureColor }}>{r.multiplier.toFixed(1)}x</td>
                    <td style={{ color: r.equity === '$0.00' ? TRADING_COLORS.negative : TRADING_COLORS.positive }}>{r.equity}</td>
                    <td style={{ color: parseFloat(r.hit) >= 50 ? TRADING_COLORS.positive : TRADING_COLORS.negative }}>{r.hit}</td>
                    <td>
                      <div className="h-4 w-24 relative">
                        <div 
                          className="h-4" 
                          style={{ 
                            width: r.prog,
                            background: `linear-gradient(to right, rgba(250, 86, 22, 0) 0%, rgba(250, 86, 22, 1) 100%)`
                        }} 
                        />
                        <span className="absolute left-1 top-1/2 transform -translate-y-1/2 text-xs text-white font-normal" style={{ fontSize: '12px', fontWeight: '400' }}>
                          {r.prog}
                        </span>
                      </div>
                    </td>
                    <td>{r.entry}</td>
                    <td>
                      <span className="px-2 py-1 rounded text-xs font-normal" style={{ 
                        fontSize: '12px', 
                        fontWeight: '400',
                        backgroundColor: r.result === 'Won' ? `${TRADING_COLORS.positive}20` : `${TRADING_COLORS.negative}20`,
                        color: r.result === 'Won' ? TRADING_COLORS.positive : TRADING_COLORS.negative
                      }}>
                        {r.result}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
            </div>
          </div>
        )}
    </div>
  );
}
