import React, { useEffect, useState } from 'react'
import Image from 'next/image';
import clsx from 'clsx';
import { PROFILE_AVATAR } from '@/shared/ui/constants/navigation';
import { usePlayerStore } from '@/shared/state/playerStore';
import { useUIStore } from '@/shared/state';
import type { WatchedPlayer } from '@/shared/state/playerStore';

type ActivityAction = 'won' | 'lost';

interface ActivityEntry {
  id: number;
  player: string;
  walletName: string;
  action: ActivityAction;
  multiplier: string;
  amount: string;
  payout: string;
  time: string;
}

// Generate a random crypto wallet address (0x + hex characters)
function generateWalletAddress(): string {
  const chars = '0123456789abcdef';
  const address = '0x' + Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + 
    '...' + 
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return address;
}

export default function LiveActivity() {
    const setSelectedPlayer = usePlayerStore((state) => state.setSelectedPlayer);
    const setIsPlayerTrackerOpen = usePlayerStore((state) => state.setIsPlayerTrackerOpen);
    const tradingPositiveColor = useUIStore((state) => state.tradingPositiveColor);
    const tradingNegativeColor = useUIStore((state) => state.tradingNegativeColor);
    const [category, setCategory] = useState<'all' | 'top'>('all');
    
    const handlePlayerClick = (activity: ActivityEntry) => {
      const player: WatchedPlayer = {
        id: activity.id.toString(),
        name: activity.player,
        address: activity.walletName,
        avatar: PROFILE_AVATAR,
        game: 'Box Hit',
        isOnline: true,
        lastSeen: Date.now(),
      };
      setSelectedPlayer(player);
      setIsPlayerTrackerOpen(true);
    };
    const [activities, setActivities] = useState<ActivityEntry[]>([
        { id: 1, player: 'satoshi', walletName: '0x3f8a2b1c9d4e5f6a...b7c8', action: 'won', multiplier: '2.5x', amount: '$250', payout: '$625', time: '2s ago' },
        { id: 2, player: 'vitalik', walletName: '0x7e9a4d2b1c3f5e6d...a9b2', action: 'won', multiplier: '1.8x', amount: '$150', payout: '$270', time: '5s ago' },
        { id: 3, player: 'alexander', walletName: '0x2b5c8d1e4f7a3b6c...d8e9', action: 'won', multiplier: '3.0x', amount: '$450', payout: '$1,350', time: '8s ago' },
        { id: 4, player: 'jordan', walletName: '0x9f1a3c5d7e2b4f6a...c1d2', action: 'lost', multiplier: '2.2x', amount: '$100', payout: '$100', time: '12s ago' },
        { id: 5, player: 'maya', walletName: '0x4a6c8e2f1b3d5a7c...e4f5', action: 'lost', multiplier: '2.0x', amount: '$200', payout: '$200', time: '15s ago' },
        { id: 6, player: 'kai', walletName: '0x8d2f4a6c1e3b5d7a...f6a7', action: 'won', multiplier: '1.5x', amount: '$300', payout: '$450', time: '18s ago' },
        { id: 7, player: 'christopher', walletName: '0x1b3d5f7a2c4e6d8a...b3c4', action: 'won', multiplier: '1.8x', amount: '$180', payout: '$324', time: '22s ago' },
        { id: 8, player: 'ryan', walletName: '0x5e7a9c1d3f2b4e6d...c5d6', action: 'lost', multiplier: '2.8x', amount: '$75', payout: '$75', time: '25s ago' },
        { id: 9, player: 'anastasia', walletName: '0x3c6a8e1f4b2d5a7c...e7f8', action: 'lost', multiplier: '2.1x', amount: '$120', payout: '$120', time: '28s ago' },
        { id: 10, player: 'blake', walletName: '0x7b2d4f6a1c3e5d8a...a9b1', action: 'won', multiplier: '1.2x', amount: '$500', payout: '$600', time: '32s ago' },
      ]);
    
      useEffect(() => {
        const interval = setInterval(() => {
          const amount = Math.floor(Math.random() * 500) + 50;
          const multiplier = (Math.random() * 3 + 1).toFixed(1);
          const action: ActivityAction = Math.random() > 0.5 ? 'won' : 'lost';
          const payout =
            action === 'lost'
              ? `$${amount}`
              : `$${Math.floor(amount * Number(multiplier)).toLocaleString()}`;
    
          const playerName = `${Math.random().toString(36).slice(2, 6)}...${Math.random()
            .toString(36)
            .slice(2, 6)}`;
          setActivities((prev) => [
            {
              id: Date.now(),
              player: playerName,
              walletName: generateWalletAddress(),
              action,
              multiplier: `${multiplier}x`,
              amount: `$${amount}`,
              payout,
              time: 'now',
            },
            ...prev.slice(0, 9),
          ]);
        }, 3000 + Math.random() * 2000);
    
        return () => clearInterval(interval);
      }, []);
    
      // Filter activities based on category
      const filteredActivities = category === 'top' 
        ? activities
            .filter((activity) => activity.action === 'won')
            .sort((a, b) => {
              const payoutA = Number.parseFloat(a.payout.replace(/[^0-9.-]+/g, '')) || 0;
              const payoutB = Number.parseFloat(b.payout.replace(/[^0-9.-]+/g, '')) || 0;
              return payoutB - payoutA;
            })
            .slice(0, 5)
        : activities;
    
      return (
        <div className='border border-zinc-800 rounded-md overflow-hidden flex flex-col flex-1 min-h-0' style={{ backgroundColor: '#0D0D0D' }}>
            <div className="p-2 pb-0 flex-shrink-0">
              <div className="mb-2 flex items-center justify-between gap-6 px-2">
                <h3 className="text-sm font-medium text-white">Live Activity</h3>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setCategory('all')}
                    className={clsx(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      category === 'all'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-300'
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('top')}
                    className={clsx(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      category === 'top'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-300'
                    )}
                  >
                    Top
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
                {filteredActivities.map((activity) => {
                const isWin = activity.action === 'won';
                return (
                    <div 
                    style={{ 
                      backgroundColor: isWin 
                        ? `${tradingPositiveColor}0D` 
                        : `${tradingNegativeColor}0D` 
                    }} 
                    key={activity.id}
                    className='grid grid-cols-4 gap-x-3 items-center py-2 px-2 text-xs font-regular'
                    >
                        {/* User image & wallet name */}
                        <div 
                          className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handlePlayerClick(activity)}
                        >
                          <Image
                            src={PROFILE_AVATAR}
                            alt={activity.walletName}
                            width={24}
                            height={24}
                            className="w-6 h-6 rounded-md object-cover"
                          />
                          <p className="text-white truncate">{activity.walletName}</p>
                        </div>
                        
                        {/* Bet amount */}
                        <p className="text-zinc-300 text-center">{activity.amount}</p>
                        
                        {/* Won/loss rectangle */}
                        <div 
                          className="rounded px-2 py-1 text-center text-[10px] font-medium"
                          style={{
                            backgroundColor: isWin ? `${tradingPositiveColor}33` : `${tradingNegativeColor}33`,
                            color: isWin ? tradingPositiveColor : tradingNegativeColor,
                          }}
                        >
                          {isWin ? 'Won' : 'Loss'}
                        </div>
                        
                        {/* Won amount */}
                        <p 
                          className="text-center font-medium"
                          style={{
                            color: isWin ? tradingPositiveColor : tradingNegativeColor,
                          }}
                        >
                          {isWin ? '+' : '-'}{activity.payout}
                        </p>
                    </div>
                );
                })}
            </div>
        </div>
      );
}
