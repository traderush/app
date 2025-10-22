'use client';
import { Slider } from "@/shared/ui/ui/slider";

export default function GameToolbar({
  minX, onMinX,
}: { minX:number; onMinX:(v:number)=>void }) {
  return (
    <div className="mb-3 flex items-center gap-4">
      <div className="flex items-center gap-3">
        <button className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-100">BTC ▾</button>
        <div className="px-2 py-1 rounded-lg border border-zinc-800 bg-zinc-900 text-emerald-400 font-semibold">117,511</div>
        <div className="text-sm text-zinc-400"><span className="mr-3">Last 24h <span className="text-rose-400">-1.41%</span></span>
          <span>Volume 24h <span className="text-zinc-200">63.12M</span></span>
        </div>
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <div className="text-sm text-zinc-400">Min Multiplier:</div>
        <div className="w-36">
          <Slider 
            min={1.2} 
            max={12} 
            step={0.1} 
            value={[minX]}
            onValueChange={(values) => onMinX(values[0])}
            className="w-full"
          />
        </div>
        <div className="w-10 text-right text-sm text-zinc-200">{minX.toFixed(1)}x</div>
        <button className="px-2 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-200">5 min</button>
      </div>
    </div>
  );
}

