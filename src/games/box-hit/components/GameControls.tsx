'use client';

import React, { useCallback, useMemo } from 'react';
import { useGameStore } from '@/stores';
import { useSignatureColor } from '@/contexts/SignatureColorContext';

interface GameControlsProps {
  isTradingMode: boolean;
  onTradingModeChange: (tradingMode: boolean) => void;
  selectedCount: number;
  bestMultiplier: number;
  selectedMultipliers: number[];
  currentBTCPrice: number;
  averagePositionPrice: number | null;
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
}

const GameControls = React.memo<GameControlsProps>(({
  isTradingMode,
  onTradingModeChange,
  selectedCount,
  bestMultiplier,
  selectedMultipliers,
  currentBTCPrice,
  averagePositionPrice,
  betAmount,
  onBetAmountChange
}) => {
  const { signatureColor } = useSignatureColor();
  const { gameSettings, updateGameSettings } = useGameStore();

  // Memoized computed values
  const totalPotentialPayout = useMemo(() => {
    return selectedCount > 0 && betAmount > 0 && selectedMultipliers.length > 0
      ? Math.round(betAmount * selectedMultipliers.reduce((sum, mult) => sum + mult, 0))
      : 0;
  }, [selectedCount, betAmount, selectedMultipliers]);

  const payoutPerDollar = useMemo(() => {
    return selectedCount > 0 && betAmount > 0 && selectedMultipliers.length > 0
      ? `$${(selectedMultipliers.reduce((sum, mult) => sum + mult, 0)).toFixed(2)}`
      : '$0.00';
  }, [selectedCount, betAmount, selectedMultipliers]);

  const averagePriceDisplay = useMemo(() => {
    if (selectedCount > 0) {
      return averagePositionPrice ? `~$${Math.round(averagePositionPrice).toLocaleString()}` : 'Calculating...';
    }
    return currentBTCPrice ? `$${currentBTCPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}` : 'Loading...';
  }, [selectedCount, averagePositionPrice, currentBTCPrice]);

  // Memoized callbacks
  const handleTradingModeToggle = useCallback(() => {
    onTradingModeChange(!isTradingMode);
  }, [isTradingMode, onTradingModeChange]);

  const handleBetAmountClick = useCallback((amount: number) => {
    onBetAmountChange(amount);
  }, [onBetAmountChange]);

  const handleCustomBetAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    onBetAmountChange(value);
  }, [onBetAmountChange]);

  const quickBetAmounts = useMemo(() => [10, 50, 100, 250], []);

  return (
    <div className="space-y-4">
      {/* Trading Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-300">Trading Mode</span>
        <button
          onClick={handleTradingModeToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isTradingMode ? 'bg-orange-500' : 'bg-zinc-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isTradingMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Bet Amount Controls */}
      <div className="space-y-3">
        <div className="text-sm text-zinc-300">Bet Amount</div>
        
        {/* Quick Bet Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {quickBetAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => handleBetAmountClick(amount)}
              className={`px-3 py-2 text-xs rounded-md transition-colors ${
                betAmount === amount
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
              }`}
            >
              ${amount}
            </button>
          ))}
        </div>

        {/* Custom Bet Input */}
        <div className="relative">
          <input
            type="number"
            value={betAmount}
            onChange={handleCustomBetAmount}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white text-sm focus:outline-none focus:border-orange-500"
            placeholder="Custom amount"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Potential Payout Display */}
      <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
        <div className="text-xs text-zinc-400">Potential Payout</div>
        <div className="text-2xl font-bold" style={{ color: signatureColor }}>
          ${totalPotentialPayout.toLocaleString()}
        </div>
        <div className="text-xs text-zinc-400">
          Payout per $1: <span className="text-white">{payoutPerDollar}</span>
        </div>
      </div>

      {/* Average Position Price */}
      <div className="bg-zinc-800/50 rounded-lg p-4">
        <div className="text-xs text-zinc-400">Avg Position Price</div>
        <div className="text-lg font-medium text-white">
          {averagePriceDisplay}
        </div>
      </div>

      {/* Game Settings */}
      <div className="space-y-3">
        <div className="text-sm text-zinc-300">Game Settings</div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Sound Effects</span>
          <button
            onClick={() => updateGameSettings({ soundEnabled: !gameSettings.soundEnabled })}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              gameSettings.soundEnabled ? 'bg-orange-500' : 'bg-zinc-600'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                gameSettings.soundEnabled ? 'translate-x-3' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-400">Show Other Players</span>
          <button
            onClick={() => updateGameSettings({ showOtherPlayers: !gameSettings.showOtherPlayers })}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              gameSettings.showOtherPlayers ? 'bg-orange-500' : 'bg-zinc-600'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                gameSettings.showOtherPlayers ? 'translate-x-3' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
});

GameControls.displayName = 'GameControls';

export default GameControls;
