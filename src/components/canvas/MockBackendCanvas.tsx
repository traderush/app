'use client';

import { TimeFrame, getTimeframeConfig } from '@/types/timeframe';
import { useEffect, useRef, useState } from 'react';
import { GridGame } from '../../lib/canvasLogic/games/GridGame';
import { useGameSession } from './hooks/useGameSession';
import { useWebSocket } from './hooks/useWebSocket';

/**
 * MockBackendCanvas - Stripped down version of Canvas for integration into box-hit page
 * Only renders the canvas without the header/controls UI
 */
export default function MockBackendCanvas({ timeframe = 2000 }: { timeframe?: number }) {
  const [configLoaded, setConfigLoaded] = useState(false);
  const [numYsquares, setNumYsquares] = useState(20);
  const [numXsquares, setNumXsquares] = useState(25);
  const [basePrice, setBasePrice] = useState(100);
  const [priceStep, setPriceStep] = useState(0.1);
  const [timeStep, setTimeStep] = useState(timeframe);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>(
    timeframe === 500 ? TimeFrame.HALF_SECOND :
    timeframe === 1000 ? TimeFrame.ONE_SECOND :
    timeframe === 2000 ? TimeFrame.TWO_SECONDS :
    timeframe === 4000 ? TimeFrame.FOUR_SECONDS :
    TimeFrame.TEN_SECONDS
  );
  const [currentPrice, setCurrentPrice] = useState(
    basePrice + priceStep * numYsquares * 0.5
  );
  const [dataPointCount, setDataPointCount] = useState(0);
  const [isFollowingPrice, setIsFollowingPrice] = useState(true);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GridGame | null>(null);
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

  // Keep refs updated
  useEffect(() => {
    handleTradePlaceRef.current = handleTradePlace;
    isJoinedRef.current = isJoined;
    contractsRef.current = contracts;
  }, [handleTradePlace, isJoined, contracts]);

  // Handle contract resolution
  useEffect(() => {
    if (!isConnected) return;

    const handleContractResolved = (msg: any) => {
      if (msg.payload && gameRef.current) {
        const { contractId, outcome } = msg.payload;
        if (outcome === 'hit') {
          gameRef.current.markContractAsHit(contractId);
        }
      }
    };

    on('contract_resolved', handleContractResolved);
    return () => off('contract_resolved', handleContractResolved);
  }, [isConnected, on, off]);

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

          const tfConfig = getTimeframeConfig(selectedTimeframe);
          setNumYsquares(
            tfConfig.ironCondor.rowsAbove + tfConfig.ironCondor.rowsBelow
          );
          setNumXsquares(tfConfig.ironCondor.numColumns);

          setConfigLoaded(true);
        }
      };

      on('game_config', handleGameConfig);
      return () => off('game_config', handleGameConfig);
    }
  }, [isConnected, configLoaded, selectedTimeframe, send, on, off]);

  // Handle price updates
  useEffect(() => {
    if (isConnected) {
      const handlePriceUpdate = (msg: any) => {
        if (msg.payload && typeof msg.payload.price === 'number') {
          setCurrentPrice(msg.payload.price);

          if (gameRef.current) {
            gameRef.current.addPriceData({
              price: msg.payload.price,
              timestamp: Date.now(),
            });
            setDataPointCount((prev) => prev + 1);
          }
        }
      };

      on('price_update', handlePriceUpdate);
      return () => off('price_update', handlePriceUpdate);
    }
  }, [isConnected, on, off]);

  // Auto-start when component mounts
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      connect();
    }
  }, [isConnected, isConnecting, connect]);

  // Initialize GridGame when config is loaded
  useEffect(() => {
    if (configLoaded && canvasContainerRef.current && !gameRef.current) {
      gameRef.current = new GridGame(canvasContainerRef.current, {
        gridSize: { width: numXsquares, height: numYsquares },
        basePrice: basePrice,
        priceStep: priceStep,
        timeStep: timeStep,
        onBoxClick: (box: any) => {
          if (
            handleTradePlaceRef.current &&
            isJoinedRef.current &&
            box.contractId
          ) {
            const contract = contractsRef.current.find(
              (c) => c.contractId === box.contractId
            );
            if (contract && contract.isActive) {
              handleTradePlaceRef.current(box.contractId, 10);
            }
          }
        },
        onCameraMoved: () => {
          setIsFollowingPrice(false);
        },
      });

      gameRef.current.start();
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, [configLoaded, numXsquares, numYsquares, basePrice, priceStep, timeStep]);

  // Update game multipliers when contracts change
  useEffect(() => {
    if (!gameRef.current || !configLoaded) return;

    const multipliers: any = {};
    const currentTimeMs = Date.now();
    const pixelsPerPoint = 5;
    const msPerDataPoint = 100;

    const visibleContracts = contracts.filter((contract) => {
      if (contract.type && contract.type !== 'IRON_CONDOR') return false;
      const tfConfig = getTimeframeConfig(selectedTimeframe);
      const bufferTime = timeStep * tfConfig.ironCondor.columnsBehind;

      if (contract.isActive && contract.startTime > currentTimeMs) {
        return true;
      }

      if (contract.endTime > currentTimeMs - bufferTime) {
        return true;
      }

      return false;
    });

    visibleContracts.forEach((contract) => {
      const timeUntilStart = contract.startTime - currentTimeMs;
      const col = Math.floor(timeUntilStart / timeStep);

      if (col >= numXsquares) return;

      const priceCenter = (contract.lowerStrike + contract.upperStrike) / 2;
      const maxPrice = basePrice + (numYsquares * priceStep) / 2;
      const row = Math.floor((maxPrice - priceCenter) / priceStep);

      const dataPointsUntilStart = Math.floor(timeUntilStart / msPerDataPoint);
      const currentWorldX = Math.max(0, dataPointCount - 1) * pixelsPerPoint;
      const worldX = currentWorldX + dataPointsUntilStart * pixelsPerPoint;
      const worldY = contract.lowerStrike;

      const dataPointsPerTimeStep = Math.floor(timeStep / msPerDataPoint);
      const width = dataPointsPerTimeStep * pixelsPerPoint;
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
        isEmpty: false,
        isClickable: contract.isActive,
      };
    });

    gameRef.current.updateBoxes(multipliers);
  }, [contracts, positions, dataPointCount, configLoaded, selectedTimeframe, numXsquares, numYsquares, basePrice, priceStep, timeStep]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-full w-full">
      {!configLoaded ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="mb-4 text-xl font-semibold text-gray-300">
              {isConnecting ? 'Connecting to Mock Backend...' : 'Loading Configuration...'}
            </h2>
            <p className="text-gray-400">
              {isConnecting ? 'Establishing WebSocket connection' : 'Fetching game settings from server'}
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={canvasContainerRef}
          className="h-full w-full"
          style={{ backgroundColor: '#000' }}
        />
      )}
    </div>
  );
}

