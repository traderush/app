'use client';

import { getAllTimeframes, getTimeframeConfig, TimeFrame } from '@/types/timeframe';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const selectedConfig = getTimeframeConfig(selectedTimeframe);
  
  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-500">Timeframe:</span>
      <Select value={selectedTimeframe} onValueChange={onTimeframeChange}>
        <SelectTrigger className="w-fit min-w-[60px] h-8 bg-gray-800 border-gray-600 text-white hover:bg-gray-700 focus:ring-2 focus:ring-green-500/50 focus:border-green-500">
          <SelectValue>
            <span className="text-white font-medium">{selectedConfig.shortName}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          {timeframes.map((timeframe) => {
            const config = getTimeframeConfig(timeframe);
            return (
              <SelectItem 
                key={timeframe} 
                value={timeframe}
                className="text-white hover:bg-gray-700 focus:bg-gray-700"
              >
                {config.shortName}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}