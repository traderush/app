import { useUserStore, useUIStore } from '@/shared/state';
import clsx from 'clsx';
import React, { useMemo, useState } from 'react'

export default function RecentPositions() {
    const tradeHistory = useUserStore((state) => state.tradeHistory);
    const recentPositions = useMemo(() => {
        return tradeHistory
            .filter((trade) => trade.result && trade.settledAt)
            .slice(-10)
            .map((trade) => ({
                id: trade.id,
                size: trade.amount,
                equity: `$${trade.amount.toFixed(2)}`,
                hit: trade.result === 'win' ? 'Win' : 'Loss',
                time: trade.settledAt,
                multiplier: trade.payout ? trade.payout / trade.amount : 0,
            }));
    }, [tradeHistory]);
    
    return (
        <div className='flex w-full items-center'>
            {recentPositions.map((position, index) => <RecentPosition key={index} position={position} />)}
        </div>
    )
}

const RecentPosition = ({ position }: { position: any }) => {
    const [isHovering, setIsHovering] = useState(false);
    const tradingPositiveColor = useUIStore((state) => state.tradingPositiveColor);
    const tradingNegativeColor = useUIStore((state) => state.tradingNegativeColor);
    
    return (
        <div 
            onMouseEnter={() => setIsHovering(true)} 
            onMouseLeave={() => setIsHovering(false)} 
            key={position.id} 
            style={{
                backgroundColor: position.hit === 'Win' 
                    ? `${tradingPositiveColor}0D` 
                    : `${tradingNegativeColor}0D`
            }} 
            className='relative flex-1 text-center p-2 z-30'
        >
            <p className={position.hit === 'Win' ? 'text-xs text-trading-positive' : 'text-xs text-trading-negative'}>${position.size.toFixed(2)}</p>
            {isHovering && <RecentPositionHover position={position} />}
        </div>
    )
}

const RecentPositionHover = ({ position }: { position: any }) => {
    return (
        <div className='flex flex-col absolute bottom-0 -translate-y-[50%] left-1/2 -translate-x-1/2 bg-zinc-950/60 backdrop-blur-sm border border-zinc-800/80 p-2 w-full gap-1'>
            <p className={clsx("text-xs", position.hit === 'Win' ? 'text-trading-positive' : 'text-trading-negative')}>{position.hit}</p>
            <p className='text-xs'>{position.multiplier.toFixed(1)}x</p>
            <RelativeTime time={position.time} />
        </div>
    )
}

const RelativeTime = ({ time }: { time: Date }) => {
    const relativeTime = useMemo(() => {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - new Date(time).getTime()) / 1000);
        
        if (diffInSeconds < 60) {
            return 'just now';
        }
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        }
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        }
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays}d ago`;
        }
        
        const diffInWeeks = Math.floor(diffInDays / 7);
        return `${diffInWeeks}w ago`;
    }, [time]);

    return (
        <p className='text-xs shrink-0 text-neutral-600'>{relativeTime}</p>
    )
}
