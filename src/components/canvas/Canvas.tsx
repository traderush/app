'use client';

import { GameType } from '@/types';
import { TimeFrame, getTimeframeConfig } from '@/types/timeframe';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GridGame } from '../../lib/canvasLogic/games/GridGame';
import { TimeframeSelector } from './components/TimeframeSelector';
import { useGameSession } from './hooks/useGameSession';
import { useWebSocket } from './hooks/useWebSocket';

interface CanvasProps {
  externalControl?: boolean;
  externalIsStarted?: boolean;
  onExternalStartChange?: (isStarted: boolean) => void;
  externalTimeframe?: number; // Timeframe in ms (e.g., 500, 1000, 2000, 4000, 10000)
}

export default function Canvas({ externalControl = false, externalIsStarted = false, onExternalStartChange, externalTimeframe }: CanvasProps = {}) {
  // Convert external timeframe (ms) to TimeFrame enum
  const getTimeFrameFromMs = (ms?: number): TimeFrame => {
    switch (ms) {
      case 500: return TimeFrame.HALF_SECOND;
      case 1000: return TimeFrame.SECOND;
      case 2000: return TimeFrame.TWO_SECONDS;
      case 4000: return TimeFrame.FOUR_SECONDS;
      case 10000: return TimeFrame.TEN_SECONDS;
      default: return TimeFrame.TWO_SECONDS;
    }
  };
  
  const [configLoaded, setConfigLoaded] = useState(false);
  const [numYsquares, setNumYsquares] = useState(20);
  const [numXsquares, setNumXsquares] = useState(25);
  const [basePrice, setBasePrice] = useState(100);
  const [priceStep, setPriceStep] = useState(0.1);
  const [timeStep, setTimeStep] = useState(2000);
  const [internalSelectedTimeframe, setInternalSelectedTimeframe] = useState<TimeFrame>(TimeFrame.TWO_SECONDS);
  const selectedTimeframe = externalControl && externalTimeframe 
    ? getTimeFrameFromMs(externalTimeframe) 
    : internalSelectedTimeframe;
  const setSelectedTimeframe = externalControl ? () => {} : setInternalSelectedTimeframe;
  const [internalIsStarted, setInternalIsStarted] = useState(false);
  const isStarted = externalControl ? externalIsStarted : internalIsStarted;
  const setIsStarted = externalControl && onExternalStartChange ? onExternalStartChange : setInternalIsStarted;
  
  const [currentPrice, setCurrentPrice] = useState(
    basePrice + priceStep * numYsquares * 0.5
  );
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<
    Array<{ id: string; message: string; type: 'success' | 'error' | 'info' }>
  >([]);
  const [isFollowingPrice, setIsFollowingPrice] = useState(true);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GridGame | null>(null);
  const priceUpdateIntervalRef = useRef<number | null>(null);
  const handleTradePlaceRef = useRef<typeof handleTradePlace | null>(null);
  const isJoinedRef = useRef(false);
  const contractsRef = useRef<any[]>([]);

  const { isConnected, isConnecting, connect, disconnect, send, on, off } =
    useWebSocket({
      autoConnect: false,
    });

  const { contracts, userBalance, positions, handleTradePlace, isJoined } =
    useGameSession({
      gameMode: 'box_hit',
      timeframe: selectedTimeframe,
      ws: isConnected ? { send, on, off } : null,
      enabled: isConnected,
    });

  // Debug contracts
  useEffect(() => {
    if (contracts.length > 0) {
      const now = Date.now();
      const futureContracts = contracts.filter((c) => c.startTime > now);
    }
  }, [contracts, isJoined]);

  // Keep refs updated
  useEffect(() => {
    handleTradePlaceRef.current = handleTradePlace;
    isJoinedRef.current = isJoined;
    contractsRef.current = contracts;
  }, [handleTradePlace, isJoined, contracts]);

  // Handle contract resolution and trade result events
  useEffect(() => {
    if (!isConnected) return;

    const handleContractResolved = (msg: any) => {
      if (msg.payload && gameRef.current) {
        const { contractId, outcome } = msg.payload;

        if (outcome === 'hit') {
          gameRef.current.markContractAsHit(contractId);
        }
        // Removed 'miss' handling - no longer dimming or marking lost boxes
      }
    };

    const handleTradeResult = (msg: any) => {
      if (msg.payload) {
        const { contractId, won, payout, profit, balance } = msg.payload;
        const message = won
          ? `Won! +$${profit.toFixed(2)} (Payout: $${payout.toFixed(2)})`
          : `Lost $${Math.abs(profit).toFixed(2)}`;

        // Add notification
        const notification = {
          id: `${contractId}_${Date.now()}`,
          message,
          type: won ? 'success' : ('error' as 'success' | 'error'),
        };

        setNotifications((prev) => [...prev, notification]);

        // Remove notification after 5 seconds
        setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notification.id)
          );
        }, 5000);

        // Update balance if needed
        console.log('Trade result:', {
          contractId,
          won,
          profit,
          newBalance: balance,
        });
      }
    };

    on('contract_resolved', handleContractResolved);
    on('trade_result', handleTradeResult);

    return () => {
      off('contract_resolved', handleContractResolved);
      off('trade_result', handleTradeResult);
    };
  }, [isConnected, on, off]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle game config
  useEffect(() => {
    if (isConnected && !configLoaded) {
      send({
        type: 'get_game_config',
        payload: {
          gameMode: 'box_hit',
          timeframe: selectedTimeframe,
        },
      });

      const handleGameConfig = (msg: any) => {
        if (msg.type === 'game_config' && msg.payload) {
          const { config } = msg.payload;
          setPriceStep(config.priceStep);
          setTimeStep(config.timeStep);
          setBasePrice(config.basePrice);

          // Use centralized timeframe config for dimensions
          const tfConfig = getTimeframeConfig(selectedTimeframe);
          setNumYsquares(
            tfConfig.ironCondor.rowsAbove + tfConfig.ironCondor.rowsBelow
          );
          setNumXsquares(tfConfig.ironCondor.numColumns);

          setConfigLoaded(true);
        }
      };

      on('game_config', handleGameConfig);

      return () => {
        off('game_config', handleGameConfig);
      };
    }
  }, [isConnected, configLoaded, selectedTimeframe, send, on, off]);

  // Handle price updates
  useEffect(() => {
    if (isConnected) {
      const handlePriceUpdate = (msg: any) => {
        if (msg.payload && typeof msg.payload.price === 'number') {
          setCurrentPrice(msg.payload.price);

          // Update canvas game with new price
          if (gameRef.current) {
            gameRef.current.addPriceData({
              price: msg.payload.price,
              timestamp: Date.now(),
            });
            // Increment data point count to stay in sync with GridGame
            setDataPointCount((prev) => prev + 1);
          }
        }
      };

      on('price_update', handlePriceUpdate);

      return () => {
        off('price_update', handlePriceUpdate);
      };
    }
  }, [isConnected, on, off]);

  // Track data point count for accurate world coordinate calculation
  const [dataPointCount, setDataPointCount] = useState(0);

  // Convert contracts to canvas format with accurate coordinate mapping
  const canvasMultipliers = useMemo(() => {
    const multipliers: Record<string, any> = {};

    // If no contracts, generate empty boxes to fill the screen
    if (!contracts.length && configLoaded) {
      const currentTimeMs = Date.now();
      const pixelsPerPoint = 5;
      const msPerDataPoint = 100;

      // Calculate visible area
      const visibleColumns = numXsquares || 50; // Use config or default
      const visibleRows = numYsquares || 30;

      // Generate empty boxes
      for (let col = 0; col < visibleColumns; col++) {
        for (let row = 0; row < visibleRows; row++) {
          const boxId = `empty_${col}_${row}`;

          // Calculate time for this column
          const timeOffset = col * timeStep;
          const boxStartTime = currentTimeMs + timeOffset;
          const boxEndTime = boxStartTime + timeStep;

          // Calculate price for this row
          const maxPrice = basePrice + (visibleRows * priceStep) / 2;
          const boxLowerPrice = maxPrice - (row + 1) * priceStep;
          const boxUpperPrice = boxLowerPrice + priceStep;

          // Calculate world coordinates
          const dataPointsUntilStart = Math.floor(timeOffset / msPerDataPoint);
          const currentWorldX =
            Math.max(0, dataPointCount - 1) * pixelsPerPoint;
          const worldX = currentWorldX + dataPointsUntilStart * pixelsPerPoint;
          const worldY = boxLowerPrice;

          // Width and height
          const dataPointsPerTimeStep = Math.floor(timeStep / msPerDataPoint);
          const width = dataPointsPerTimeStep * pixelsPerPoint;
          const height = priceStep;

          multipliers[boxId] = {
            value: 0, // Empty box
            x: col,
            y: row,
            worldX: worldX,
            worldY: worldY,
            width: width,
            height: height,
            totalBets: 0,
            userBet: 0,
            timestampRange: {
              start: boxStartTime,
              end: boxEndTime,
            },
            priceRange: {
              min: boxLowerPrice,
              max: boxUpperPrice,
            },
            isEmpty: true, // Mark as empty box
            isClickable: false, // Empty boxes aren't clickable
          };
        }
      }

      return multipliers;
    }

    if (!contracts.length) return multipliers;

    const currentTimeMs = Date.now();
    const pixelsPerPoint = 5; // From GridGame default config
    const msPerDataPoint = 100; // Each data point represents 100ms

    // Include all contracts (active and recently expired) for visualization
    const visibleContracts = contracts.filter((contract) => {
      if (contract.type && contract.type !== 'IRON_CONDOR') return false;

      // Show contracts that are either:
      // 1. Active (not started yet)
      // 2. Recently ended (within configured columnsBehind)
      const tfConfig = getTimeframeConfig(selectedTimeframe);
      const bufferTime = timeStep * tfConfig.ironCondor.columnsBehind;

      if (contract.isActive && contract.startTime > currentTimeMs) {
        return true; // Future active contracts
      }

      if (contract.endTime > currentTimeMs - bufferTime) {
        return true; // Recently ended contracts
      }

      return false;
    });

    visibleContracts.forEach((contract) => {
      // Calculate grid position based on time
      const timeUntilStart = contract.startTime - currentTimeMs;
      const col = Math.floor(timeUntilStart / timeStep);

      // For past contracts, use negative time
      const timeSinceEnd = currentTimeMs - contract.endTime;

      // Skip very old contracts (beyond columnsBehind config)
      const tfConfig = getTimeframeConfig(selectedTimeframe);
      if (timeSinceEnd > timeStep * tfConfig.ironCondor.columnsBehind) {
        return;
      }

      // Also skip contracts that are too far in the future (more than numXsquares columns)
      if (col >= numXsquares) {
        return;
      }

      // Calculate row based on price
      const priceCenter = (contract.lowerStrike + contract.upperStrike) / 2;
      const maxPrice = basePrice + (numYsquares * priceStep) / 2;
      const row = Math.floor((maxPrice - priceCenter) / priceStep);

      // Calculate world coordinates
      // GridGame internally tracks totalDataPoints and calculates current position as:
      // currentWorldX = (totalDataPoints - 1) * pixelsPerPoint
      // We need to match this calculation

      // Calculate how many data points from start this contract begins
      // Each data point represents 100ms
      const dataPointsUntilStart = Math.floor(timeUntilStart / msPerDataPoint);

      // World X should be: current position + offset into future
      // dataPointCount represents GridGame's totalDataPoints
      const currentWorldX = Math.max(0, dataPointCount - 1) * pixelsPerPoint;
      const worldX = currentWorldX + dataPointsUntilStart * pixelsPerPoint;

      // World Y is the actual price value (lower strike is the bottom of the box)
      const worldY = contract.lowerStrike;

      // Width is time step converted to world units
      const dataPointsPerTimeStep = Math.floor(timeStep / msPerDataPoint);
      const width = dataPointsPerTimeStep * pixelsPerPoint;

      // Height is the price range
      const height = contract.upperStrike - contract.lowerStrike;

      multipliers[contract.contractId] = {
        value: contract.returnMultiplier,
        x: col,
        y: row,
        worldX: worldX,
        worldY: worldY,
        width: width,
        height: height,
        totalBets: contract.totalVolume,
        userBet: positions.has(contract.contractId)
          ? positions.get(contract.contractId).amount
          : 0,
        timestampRange: {
          start: contract.startTime,
          end: contract.endTime,
        },
        priceRange: {
          min: contract.lowerStrike,
          max: contract.upperStrike,
        },
        status:
          contract.endTime < currentTimeMs
            ? 'passed'
            : !contract.isActive
              ? 'expired'
              : undefined,
        isClickable: contract.isActive && contract.startTime > currentTimeMs, // Only future active contracts are clickable
      };
    });

    return multipliers;
  }, [
    contracts,
    positions,
    numXsquares,
    numYsquares,
    basePrice,
    priceStep,
    timeStep,
    dataPointCount,
  ]);

  // Update canvas game with new multipliers
  useEffect(() => {
    if (gameRef.current) {
      // Always update, even with empty object to clear old boxes
      gameRef.current.updateMultipliers(canvasMultipliers);
    }
  }, [canvasMultipliers]);

  // Initialize canvas game
  useEffect(() => {
    if (!canvasContainerRef.current || !isStarted || !configLoaded) {
      // Clean up if conditions are not met
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
      return;
    }

    // Only create new game if one doesn't exist
    if (!gameRef.current) {
      // Create new game instance
      const game = new GridGame(canvasContainerRef.current, {
        gameType: GameType.GRID,
        externalDataSource: true, // We'll provide price data from WebSocket
        multipliers: [],
        showMultiplierOverlay: true,
        showDashedGrid: false,
        debugMode: false, // Disable debug mode - only show multipliers, no price ranges
        pricePerPixel: 0.8, // Use default from GridGame - this affects Y axis range
        pixelsPerPoint: 5,
        verticalMarginRatio: 0.1,
        cameraOffsetRatio: 0.2,
        smoothingFactorX: 0.95,
        smoothingFactorY: 0.92,
        lineEndSmoothing: 0.88,
        animationDuration: 300,
        maxDataPoints: 500,
      });

      // Set up event listeners
      game.on(
        'cameraFollowingChanged',
        ({ isFollowing }: { isFollowing: boolean }) => {
          setIsFollowingPrice(isFollowing);
        }
      );

      game.on('squareSelected', ({ squareId }: { squareId: string }) => {
        console.log('Square selected (double-clicked):', squareId);

        // Find the contract details to understand column mapping
        const contract = contractsRef.current.find(
          (c) => c.contractId === squareId
        );
        if (contract) {
          const currentTimeMs = Date.now();
          const timeUntilStart = contract.startTime - currentTimeMs;
          const col = Math.floor(timeUntilStart / timeStep);

          console.log('Contract details on click:', {
            contractId: squareId,
            startTime: new Date(contract.startTime).toISOString(),
            endTime: new Date(contract.endTime).toISOString(),
            timeUntilStart: timeUntilStart,
            timeUntilStartSeconds: (timeUntilStart / 1000).toFixed(2),
            calculatedColumn: col,
            columnExact: timeUntilStart / timeStep,
            timeStep: timeStep,
            lowerStrike: contract.lowerStrike,
            upperStrike: contract.upperStrike,
          });
        } else {
          console.log('Contract not found in contractsRef.current:', {
            contractId: squareId,
            contractsLength: contractsRef.current.length,
          });
        }

        // Handle trade placement using refs to avoid stale closure
        if (isJoinedRef.current && handleTradePlaceRef.current) {
          console.log('Placing trade for contract:', squareId, 'amount: 100');
          handleTradePlaceRef.current(squareId, 100);
        } else {
          console.log('Cannot place trade - not joined or handler not ready');
        }
      });

      gameRef.current = game;
      game.startWithExternalData();

      // Reset data point count
      setDataPointCount(0);

      // Initialize with base price from config to match the test UI
      const initialPrice = currentPrice || basePrice;

      console.log(
        'Initializing game with basePrice:',
        basePrice,
        'currentPrice:',
        currentPrice,
        'priceStep:',
        priceStep
      );

      // Don't add initial data points - let the price updates handle it
      // This ensures dataPointCount stays in sync with GridGame's totalDataPoints
      setDataPointCount(1); // Start with 1 to match GridGame's initial state

      // Ensure camera starts following price
      setIsFollowingPrice(true);

      // If we already have contracts, update the game with them
      if (contracts.length > 0) {
        // Force recalculation by setting a dummy state
        setDataPointCount((prev) => prev + 1);
      }
    }

    // Cleanup function
    return () => {
      // Don't destroy on every re-render, only on unmount
    };
  }, [isStarted, configLoaded]); // Only re-create when starting/stopping or config changes

  // Separate cleanup effect for unmount
  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
      if (priceUpdateIntervalRef.current) {
        clearInterval(priceUpdateIntervalRef.current);
        priceUpdateIntervalRef.current = null;
      }
    };
  }, []);

  const handleStart = async () => {
    try {
      await connect();
      if (!externalControl) {
        setIsStarted(true);
      }
    } catch (error) {
      console.error('Failed to connect to server:', error);
      alert(
        'Failed to connect to server. Please ensure the backend is running.'
      );
    }
  };

  const handleStop = () => {
    if (!externalControl) {
      setIsStarted(false);
    }
    setConfigLoaded(false);
    setDataPointCount(0);
    setIsFollowingPrice(true); // Reset to following when stopping
    if (isConnected) {
      disconnect();
    }
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }
  };
  
  // Handle external timeframe changes - reset game when timeframe changes
  useEffect(() => {
    if (!externalControl || !externalTimeframe) return;
    
    // Reset game state when timeframe changes externally
    setConfigLoaded(false);
    setDataPointCount(0);
    setIsFollowingPrice(true);
    
    // Destroy existing game
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }
  }, [externalTimeframe, externalControl]);
  
  // Handle external control - start/stop based on external state
  useEffect(() => {
    if (!externalControl) return;
    
    if (externalIsStarted && !isConnected && !isConnecting) {
      // Start requested from external control
      handleStart();
    } else if (!externalIsStarted && isConnected) {
      // Stop requested from external control
      handleStop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalControl, externalIsStarted, isConnected, isConnecting]);

  const handleResetCamera = () => {
    if (gameRef.current) {
      gameRef.current.resetCameraToFollowPrice();
      setIsFollowingPrice(true);
    }
  };

  const handleTimeframeChange = (newTimeframe: TimeFrame) => {
    setSelectedTimeframe(newTimeframe);
    setConfigLoaded(false);
    setDataPointCount(0);
    setIsFollowingPrice(true); // Reset to following when changing timeframe
    // Destroy existing game when changing timeframe
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }
  };

  return (
    <div 
      className="flex h-full w-full" 
      style={{ backgroundColor: '#0E0E0E', position: 'relative', overflow: 'hidden' }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className="flex h-full w-full flex-col">
        {/* Header - hidden when externally controlled */}
        {!externalControl && (
          <div className="flex h-16 w-full flex-shrink-0 items-center justify-between border-b border-gray-600 px-4">
          <div className="flex items-center space-x-8">
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">Price:</span>
              <span className="ml-2 text-lg font-semibold text-white">
                ${currentPrice.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">Time:</span>
              <span className="ml-2 text-lg font-semibold text-white">
                {currentTime.toLocaleTimeString('en-US', { hour12: false })}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">Balance:</span>
              <span className="ml-2 text-lg font-semibold text-white">
                ${(userBalance || 0).toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">Active Positions:</span>
              <span className="ml-2 text-lg font-semibold text-white">
                {positions.size}
              </span>
            </div>
            {/* Camera Status */}
            {isStarted && (
              <div className="text-sm text-gray-400">
                <span className="text-gray-500">Camera:</span>
                <span
                  className={`ml-2 text-sm font-medium ${
                    isFollowingPrice ? 'text-green-400' : 'text-yellow-400'
                  }`}
                >
                  {isFollowingPrice ? 'Following Price' : 'Manual'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Camera Reset Button - only show when started and not following */}
            {isStarted && !isFollowingPrice && (
              <button
                onClick={handleResetCamera}
                className="flex items-center space-x-2 rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                title="Reset camera to follow price"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span>Follow Price</span>
              </button>
            )}

            {/* Start/Stop buttons */}
            {!isStarted ? (
              <button
                onClick={handleStart}
                disabled={isConnecting}
                className="rounded bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Start'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleStop}
                  className="rounded bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                >
                  Stop
                </button>
                <span
                  className={`text-xs ${
                    isConnected ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isConnected ? '● Connected' : '● Disconnected'}
                </span>
              </>
            )}

            {/* Timeframe selector */}
            <TimeframeSelector
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={handleTimeframeChange}
              gameType="iron_condor"
            />
          </div>
        </div>
        )}

        {/* Canvas Container */}
        <div className="relative flex-1">
          {/* Notifications */}
          <div className="absolute right-4 top-4 z-10 space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded px-4 py-2 shadow-lg transition-all duration-300 ${
                  notification.type === 'success'
                    ? 'bg-green-600 text-white'
                    : notification.type === 'error'
                      ? 'bg-red-600 text-white'
                      : 'bg-blue-600 text-white'
                }`}
              >
                {notification.message}
              </div>
            ))}
          </div>
          {isStarted ? (
            !configLoaded ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="text-zinc-400 text-sm">Loading game configuration...</div>
                  <div className="text-zinc-600 text-xs mt-2">
                    <div>isConnected: {isConnected ? 'true' : 'false'}</div>
                    <div>timeframe: {selectedTimeframe}ms</div>
                    <div>Waiting for game_config message...</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative h-full w-full">
                <div
                  ref={canvasContainerRef}
                  className="h-full w-full"
                  style={{ backgroundColor: '#0E0E0E' }}
                />
                
                {/* Live/Manual Status Indicator with Recenter Button - Top Right (matching BoxHitCanvas) */}
                <div className="absolute top-3 right-3 flex items-center gap-2" style={{ zIndex: 50 }}>
                  {/* Recenter Button - Only show when in manual mode */}
                  {!isFollowingPrice && (
                    <button
                      onClick={handleResetCamera}
                      className="px-2 py-1 rounded text-xs font-medium flex items-center transition-colors cursor-pointer"
                      style={{
                        backgroundColor: '#1E3A8A',
                        color: '#60A5FA',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        height: '24px'
                      }}
                      title="Manual view - click to center on current time"
                    >
                      Recenter
                    </button>
                  )}

                  {/* Status Indicator */}
                  <div className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1" style={{ 
                    backgroundColor: isFollowingPrice ? '#0E2923' : '#2A1A0E', 
                    color: isFollowingPrice ? '#10AE80' : '#F7931A' 
                  }}>
                    <div className="w-3 h-3 rounded-full" style={{ 
                      backgroundColor: isFollowingPrice ? '#10AE80' : '#F7931A', 
                      border: `2px solid ${isFollowingPrice ? '#134335' : '#4A2F1A'}` 
                    }}></div>
                    {isFollowingPrice ? "Live" : "Manual"}
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h2 className="mb-4 text-2xl font-semibold text-gray-300">
                  TradeRush - Canvas Edition
                </h2>
                <p className="mb-6 text-gray-400">
                  Click Start to begin trading
                </p>
                <div className="space-y-2 text-sm text-gray-500">
                  <p>
                    • Canvas implementation with accurate coordinate mapping
                  </p>
                  <p>
                    • Drag to pan the view and explore different price/time
                    areas
                  </p>
                  <p>
                    • Camera follows price by default, use "Follow Price" to
                    reset
                  </p>
                  <p>• Double-click boxes to place trades</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
