'use client';

import { useEffect, useMemo, useState } from 'react';

type ExplorerContract = {
  id: string;
  returnMultiplier: number;
  status: string;
  strikeRange: { lower: number; upper: number };
  exerciseWindow: { start: number; end: number };
  totalVolume: number;
  openInterest: number;
  positions: Array<{
    userId: string;
    totalSize: number;
    fills: Array<{ amount: number; timestamp: number }>;
  }>;
  columnIndex: number;
  anchorPrice: number;
};

type ExplorerSnapshot = {
  timeframe: number;
  price: number;
  timeframeMs: number;
  timeWindowMs: number;
  priceWindow: {
    min: number;
    max: number;
  };
  priceStep: number;
  contracts: ExplorerContract[];
};

type ApiResponse = {
  snapshots: ExplorerSnapshot[];
  generatedAt: number;
};

const REFRESH_INTERVAL_MS = 1500;
const ENV_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') || null;

const TF_LABELS: Record<number, string> = {
  500: '0.5s',
  1000: '1s',
  2000: '2s',
  4000: '4s',
  10000: '10s',
};

const DEFAULT_TIMEFRAMES = [1000, 2000, 10000];

export function ExplorerClient() {
  const [data, setData] = useState<ExplorerSnapshot[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [backendBaseUrl, setBackendBaseUrl] = useState<string | null>(ENV_BACKEND_URL);
  const [error, setError] = useState<string | null>(null);
  const [selectedTf, setSelectedTf] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!backendBaseUrl && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const port = process.env.NEXT_PUBLIC_BACKEND_PORT || '8080';
      url.port = port;
      setBackendBaseUrl(`${url.protocol}//${url.hostname}:${port}`);
      return;
    }

    if (!backendBaseUrl) {
      return;
    }

    const load = async () => {
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/explorer/orderbooks`,
          {
            cache: 'no-store',
            mode: 'cors',
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load orderbooks (${response.status})`);
        }

        const payload: ApiResponse = await response.json();
        if (!cancelled) {
          setData(payload.snapshots);
          setLastUpdated(payload.generatedAt ?? Date.now());
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      }
    };

    void load();
    const interval = setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [backendBaseUrl]);

  const timeframeLabels = useMemo(() => {
    const mapping = new Map<number, string>();
    for (const snapshot of data) {
      const seconds = snapshot.timeframe / 1000;
      mapping.set(
        snapshot.timeframe,
        TF_LABELS[snapshot.timeframe] ?? (seconds >= 1 ? `${seconds.toFixed(1)}s` : `${snapshot.timeframe}ms`)
      );
    }
    return mapping;
  }, [data]);

  const snapshotsByTf = useMemo(() => {
    const map = new Map<number, ExplorerSnapshot>();
    for (const snapshot of data) {
      map.set(snapshot.timeframe, snapshot);
    }
    return map;
  }, [data]);

  useEffect(() => {
    if (!selectedTf && data.length) {
      const tf = data[0]?.timeframe;
      if (tf) {
        setSelectedTf(tf);
      }
    }
  }, [data, selectedTf]);

  const visibleTimeframes = useMemo(() => {
    const tfs = data.map((snapshot) => snapshot.timeframe);
    if (tfs.length) {
      return tfs;
    }
    return DEFAULT_TIMEFRAMES;
  }, [data]);

  const selectedSnapshot = selectedTf ? snapshotsByTf.get(selectedTf) ?? null : null;
  const selectedHorizonColumns =
    selectedSnapshot && selectedSnapshot.timeframeMs > 0
      ? Math.max(1, Math.round(selectedSnapshot.timeWindowMs / selectedSnapshot.timeframeMs))
      : null;

  return (
    <div className="space-y-4 text-zinc-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Orderbook Explorer</h1>
          <p className="text-sm text-neutral-500">
            Live snapshots pulled directly from the clearing house runtime.
          </p>
        </div>
        <div className="text-right text-xs text-neutral-400">
          {lastUpdated
            ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}`
            : backendBaseUrl
            ? 'Loading…'
            : 'Resolving backend…'}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {visibleTimeframes.map((timeframe) => (
          <button
            key={timeframe}
            onClick={() => setSelectedTf(timeframe)}
            className={`rounded-md px-3 py-1 text-sm transition ${
              selectedTf === timeframe
                ? 'bg-zinc-800 text-zinc-100'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800/60'
            }`}
          >
            {timeframeLabels.get(timeframe) ?? `${timeframe}ms`}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-4 shadow">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <h2 className="text-base font-medium">
              {selectedTf
                ? `Timeframe ${timeframeLabels.get(selectedTf) ?? `${selectedTf}ms`}`
                : 'Select timeframe'}
            </h2>
            {selectedSnapshot && selectedHorizonColumns !== null && (
              <div className="text-xs text-neutral-500">
                Horizon: {selectedHorizonColumns} columns · Buckets {selectedSnapshot.contracts.length}
              </div>
            )}
          </div>
          {selectedSnapshot && (
            <span className="text-sm text-neutral-400">
              Price {selectedSnapshot.price.toFixed(2)}
            </span>
          )}
        </div>

        {!selectedSnapshot ? (
          <p className="text-sm text-neutral-500">No data available.</p>
        ) : (
          <OrderbookGrid snapshot={selectedSnapshot} />
        )}
      </div>
    </div>
  );
}

type GridCell = {
  bucketIndex: number;
  columnIndex: number;
  contract?: ExplorerContract;
};

const tooltipStyles =
  'absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-100 shadow-lg border border-zinc-700';

function OrderbookGrid({ snapshot }: { snapshot: ExplorerSnapshot }) {
  const price = snapshot.price;
  const priceStep = snapshot.priceStep;
  const columnCount = Math.max(1, Math.round(snapshot.timeWindowMs / snapshot.timeframeMs));

  const anchorContract =
    snapshot.contracts.find((contract) => contract.columnIndex === 0) || snapshot.contracts[0];
  const anchorPrice = anchorContract?.anchorPrice ?? price;

  const gridRows = buildGrid(
    snapshot.contracts,
    priceStep,
    snapshot.priceWindow,
    columnCount
  );

  const columnHeaders = Array.from({ length: columnCount }, (_, idx) => (
    <div key={idx} className="w-8 text-center text-[10px] text-neutral-500">
      {idx === 0 ? 'now' : `+${idx}`}
    </div>
  ));

  const rowElements = gridRows.map((row) => (
    <div key={row.bucketIndex} className="flex items-center gap-1">
      <div className="w-16 pr-1 text-right text-[10px] text-neutral-500 font-mono">
        {(anchorPrice + row.bucketIndex * priceStep).toFixed(2)}
      </div>
      <div className="flex gap-1">
        {row.cells.map((cell) => {
          const contract = cell.contract;
          const hasOrder = Boolean(contract);
          const isCurrentColumn = cell.columnIndex === 0;
          const bucketMatchesPrice = cell.bucketIndex === 0;

          const baseClass = hasOrder
            ? getOrderColor(contract!.returnMultiplier)
            : 'bg-zinc-900 text-zinc-600';
          const highlightClass = bucketMatchesPrice && isCurrentColumn
            ? 'ring-2 ring-emerald-400 bg-emerald-500 text-zinc-950'
            : '';

          return (
            <div key={`${cell.bucketIndex}:${cell.columnIndex}`} className="relative group">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded text-[10px] font-medium transition ${baseClass} ${highlightClass}`}
              >
                {hasOrder ? contract!.returnMultiplier.toFixed(1) : '--'}
              </div>
              {hasOrder && (
                <div className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100">
                  <div className={tooltipStyles}>
                    <div className="font-mono text-[10px] text-zinc-200">{contract!.id}</div>
                    <div>Range: {contract!.strikeRange.lower.toFixed(2)}–{contract!.strikeRange.upper.toFixed(2)}</div>
                    <div>Multiplier: {contract!.returnMultiplier.toFixed(2)}x</div>
                    <div>Volume: {contract!.totalVolume.toFixed(2)}</div>
                    <div>OI: {contract!.openInterest.toFixed(2)}</div>
                    <div>Expires: {new Date(contract!.exerciseWindow.end).toLocaleTimeString()}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  ));

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-neutral-500">
        <span>Rows (price ± window)</span>
        <span>Columns (time horizon)</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-16" />
        <div className="flex gap-1">{columnHeaders}</div>
      </div>
      <div className="space-y-1">{rowElements}</div>
    </div>
  );
}

function buildGrid(
  contracts: ExplorerContract[],
  priceStep: number,
  priceWindow: { min: number; max: number },
  columnCount: number
): GridRow[] {
  const buckets = new Map<number, Map<number, ExplorerContract>>();
  for (const contract of contracts) {
    const columnIndex = contract.columnIndex ?? 0;
    const bucketIndex = priceStep > 0
      ? Math.round((contract.strikeRange.lower - contract.anchorPrice) / priceStep)
      : 0;
    if (!buckets.has(bucketIndex)) {
      buckets.set(bucketIndex, new Map());
    }
    buckets.get(bucketIndex)!.set(columnIndex, contract);
  }

  const rows: GridRow[] = [];
  for (let bucketIndex = priceWindow.max; bucketIndex >= priceWindow.min; bucketIndex -= 1) {
    const cells: GridCell[] = [];
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
      const contract = buckets.get(bucketIndex)?.get(columnIndex);
      cells.push({ bucketIndex, columnIndex, contract });
    }
    rows.push({ bucketIndex, cells });
  }
  return rows;
}

type GridRow = {
  bucketIndex: number;
  cells: GridCell[];
};

function getOrderColor(multiplier: number): string {
  if (multiplier >= 2.0) {
    return 'bg-purple-600 text-zinc-50';
  }
  if (multiplier >= 1.5) {
    return 'bg-purple-500 text-zinc-50';
  }
  if (multiplier >= 1.0) {
    return 'bg-indigo-500 text-zinc-50';
  }
  return 'bg-indigo-600/70 text-zinc-50';
}
