'use client';

import React from 'react';
import CustomSlider from '@/components/CustomSlider';

interface GameSettingsProps {
  minMultiplier: number;
  onMinMultiplierChange: (value: number) => void;
  showOtherPlayers: boolean;
  onShowOtherPlayersChange: (value: boolean) => void;
  showProbabilities: boolean;
  onShowProbabilitiesChange: (value: boolean) => void;
  zoomLevel: number;
  onZoomLevelChange: (value: number) => void;
  signatureColor: string;
}

const GameSettings = React.memo(function GameSettings({
  minMultiplier,
  onMinMultiplierChange,
  showOtherPlayers,
  onShowOtherPlayersChange,
  showProbabilities,
  onShowProbabilitiesChange,
  zoomLevel,
  onZoomLevelChange,
  signatureColor
}: GameSettingsProps) {
  return (
    <div className="space-y-4 p-4 bg-zinc-900/60 rounded-lg border border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-200 mb-4">Game Settings</h3>
      
      {/* Minimum Multiplier Slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Minimum Multiplier: {minMultiplier.toFixed(1)}x
        </label>
        <CustomSlider
          value={[minMultiplier]}
          onValueChange={(values) => onMinMultiplierChange(values[0])}
          min={1.0}
          max={5.0}
          step={0.1}
          className="w-full"
        />
        <div className="text-xs text-zinc-400">
          Only show boxes with multipliers above this value
        </div>
      </div>

      {/* Zoom Level Slider */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Zoom Level: {zoomLevel.toFixed(1)}x
        </label>
        <CustomSlider
          value={[zoomLevel]}
          onValueChange={(values) => onZoomLevelChange(values[0])}
          min={0.5}
          max={2.0}
          step={0.1}
          className="w-full"
        />
        <div className="text-xs text-zinc-400">
          Adjust the zoom level of the game canvas
        </div>
      </div>

      {/* Toggle Switches */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">
            Show Other Players
          </label>
          <button
            onClick={() => onShowOtherPlayersChange(!showOtherPlayers)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showOtherPlayers ? 'bg-blue-600' : 'bg-zinc-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showOtherPlayers ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">
            Show Probabilities
          </label>
          <button
            onClick={() => onShowProbabilitiesChange(!showProbabilities)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showProbabilities ? 'bg-blue-600' : 'bg-zinc-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showProbabilities ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Signature Color Display */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Signature Color
        </label>
        <div className="flex items-center space-x-3">
          <div 
            className="w-8 h-8 rounded border border-zinc-600"
            style={{ backgroundColor: signatureColor }}
          />
          <span className="text-sm text-zinc-400 font-mono">
            {signatureColor}
          </span>
        </div>
      </div>
    </div>
  );
});

export default GameSettings;
