'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  hitBoxes?: string[]; // Array of contract IDs that were successfully hit
  missedBoxes?: string[]; // Array of contract IDs that were missed
  realPositions?: Map<string, any>; // Real backend positions (for mock backend mode)
  contracts?: any[]; // Backend contracts (for mock backend mode)
}

// Stable empty array to prevent infinite loops
const EMPTY_ARRAY: number[] = [];
const EMPTY_STRING_ARRAY: string[] = [];

const PositionsTable = React.memo(function PositionsTable({ selectedCount, selectedMultipliers, betAmount, currentBTCPrice, onPositionHit, onPositionMiss, hitBoxes = EMPTY_STRING_ARRAY, missedBoxes = EMPTY_STRING_ARRAY, realPositions, contracts = EMPTY_ARRAY as any[] }: PositionsTableProps) {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const signatureColor = useUIStore((state) => state.signatureColor);
  
  // Track which contracts have been resolved to prevent duplicate processing
  const processedContractsRef = useRef<Set<string>>(new Set());
  
  // Stabilize props to prevent infinite loops - use useMemo to avoid creating new arrays
  const stableSelectedCount = selectedCount || 0;
  const stableSelectedMultipliers = useMemo(() => 
    selectedMultipliers && selectedMultipliers.length > 0 ? selectedMultipliers : EMPTY_ARRAY,
    [selectedMultipliers]
  );
  const stableBetAmount = betAmount || 0;
  const stableCurrentBTCPrice = currentBTCPrice || 0;
  
  // Stabilize contracts and hitBoxes/missedBoxes to prevent re-renders on array reference changes
  const stableContracts = useMemo(() => 
    contracts && contracts.length > 0 ? contracts : (EMPTY_ARRAY as any[]),
    [contracts]
  );
  const stableHitBoxes = useMemo(() => 
    hitBoxes && hitBoxes.length > 0 ? hitBoxes : EMPTY_STRING_ARRAY,
    [hitBoxes]
  );
  const stableMissedBoxes = useMemo(() => 
    missedBoxes && missedBoxes.length > 0 ? missedBoxes : EMPTY_STRING_ARRAY,
    [missedBoxes]
  );
  
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
    contractId?: string; // Backend contract ID for tracking
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
    contractId?: string; // Backend contract ID
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
  const moveToHistory = useCallback((positionId: string, result: 'Won' | 'Lost') => {
    setActivePositions(prev => {
      const position = prev.find(p => p.id === positionId);
      if (!position) {
        console.warn('⚠️ Position not found in active positions:', positionId);
        return prev;
      }
      
      const historyPosition = {
        ...position,
        entry: position.entry.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        result,
        prog: '100%',
        equity: result === 'Won' ? `$${(position.betAmount * position.multiplier).toFixed(2)}` : '$0.00'
      };
      
      setHistoryPositions(prevHistory => {
        const newHistory = [historyPosition, ...prevHistory];
        // Keep only last 10 positions
        return newHistory.slice(0, 10);
      });
      
      console.log('🔄 Removed position from active:', positionId);
      return prev.filter(p => p.id !== positionId);
    });
  }, []);

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

  // Sync active positions - use real backend positions when available
  useEffect(() => {
    console.log('🔍 PositionsTable: Sync triggered:', {
      hasRealPositions: !!realPositions,
      realPositionsSize: realPositions?.size || 0,
      contractsLength: stableContracts.length,
      stableSelectedCount,
      stableSelectedMultipliersLength: stableSelectedMultipliers.length
    });
    
    // If we have real backend positions (mock backend mode), use them directly
    if (realPositions && realPositions.size > 0 && stableContracts.length > 0) {
      console.log('📋 Using real backend positions:', {
        positionsSize: realPositions.size,
        positions: Array.from(realPositions.entries()),
        contractsSample: stableContracts.slice(0, 3)
      });
      
      const newPositions = Array.from(realPositions.entries()).map(([tradeId, position]) => {
        // Find the contract for this position
        const contract = stableContracts.find(c => c.contractId === position.contractId);
        const multiplier = contract?.returnMultiplier || 0;
        const avgPrice = contract ? (contract.lowerStrike + contract.upperStrike) / 2 : stableCurrentBTCPrice;
        
        console.log('📋 Creating position from backend:', {
          tradeId,
          contractId: position.contractId,
          foundContract: !!contract,
          multiplier
        });
        
        return {
          id: tradeId, // Use tradeId as the position ID
          time: new Date(position.timestamp || Date.now()).toLocaleTimeString(),
          size: position.amount,
          equity: `$${(position.amount * multiplier).toFixed(2)}`,
          hit: `${Math.round(Math.random() * 100)}%`,
          prog: '0%',
          entry: `$${avgPrice.toFixed(2)}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
          betAmount: position.amount,
          selectedMultipliers: [multiplier],
          multiplier,
          contractId: position.contractId // Use actual contractId from backend
        };
      });
      
      console.log('✅ Created', newPositions.length, 'positions from backend:', newPositions.map(p => ({ id: p.id, contractId: p.contractId, multiplier: p.multiplier })));
      setActivePositions(newPositions);
      return; // Don't continue to normal mode logic
    }
    
    // Normal mode - create from selectedMultipliers
    if (stableSelectedCount > 0 && stableSelectedMultipliers.length > 0 && stableBetAmount > 0) {
      // Fallback to normal mode (creating from selectedMultipliers)
      const betPerBox = stableBetAmount / stableSelectedCount;
      const currentPositionMultipliers = new Set(activePositions.map(p => p.multiplier));
      const newMultipliers = stableSelectedMultipliers.filter(mult => !currentPositionMultipliers.has(mult));
      
      if (newMultipliers.length > 0) {
        const newPositions = newMultipliers.map((multiplier, index) => {
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
            multiplier,
            contractId: undefined
          };
        });
        
        setActivePositions(prev => {
          const existingMultipliers = new Set(prev.map(p => p.multiplier));
          const filteredNewPositions = newPositions.filter(pos => !existingMultipliers.has(pos.multiplier));
          console.log('Adding new positions:', filteredNewPositions.length, 'Total positions:', prev.length + filteredNewPositions.length);
          return [...prev, ...filteredNewPositions];
        });
      }
      
      // Remove positions for deselected boxes
      const selectedMultipliersSet = new Set(stableSelectedMultipliers);
      setActivePositions(prev => {
        const filtered = prev.filter(pos => selectedMultipliersSet.has(pos.multiplier));
        console.log('Filtering positions:', prev.length, '->', filtered.length, 'Removed:', prev.length - filtered.length);
        return filtered;
      });
      
    } else if (stableSelectedCount === 0) {
      // Clear all active positions when no boxes are selected
      setActivePositions([]);
    }
  }, [stableSelectedCount, stableSelectedMultipliers, stableBetAmount, stableCurrentBTCPrice, realPositions, stableContracts]);

  // Monitor hitBoxes and missedBoxes to resolve positions
  // IMPORTANT: activePositions is NOT in the dependency array to prevent infinite loops
  // We only react to changes in hitBoxes/missedBoxes and read the latest activePositions from state
  useEffect(() => {
    if (stableHitBoxes.length === 0 && stableMissedBoxes.length === 0) {
      console.log('📊 No hitBoxes or missedBoxes, skipping resolution check');
      return;
    }
    
    console.log('📊 Checking positions for resolution:', { 
      hitBoxes: stableHitBoxes, 
      missedBoxes: stableMissedBoxes, 
      activePositionsCount: activePositions.length,
      activePositions: activePositions.map(p => ({ id: p.id, contractId: p.contractId, multiplier: p.multiplier }))
    });
    
    if (activePositions.length === 0) {
      console.log('📊 No active positions to resolve');
      return;
    }
    
    const hitSet = new Set(stableHitBoxes);
    const missedSet = new Set(stableMissedBoxes);
    
    // Find all positions that should be resolved (and haven't been processed yet)
    const positionsToResolve = activePositions.filter(position => {
      const contractId = position.contractId;
      if (!contractId) {
        console.log('⚠️ Position has no contractId:', position.id);
        return false;
      }
      
      // Skip if already processed
      if (processedContractsRef.current.has(contractId)) {
        console.log('⏭️ Skipping already processed contract:', contractId);
        return false;
      }
      
      const shouldResolve = hitSet.has(contractId) || missedSet.has(contractId);
      if (shouldResolve) {
        console.log('✓ Position should be resolved:', { id: position.id, contractId, isHit: hitSet.has(contractId) });
      }
      return shouldResolve;
    });
    
    // Move resolved positions to history
    if (positionsToResolve.length > 0) {
      console.log('🔄 Moving', positionsToResolve.length, 'positions to history');
      
      positionsToResolve.forEach(position => {
        const contractId = position.contractId!;
        const result = hitSet.has(contractId) ? 'Won' : 'Lost';
        
        console.log(result === 'Won' ? '✅ Position HIT:' : '❌ Position MISSED:', {
          id: position.id,
          contractId,
          multiplier: position.multiplier
        });
        
        // Mark as processed BEFORE calling moveToHistory to prevent any potential race conditions
        processedContractsRef.current.add(contractId);
        
        moveToHistory(position.id, result);
        
        if (result === 'Won' && onPositionHit) {
          onPositionHit(position.id);
        } else if (result === 'Lost' && onPositionMiss) {
          onPositionMiss(position.id);
        }
      });
    } else {
      console.log('📊 No positions need to be resolved');
    }
  }, [stableHitBoxes, stableMissedBoxes, onPositionHit, onPositionMiss, moveToHistory]);

  // Monitor for changes in selectedMultipliers to detect when boxes are deselected
  useEffect(() => {
    // If selectedMultipliers decreased, it means some boxes were deselected or resolved
    if (stableSelectedMultipliers.length < activePositions.length) {
      // Find positions that no longer have matching multipliers
      const positionsToRemove = activePositions.filter(position => {
        // Check if this position's multipliers are still in the current selection
        const hasMatchingMultipliers = position.selectedMultipliers.every(mult => 
          stableSelectedMultipliers.includes(mult)
        );
        return !hasMatchingMultipliers;
      });

      // For positions not in hit/missed lists, we'll keep the random fallback
      const hitBoxesSet = new Set(stableHitBoxes);
      const missedBoxesSet = new Set(stableMissedBoxes);
      
      positionsToRemove.forEach(position => {
        // Skip if already handled by hit/missed monitoring
        if (hitBoxesSet.has(position.id) || missedBoxesSet.has(position.id)) {
          return;
        }
        
        // Fallback random evaluation for positions not explicitly marked
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
                <thead className="text-zinc-400 sticky top-0 z-10" style={{ 
                  backgroundColor: '#09090B',
                  boxShadow: '0 1px 0 0 rgb(39 39 42), 0 -1px 0 0 rgb(39 39 42)'
                }}>
                  <tr className="[&>th]:py-1 [&>th]:px-3 text-left [&>th]:border-t [&>th]:border-b [&>th]:border-zinc-800">
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
                              <thead className="text-zinc-400 sticky top-0 z-10" style={{ 
                  backgroundColor: '#09090B',
                  boxShadow: '0 1px 0 0 rgb(39 39 42), 0 -1px 0 0 rgb(39 39 42)'
                }}>
                  <tr className="[&>th]:py-1 [&>th]:px-3 text-left [&>th]:border-t [&>th]:border-b [&>th]:border-zinc-800">
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
});

export default PositionsTable;
