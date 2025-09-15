'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameSession } from '../hooks/useGameSession';

const BOX_SIZE = 30;
const VISIBLE_RANGE_FACTOR = 0.25;
const MAX_RANGE_FACTOR = 0.5;
interface LeverageData {
  id: number;
  leverage: number;
  boxIndex: number;
}

interface TimeRange {
  start: string;
  end: string;
}

interface PriceRange {
  min: number;
  max: number;
}

interface Box {
  row: number;
  col: number;
  timestampRange: TimeRange;
  priceRange: PriceRange;
  data: LeverageData | null;
}

interface Contract {
  contractId: string;
  type?: 'IRON_CONDOR';
  lowerStrike: number;
  upperStrike: number;
  returnMultiplier: number;
  isActive: boolean;
  totalVolume: number;
  playerCount: number;
  startTime: number;
  endTime: number;
}

interface BoxHitProps {
  currentPrice: number;
  currentTime: Date;
  numYsquares: number;
  numXsquares: number;
  basePrice: number;
  priceStep: number;
  timeStep: number;
  ws: {
    send: (message: any) => void;
    on: (event: string, handler: (data: any) => void) => void;
    off: (event: string, handler: (data: any) => void) => void;
  };
  userId: string | null;
}

export default function BoxHit({
  currentPrice,
  currentTime,
  numYsquares,
  numXsquares,
  basePrice,
  priceStep,
  timeStep,
  ws,
  userId,
}: BoxHitProps) {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [selectedBoxes, setSelectedBoxes] = useState<Set<string>>(new Set());
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  const [contractMemory, setContractMemory] = useState<Map<string, Contract>>(
    new Map()
  );
  const debugLogged = useRef(false);

  // Debug log on mount
  useEffect(() => {
    console.log('[BoxHit] Component mounted with:', {
      timeStep,
      numXsquares,
      numYsquares,
      basePrice,
      priceStep,
      currentPrice,
      totalTimeRange: (numXsquares * timeStep) / 1000, // in seconds
      totalTimeRangeMs: numXsquares * timeStep,
    });
  }, []);

  const { contracts, userBalance, positions, handleTradePlace } =
    useGameSession({
      gameMode: 'box_hit',
      timeframe: timeStep,
      ws,
      enabled: true,
    });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const xScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setContractMemory((prev) => {
      const newMemory = new Map(prev);
      contracts.forEach((contract) => {
        newMemory.set(contract.contractId, contract);
      });
      const now = Date.now();
      for (const [id, contract] of newMemory.entries()) {
        if (contract.endTime < now) {
          newMemory.delete(id);
        }
      }
      
      // Debug logging - only log once
      if (contracts.length > 0 && !debugLogged.current) {
        debugLogged.current = true;
        const sortedContracts = contracts
          .filter(c => c.isActive)
          .sort((a, b) => a.startTime - b.startTime);
        
        console.log('[BoxHit] Contract timing issue:', {
          currentTime: now,
          currentTimeStr: new Date(now).toISOString(),
          totalContracts: contracts.length,
          activeContracts: sortedContracts.length,
          earliestContract: sortedContracts[0] ? {
            id: sortedContracts[0].contractId,
            startTime: sortedContracts[0].startTime,
            startTimeStr: new Date(sortedContracts[0].startTime).toISOString(),
            timeDiff: sortedContracts[0].startTime - now,
            timeDiffSeconds: (sortedContracts[0].startTime - now) / 1000,
          } : null,
          latestContract: sortedContracts[sortedContracts.length - 1] ? {
            id: sortedContracts[sortedContracts.length - 1].contractId,
            startTime: sortedContracts[sortedContracts.length - 1].startTime,
            startTimeStr: new Date(sortedContracts[sortedContracts.length - 1].startTime).toISOString(),
            timeDiff: sortedContracts[sortedContracts.length - 1].startTime - now,
            timeDiffSeconds: (sortedContracts[sortedContracts.length - 1].startTime - now) / 1000,
          } : null,
        });
      }
      
      return newMemory;
    });
  }, [contracts, timeStep]);

  const visiblePriceRange = useMemo(() => {
    const X = numYsquares * priceStep;
    const minVisible = currentPrice - VISIBLE_RANGE_FACTOR * X;
    const maxVisible = currentPrice + VISIBLE_RANGE_FACTOR * X;
    const minAllowed = currentPrice - MAX_RANGE_FACTOR * X;
    const maxAllowed = currentPrice + MAX_RANGE_FACTOR * X;
    return { minVisible, maxVisible, minAllowed, maxAllowed };
  }, [currentPrice, numYsquares, priceStep]);

  const findContractForPosition = useCallback(
    (
      _row: number,
      col: number,
      priceMin: number,
      priceMax: number
    ): Contract | null => {
      // No offset needed
      const columnStartTime = currentTimeMs + col * timeStep;
      const columnEndTime = columnStartTime + timeStep;

      // Add tolerance for timing precision issues
      // Time tolerance for contract matching
      const timeTolerance = Math.min(50, timeStep * 0.1);

      for (const contract of contractMemory.values()) {
        if (contract.type && contract.type !== 'IRON_CONDOR') continue;
        if (!contract.isActive) continue;

        // Check if contract overlaps with column window
        const contractOverlapsWindow = contract.startTime < columnEndTime + timeTolerance &&
                                       contract.endTime > columnStartTime - timeTolerance;

        const priceMatch =
          contract.lowerStrike < priceMax && contract.upperStrike > priceMin;

        if (contractOverlapsWindow && priceMatch) {
          return contract;
        }
      }
      return null;
    },
    [contractMemory, currentTimeMs, timeStep]
  );

  const toggleBoxSelection = useCallback(
    (box: Box): void => {
      if (!box.data) {
        return;
      }

      const contract = findContractForPosition(
        box.row,
        box.col,
        box.priceRange.min,
        box.priceRange.max
      );
      if (contract) {
        handleTradePlace(contract.contractId, 100);

        setSelectedBoxes((prev) => {
          const newSet = new Set(prev);
          newSet.add(contract.contractId);
          return newSet;
        });
      }
    },
    [findContractForPosition, handleTradePlace]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>): void => {
    const target = e.currentTarget;
    setScrollLeft(target.scrollLeft);
    setScrollTop(target.scrollTop);
    if (xScrollContainerRef.current) {
      xScrollContainerRef.current.scrollLeft = target.scrollLeft;
    }
  }, []);

  const boxes = useMemo(() => {
    const filledBoxes: Box[][] = [];

    const rowsToShow = Math.ceil(
      (visiblePriceRange.maxAllowed - visiblePriceRange.minAllowed) / priceStep
    );
    const startPrice =
      Math.ceil(visiblePriceRange.maxAllowed / priceStep) * priceStep;

    // Debug logging
    if (false) {
      console.log('[BoxHit] Box generation debug for 0.5s:', {
        rowsToShow,
        startPrice,
        visiblePriceRange,
        currentPrice,
        numXsquares,
        contractMemorySize: contractMemory.size,
      });
    }

    for (let i = 0; i < rowsToShow; i++) {
      const rowData: Box[] = [];
      const rowMaxPrice = startPrice - i * priceStep;
      const rowMinPrice = rowMaxPrice - priceStep;

      if (
        rowMaxPrice < visiblePriceRange.minAllowed ||
        rowMinPrice > visiblePriceRange.maxAllowed
      ) {
        if (false && i < 5) {
          console.log(`[BoxHit] Skipping row ${i}:`, {
            rowMaxPrice,
            rowMinPrice,
            minAllowed: visiblePriceRange.minAllowed,
            maxAllowed: visiblePriceRange.maxAllowed,
            skip: true,
          });
        }
        continue;
      }

      for (let col = 0; col < numXsquares; col++) {
        // Start boxes from current time, no offset needed
        const columnStartTime = currentTimeMs + col * timeStep;

        const box: Box = {
          row: i,
          col,
          timestampRange: {
            start: new Date(columnStartTime).toISOString(),
            end: new Date(columnStartTime + timeStep).toISOString(),
          },
          priceRange: {
            min: rowMinPrice,
            max: rowMaxPrice,
          },
          data: null,
        };

        const contract = findContractForPosition(
          i,
          col,
          box.priceRange.min,
          box.priceRange.max
        );
        
        // Debug log for first box only
        if (false && i === 0 && col === 0 && contractMemory.size > 0) {
          const allContracts = Array.from(contractMemory.values());
          const now = Date.now();
          const activeContracts = allContracts.filter(c => c.isActive);
          const futureContracts = activeContracts.filter(c => c.startTime > now);
          const currentContracts = activeContracts.filter(c => c.startTime <= now && c.endTime > now);
          
          console.log('[BoxHit] Detailed timing analysis for 0.5s:', {
            currentTime: new Date(now).toISOString(),
            totalContracts: allContracts.length,
            activeContracts: activeContracts.length,
            futureContracts: futureContracts.length,
            currentContracts: currentContracts.length,
            firstBoxWindow: {
              start: new Date(columnStartTime).toISOString(),
              end: new Date(columnStartTime + timeStep).toISOString(),
              columnStartTime,
              currentTimeMs,
              diff: columnStartTime - currentTimeMs,
            },
            nearestFutureContract: futureContracts
              .sort((a, b) => a.startTime - b.startTime)[0],
            contractsInFirstFewColumns: activeContracts
              .filter(c => c.startTime >= now && c.startTime < now + 5 * timeStep)
              .map(c => ({
                id: c.contractId,
                col: Math.floor((c.startTime - now) / timeStep),
                startOffset: c.startTime - now,
                start: new Date(c.startTime).toISOString(),
              })),
          });
        }
        
        if (contract) {
          box.data = {
            id: parseInt(contract.contractId.split('_')[2] || '0'),
            leverage: contract.returnMultiplier,
            boxIndex: i * numXsquares + col,
          };
        }

        rowData.push(box);
      }
      filledBoxes.push(rowData);
    }

    // Debug final result
    if (false) {
      console.log('[BoxHit] Generated boxes for 0.5s:', {
        totalRows: filledBoxes.length,
        totalBoxes: filledBoxes.reduce((sum, row) => sum + row.length, 0),
        firstRow: filledBoxes[0]?.length || 0,
      });
    }

    return filledBoxes;
  }, [
    numXsquares,
    findContractForPosition,
    priceStep,
    currentTimeMs,
    timeStep,
    visiblePriceRange,
    contractMemory,
  ]);

  // Debug render
  if (false) {
    console.log('[BoxHit] Rendering with:', {
      boxesLength: boxes.length,
      firstRowLength: boxes[0]?.length || 0,
      contractMemorySize: contractMemory.size,
    });
  }

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="relative flex flex-1 overflow-hidden">
          <div className="relative w-16 flex-shrink-0 overflow-hidden border-r border-gray-600">
            <div
              className="absolute left-0 right-0"
              style={{ transform: `translateY(-${scrollTop}px)` }}
            >
              {boxes.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex w-full items-center justify-end pr-2 text-[0.6rem] text-gray-400"
                  style={{ height: `${BOX_SIZE}px` }}
                >
                  {row[0].priceRange.max.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
          <div
            ref={scrollContainerRef}
            className="absolute inset-0 left-16 overflow-x-auto overflow-y-auto"
            onScroll={handleScroll}
          >
            <div className="flex flex-col">
              {boxes.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((box, colIndex) => (
                    <div
                      key={`${colIndex}-${box.timestampRange.start}`}
                      onClick={() => toggleBoxSelection(box)}
                      className={`group relative flex flex-shrink-0 items-center justify-center border-[0.5px] ${
                        'border-gray-600'
                      } ${
                        box.data
                          ? 'cursor-pointer hover:bg-gray-600'
                          : 'cursor-not-allowed'
                      } ${
                        currentPrice >= box.priceRange.min &&
                        currentPrice < box.priceRange.max
                          ? 'bg-yellow-500/40'
                          : ''
                      } ${
                        box.priceRange.max > visiblePriceRange.minVisible &&
                        box.priceRange.min < visiblePriceRange.maxVisible
                          ? 'bg-gray-700/20'
                          : ''
                      } ${(() => {
                        if (!box.data) return '';
                        const contract = findContractForPosition(
                          box.row,
                          box.col,
                          box.priceRange.min,
                          box.priceRange.max
                        );
                        return contract &&
                          selectedBoxes.has(contract.contractId)
                          ? 'bg-blue-500/30'
                          : '';
                      })()}`}
                      style={{
                        height: `${BOX_SIZE}px`,
                        width: `${BOX_SIZE}px`,
                      }}
                    >
                      {box.data && (
                        <>
                          <span className="text-[0.65rem] text-gray-400 group-hover:text-white">
                            {box.data.leverage}x
                          </span>
                          <div className="absolute -top-24 left-1/2 z-10 hidden w-52 -translate-x-1/2 border border-gray-600 bg-gray-900 px-2 py-1.5 text-[0.55rem] text-gray-200 group-hover:block">
                            {(() => {
                              const contract = findContractForPosition(
                                box.row,
                                box.col,
                                box.priceRange.min,
                                box.priceRange.max
                              );
                              if (!contract) return <div>No contract data</div>;
                              return (
                                <>
                                  <div className="mb-1 flex justify-between text-white">
                                    <span className="text-[0.5rem]">
                                      {contract.contractId}
                                    </span>
                                    <span className="font-semibold">
                                      {contract.returnMultiplier}x
                                    </span>
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="text-blue-400">
                                      Strike: ${contract.lowerStrike.toFixed(2)}{' '}
                                      - ${contract.upperStrike.toFixed(2)}
                                    </div>
                                    <div className="text-green-400">
                                      Volume: ${contract.totalVolume} | Players:{' '}
                                      {contract.playerCount}
                                    </div>
                                    <div className="text-yellow-400">
                                      Start:{' '}
                                      {new Date(
                                        contract.startTime
                                      ).toLocaleTimeString()}
                                    </div>
                                    <div className="text-yellow-400">
                                      End:{' '}
                                      {new Date(
                                        contract.endTime
                                      ).toLocaleTimeString()}
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex h-12 w-full flex-shrink-0 border-t border-gray-600 text-gray-600">
          <div className="flex h-full w-16 border-r border-gray-600"></div>
          <div
            ref={xScrollContainerRef}
            className="flex flex-1 overflow-x-hidden"
          >
            <div
              className="flex"
              style={{ transform: `translateX(-${scrollLeft}px)` }}
            >
              {boxes[0] &&
                boxes[0].map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className="relative flex h-full flex-shrink-0 items-end justify-center"
                    style={{ width: `${BOX_SIZE}px` }}
                  >
                    {colIndex % 5 === 0 && (
                      <span
                        className="absolute bottom-2 whitespace-nowrap text-[0.5rem] text-gray-400"
                        style={{
                          transform: 'rotate(45deg)',
                          transformOrigin: 'center bottom',
                        }}
                      >
                        {new Date(Date.now() + colIndex * timeStep).toLocaleTimeString(
                          'en-US',
                          {
                            hour12: false,
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          }
                        )}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-32 w-full flex-shrink-0 items-center justify-between border-t border-gray-600 px-8">
        <div className="text-sm text-gray-400">
          <span className="text-gray-500">Balance:</span>
          <span className="ml-2 text-lg font-semibold text-white">
            ${userBalance.toFixed(2)}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          <span className="text-gray-500">Active Positions:</span>
          <span className="ml-2 text-lg font-semibold text-white">
            {positions.size}
          </span>
        </div>
      </div>
    </>
  );
}
