'use client';

import React, { useMemo } from 'react';
import { useGameStore } from '@/stores';

const GameStats = React.memo(() => {
  const { gameStats } = useGameStore();

  // Memoized computed values
  const winRate = useMemo(() => {
    if (gameStats.totalBets === 0) return 0;
    return (gameStats.totalWins / gameStats.totalBets) * 100;
  }, [gameStats.totalWins, gameStats.totalBets]);

  const netProfit = useMemo(() => {
    return gameStats.totalWinnings - gameStats.totalLossesAmount;
  }, [gameStats.totalWinnings, gameStats.totalLossesAmount]);

  const profitColor = useMemo(() => {
    return netProfit >= 0 ? 'text-green-400' : 'text-red-400';
  }, [netProfit]);

  const streakColor = useMemo(() => {
    return gameStats.currentStreak >= 0 ? 'text-green-400' : 'text-red-400';
  }, [gameStats.currentStreak]);

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-4">
      <div className="text-sm font-medium text-zinc-300">Game Statistics</div>
      
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-xs text-zinc-400">Total Bets</div>
          <div className="text-lg font-bold text-white">{gameStats.totalBets}</div>
        </div>
        
        <div className="space-y-1">
          <div className="text-xs text-zinc-400">Win Rate</div>
          <div className="text-lg font-bold text-white">{winRate.toFixed(1)}%</div>
        </div>
        
        <div className="space-y-1">
          <div className="text-xs text-zinc-400">Total Wins</div>
          <div className="text-lg font-bold text-green-400">{gameStats.totalWins}</div>
        </div>
        
        <div className="space-y-1">
          <div className="text-xs text-zinc-400">Total Losses</div>
          <div className="text-lg font-bold text-red-400">{gameStats.totalLosses}</div>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="space-y-3">
        <div className="text-xs text-zinc-400">Financial Performance</div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Total Winnings</div>
            <div className="text-sm font-medium text-green-400">
              ${gameStats.totalWinnings.toLocaleString()}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Total Losses</div>
            <div className="text-sm font-medium text-red-400">
              ${gameStats.totalLossesAmount.toLocaleString()}
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="text-xs text-zinc-400">Net Profit</div>
          <div className={`text-lg font-bold ${profitColor}`}>
            ${netProfit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Streak Stats */}
      <div className="space-y-3">
        <div className="text-xs text-zinc-400">Streak Performance</div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Current Streak</div>
            <div className={`text-sm font-medium ${streakColor}`}>
              {gameStats.currentStreak >= 0 ? '+' : ''}{gameStats.currentStreak}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Best Win Streak</div>
            <div className="text-sm font-medium text-green-400">
              {gameStats.longestWinStreak}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-zinc-400">Worst Loss Streak</div>
            <div className="text-sm font-medium text-red-400">
              {gameStats.longestLossStreak}
            </div>
          </div>
        </div>
      </div>

      {/* Best Multiplier */}
      <div className="space-y-1">
        <div className="text-xs text-zinc-400">Best Multiplier</div>
        <div className="text-lg font-bold text-orange-400">
          {gameStats.bestMultiplier.toFixed(2)}x
        </div>
      </div>
    </div>
  );
});

GameStats.displayName = 'GameStats';

export default GameStats;
