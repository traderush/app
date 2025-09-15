'use client';

import { getAllTimeframes, getTimeframeConfig, TimeFrame } from '@/types/timeframe';

interface TimeframeSelectorProps {
  selectedTimeframe: TimeFrame;
  onTimeframeChange: (timeframe: TimeFrame) => void;
  gameType: 'iron_condor' | 'spread';
}

export function TimeframeSelector({ 
  selectedTimeframe, 
  onTimeframeChange,
  gameType 
}: TimeframeSelectorProps) {
  const timeframes = getAllTimeframes();
  
  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-500">Timeframe:</span>
      {timeframes.map((timeframe) => {
        const config = getTimeframeConfig(timeframe);
        const isSelected = selectedTimeframe === timeframe;
        
        return (
          <button
            key={timeframe}
            onClick={() => onTimeframeChange(timeframe)}
            className={`border px-3 py-1 text-xs transition-colors ${
              isSelected
                ? 'border-green-600 bg-green-600/20 text-green-400'
                : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}
          >
            {config.shortName}
          </button>
        );
      })}
    </div>
  );
}