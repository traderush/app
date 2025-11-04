import { useUserStore } from '@/shared/state';
import React, { useMemo } from 'react'

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
            }));
    }, [tradeHistory]);
    
    return (
        <div className='flex w-full items-center'>
           {
            recentPositions.map((position, index) => (
                <div key={index} style={{backgroundColor: position.hit === 'Win' ? '#101212' : '#130E11'}} className='flex-1 text-center p-5'>
                    <p style={{color: position.hit === 'Win' ? '#04C68AB2' : '#DD4141B2'}} className='text-xs'>${position.size.toFixed(2)}</p>
                </div>
            ))
           }
        </div>
    )
}
