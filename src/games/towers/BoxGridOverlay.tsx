'use client';
import { useMemo, useState, useEffect } from 'react';

const ORANGE = '#FA5616';

type Box = {
  id: string; col: number; row: number;
  xPct: number; yPct: number; wPct: number; hPct: number;
  mult: number;
};

function genBoxes(rows=6, cols=8): Box[] {
  const out: Box[] = [];
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
    const xPct = (c/cols)*100, yPct=(r/rows)*100, wPct=(1/cols)*100, hPct=(1/rows)*100;
    const distFromMid = Math.abs(r - (rows-1)/2)/((rows-1)/2 || 1);
    const timeFactor = (c+1)/cols;
    const mult = Math.round((1.2 + (12-1.2)*(0.65*distFromMid + 0.35*timeFactor))*10)/10;
    out.push({ id:`r${r}c${c}`, col:c, row:r, xPct, yPct, wPct, hPct, mult });
  }
  return out;
}

export default function BoxGridOverlay({
  minX=1.2, onChange,
}: { minX?: number; onChange?: (ids:string[], best:number)=>void }) {
  const boxes = useMemo(()=>genBoxes(),[]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const filtered = boxes.filter(b=>b.mult >= minX);

  useEffect(()=>{
    const ids = [...sel];
    const best = ids.length ? Math.max(...filtered.filter(b=>sel.has(b.id)).map(b=>b.mult)) : 0;
    onChange?.(ids, best);
  },[sel, filtered, onChange]);

  const toggle = (id:string)=> setSel(s=>{ const n=new Set(s); n.has(id)?n.delete(id):n.add(id); return n; });

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="absolute inset-0 w-full h-full z-10">
        {filtered.map(b=>(
          <g key={b.id}>
            {/* cell */}
            <rect x={`${b.xPct}%`} y={`${b.yPct}%`}
              width={`${b.wPct}%`} height={`${b.hPct}%`} rx={8}
              className="transition-opacity duration-150"
              fill={sel.has(b.id) ? 'rgba(250,86,22,0.18)' : 'rgba(39,39,42,0.25)'}
              stroke={sel.has(b.id) ? ORANGE : 'rgba(82,82,91,0.8)'} strokeWidth={2}/>
            {/* label */}
            <text x={`calc(${b.xPct}% + 8)`} y={`calc(${b.yPct}% + 18)`}
              fontSize={12} fill="#e5e5e5">{b.mult.toFixed(1)}x</text>
            {/* click target */}
            <rect x={`${b.xPct}%`} y={`${b.yPct}%`} width={`${b.wPct}%`} height={`${b.hPct}%`} rx={8}
              className="pointer-events-auto cursor-pointer" fill="transparent"
              onClick={()=>toggle(b.id)}/>
          </g>
        ))}
      </svg>

      {/* HUD */}
      <div className="pointer-events-auto absolute left-3 top-3 z-20 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200">
        <span className="mr-3">Selected: {sel.size}</span>
        <span>
          Best: {sel.size ? `${Math.max(...filtered.filter(b=>sel.has(b.id)).map(b=>b.mult))}x` : '—'}
        </span>
      </div>
    </div>
  );
}

