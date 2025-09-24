'use client';
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useGameStore } from '@/stores/gameStore';

export default function BetPanel({ game }: { game: string }) {
  const { gameSettings, updateGameSettings } = useGameStore();
  return (
    <Card className="bg-zinc-900/60 border-zinc-800">
      <CardContent className="p-4 space-y-4 text-zinc-200">
        <div className="text-sm uppercase tracking-wide text-zinc-400">{game}</div>
        <div className="text-lg font-semibold">Bet amount: {gameSettings.betAmount} USDC</div>
        <Slider 
          value={[gameSettings.betAmount]} 
          min={10} 
          max={1000} 
          step={10} 
          onValueChange={(v) => updateGameSettings({ betAmount: v[0] })} 
        />
        <div className="text-sm text-zinc-400">UI only for now; wire payouts later.</div>
      </CardContent>
    </Card>
  );
}


