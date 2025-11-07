import React, { useEffect, useState } from 'react'
import { ArrowUp, TrendingDown, TrendingUp, User } from 'lucide-react';
import clsx from 'clsx';

type ActivityAction = 'won' | 'lost';

interface ActivityEntry {
  id: number;
  player: string;
  action: ActivityAction;
  multiplier: string;
  amount: string;
  payout: string;
  time: string;
}

export default function LiveActivity() {
    const [activities, setActivities] = useState<ActivityEntry[]>([
        { id: 1, player: 'satoshi', action: 'won', multiplier: '2.5x', amount: '$250', payout: '$625', time: '2s ago' },
        { id: 2, player: 'vitalik', action: 'won', multiplier: '1.8x', amount: '$150', payout: '$270', time: '5s ago' },
        { id: 3, player: 'alexander', action: 'won', multiplier: '3.0x', amount: '$450', payout: '$1,350', time: '8s ago' },
        { id: 4, player: 'jordan', action: 'lost', multiplier: '2.2x', amount: '$100', payout: '$100', time: '12s ago' },
        { id: 5, player: 'maya', action: 'lost', multiplier: '2.0x', amount: '$200', payout: '$200', time: '15s ago' },
        { id: 6, player: 'kai', action: 'won', multiplier: '1.5x', amount: '$300', payout: '$450', time: '18s ago' },
        { id: 7, player: 'christopher', action: 'won', multiplier: '1.8x', amount: '$180', payout: '$324', time: '22s ago' },
        { id: 8, player: 'ryan', action: 'lost', multiplier: '2.8x', amount: '$75', payout: '$75', time: '25s ago' },
        { id: 9, player: 'anastasia', action: 'lost', multiplier: '2.1x', amount: '$120', payout: '$120', time: '28s ago' },
        { id: 10, player: 'blake', action: 'won', multiplier: '1.2x', amount: '$500', payout: '$600', time: '32s ago' },
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
    
          setActivities((prev) => [
            {
              id: Date.now(),
              player: `${Math.random().toString(36).slice(2, 6)}...${Math.random()
                .toString(36)
                .slice(2, 6)}`,
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
    
      return (
        <div>
            <div className="max-h-80 overflow-y-auto">
                {activities.map((activity) => {
                const isWin = activity.action === 'won';
                return (
                    <div 
                    style={{ backgroundColor: activity.action === 'won' ? '#101212' : '#130E11' }} 
                    key={activity.id}
                    className='grid grid-cols-4 gap-x-2 items-center py-2 px-2 text-xs font-regular'
                    >
                        {isWin ? <TrendingUp size={16} className='text-[#04C68A]' /> : <TrendingDown size={16} className='text-[#DD4141]' />}
                        <p>{activity.amount}</p>
                        <p>@{activity.player}</p>
                        <p className={clsx("text-end", isWin ? 'text-[#04C68A]' : 'text-[#DD4141]')}>{isWin ? '+' : '-'}{activity.payout}</p>
                    </div>
                );
                })}
            </div>
        </div>
      );
}
