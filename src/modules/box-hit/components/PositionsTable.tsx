'use client';

import React, { useMemo, useState } from 'react';
import { useUIStore, useUserStore } from '@/shared/state';
import { ChevronDownIcon, ChevronUpIcon, ChevronDown } from 'lucide-react';

interface PositionsTableProps {
  currentBTCPrice: number;
  close: () => void;
}

type SortDirection = 'asc' | 'desc' | null;

interface ColumnConfig {
  label: string;
  key: string;
}

interface TableContainerProps<T> {
  columns: ColumnConfig[];
  data: T[];
  emptyMessage: string;
  emptyColSpan: number;
  onSort: (columnKey: string, direction: SortDirection) => void;
  renderRow: (item: T, index: number) => React.ReactNode;
}

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

interface ProgressBarProps {
  progress: string;
}

interface SortableTableHeaderProps {
  label: string;
  columnKey: string;
  onSort: (columnKey: string, direction: SortDirection) => void;
}

// ============================================================================
// PositionsTable Component
// ============================================================================

const PositionsTable = React.memo(function PositionsTable({ currentBTCPrice, close }: PositionsTableProps) {
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions');
  const [activeSort, setActiveSort] = useState<{ column: string; direction: SortDirection } | null>(null);
  const signatureColor = useUIStore((state) => state.signatureColor);
  const activeTrades = useUserStore((state) => state.activeTrades);
  const tradeHistory = useUserStore((state) => state.tradeHistory);

  const handleSort = (columnKey: string, direction: SortDirection) => {
    if (direction === null) {
      setActiveSort(null);
    } else {
      setActiveSort({ column: columnKey, direction });
    }
  };

  const parseColumnValue = (column: string, value: any): any => {
    switch (column) {
      case 'time':
        return new Date(`1970-01-01 ${value}`).getTime();
      case 'size':
      case 'multiplier':
      case 'tradeAmount':
        return value;
      case 'equity':
        return Number.parseFloat(value.replace('$', ''));
      case 'prog':
        return Number.parseFloat(value.replace('%', ''));
      case 'entry':
        return Number.parseFloat(value);
      case 'hit':
        const hitOrder: Record<string, number> = { Pending: 0, Lost: 1, Won: 2 };
        return hitOrder[value] !== undefined ? hitOrder[value] : Number.parseFloat(value);
      case 'result':
        return value === 'Won' ? 1 : 0;
      default:
        return String(value).toLowerCase();
    }
  };

  const sortData = <T extends Record<string, any>>(data: T[], sortConfig: { column: string; direction: SortDirection } | null): T[] => {
    if (!sortConfig || !sortConfig.direction) return data;

    return [...data].sort((a, b) => {
      const aValue = parseColumnValue(sortConfig.column, a[sortConfig.column]);
      const bValue = parseColumnValue(sortConfig.column, b[sortConfig.column]);

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const activePositions = useMemo(() => {
    const positions = activeTrades.map((trade) => ({
      id: trade.id,
      time: trade.placedAt.toLocaleTimeString(),
      size: trade.amount,
      equity: `$${trade.amount.toFixed(2)}`,
      hit: 'Pending',
      prog: '0%',
      entry: Math.random() > 0.5 ? 10000 : 20000,
      tradeAmount: trade.amount,
      selectedMultipliers: [1.0],
      multiplier: Math.random() > 0.5 ? 1.0 : 2.0,
      contractId: trade.contractId,
    }));
    return sortData(positions, activeSort);
  }, [activeTrades, activeSort]);

  const historyPositions = useMemo(() => {
    const positions = tradeHistory
      .filter((trade) => trade.result && trade.settledAt)
      .slice(-10)
      .map((trade) => ({
        id: trade.id,
        time: new Date(trade.settledAt!).toLocaleTimeString(),
        size: trade.amount,
        equity: trade.result === 'win' ? `$${(trade.payout || 0).toFixed(2)}` : '$0.00',
        hit: trade.result === 'win' ? 'Won' : 'Lost',
        prog: '100%',
        entry: Math.random() > 0.5 ? 10000 : 20000,
        result: trade.result === 'win' ? ('Won' as const) : ('Lost' as const),
        tradeAmount: trade.amount,
        selectedMultipliers: [1.0],
        multiplier: trade.result === 'win' ? (trade.payout || 0) / trade.amount : 0,
        contractId: trade.contractId,
      }));
    return sortData(positions, activeSort);
  }, [tradeHistory, activeSort]);

  const positionColumns: ColumnConfig[] = [
    { label: 'Time', key: 'time' },
    { label: 'Trade Size', key: 'size' },
    { label: 'Multiplier', key: 'multiplier' },
    { label: 'Equity', key: 'equity' },
    { label: 'Probability of Hit', key: 'hit' },
    { label: 'Trade Progression', key: 'prog' },
    { label: 'Entry Price', key: 'entry' },
  ];

  const historyColumns: ColumnConfig[] = [
    ...positionColumns,
    { label: 'Result', key: 'result' },
  ];

  const renderPositionRow = (position: any, index: number) => (
    <tr
      key={position.id}
      className={`border-t border-zinc-800/70 [&>td]:px-3 [&>td]:py-2 ${
        (index + 1) % 2 === 0 ? 'bg-neutral-900' : ''
      }`}
    >
      <td>{position.time}</td>
      <td>${position.size.toFixed(2)}</td>
      <td className="font-medium" style={{ color: signatureColor }}>
        {position.multiplier.toFixed(1)}x
      </td>
      <td className="text-trading-positive">{position.equity}</td>
      <td className={getProbabilityClass(position.hit)}>{position.hit}</td>
      <td>
        <ProgressBar progress={position.prog} />
      </td>
      <td>{position.entry}</td>
    </tr>
  );

  const renderHistoryRow = (position: any, index: number) => (
    <tr
      key={position.id}
      className={`border-t border-zinc-800/70 [&>td]:px-3 [&>td]:py-2 ${
        (index + 1) % 2 === 0 ? 'bg-neutral-900' : ''
      }`}
    >
      <td>{position.time}</td>
      <td>${position.size.toFixed(2)}</td>
      <td className="font-medium" style={{ color: signatureColor }}>
        {position.multiplier.toFixed(1)}x
      </td>
      <td className={getEquityClass(position.equity)}>{position.equity}</td>
      <td className={getProbabilityClass(position.hit)}>{position.hit}</td>
      <td>
        <ProgressBar progress={position.prog} />
      </td>
      <td>{position.entry}</td>
      <td>
        <span
          className={`rounded px-2 py-1 text-xs font-normal ${
            position.result === 'Won'
              ? 'bg-trading-positive/20 text-trading-positive'
              : 'bg-trading-negative/20 text-trading-negative'
          }`}
        >
          {position.result}
        </span>
      </td>
    </tr>
  );

  return (
    <div className="border-t border-zinc-800/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button onClick={close} className="px-2 py-2 rounded-sm">
            <ChevronDownIcon
              size={16}
              className="text-zinc-400 hover:text-zinc-300"
            />
          </button>
          <TabButton
            label="Positions"
            isActive={activeTab === 'positions'}
            onClick={() => setActiveTab('positions')}
          />
          <TabButton
            label="Position History"
            isActive={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          />
        </div>
        {activeTab === 'positions' && (
          <p className="px-3 py-2 text-[12px] text-zinc-400">{activePositions.length} positions</p>
        )}
        {activeTab === 'history' && (
          <p className="px-3 py-2 text-[12px] text-zinc-400">{historyPositions.length} previous positions</p>
        )}
      </div>

      <div className="mx-0 border-b border-surface-950" />

      {activeTab === 'positions' && (
        <TableContainer
          columns={positionColumns}
          data={activePositions}
          emptyMessage="No active positions yet."
          emptyColSpan={7}
          onSort={handleSort}
          renderRow={renderPositionRow}
        />
      )}

      {activeTab === 'history' && (
        <TableContainer
          columns={historyColumns}
          data={historyPositions}
          emptyMessage="No completed trades yet."
          emptyColSpan={8}
          onSort={handleSort}
          renderRow={renderHistoryRow}
        />
      )}
    </div>
  );
});

// ============================================================================
// TableContainer Component
// ============================================================================

function TableContainer<T>({
  columns,
  data,
  emptyMessage,
  emptyColSpan,
  onSort,
  renderRow,
}: TableContainerProps<T>) {
  return (
    <div className="h-64 overflow-x-auto pb-3">
      <div className="h-full overflow-x-auto overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background text-zinc-400 shadow-[0_1px_0_0_rgba(39,39,42,1),0_-1px_0_0_rgba(39,39,42,1)]">
            <tr className="[&>th]:border-t [&>th]:border-b [&>th]:border-zinc-800 [&>th]:px-3 [&>th]:py-1 text-left">
              {columns.map((column) => (
                <SortableTableHeader
                  key={column.key}
                  label={column.label}
                  columnKey={column.key}
                  onSort={onSort}
                />
              ))}
            </tr>
          </thead>
          <tbody className="text-[12px] font-normal text-zinc-200">
            {data.length === 0 ? (
              <tr>
                <td colSpan={emptyColSpan} className="py-8 text-center text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => renderRow(item, index))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// TabButton Component
// ============================================================================

const TabButton = React.memo(function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-2 text-[14px] transition-colors ${
        isActive ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-300'
      }`}
    >
      {label}
      {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100" />}
    </button>
  );
});

// ============================================================================
// ProgressBar Component
// ============================================================================

const ProgressBar = React.memo(function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="relative h-4 w-24">
      <div
        className="h-4 bg-gradient-to-r from-brand/0 to-brand"
        style={{ width: getProgressWidth(progress) }}
      />
      <span className="absolute left-1 top-1/2 -translate-y-1/2 transform text-[12px] font-normal text-white">
        {progress}
      </span>
    </div>
  );
});

// ============================================================================
// SortableTableHeader Component
// ============================================================================

const SortableTableHeader = React.memo(function SortableTableHeader({
  label,
  columnKey,
  onSort,
}: SortableTableHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleClick = () => {
    let newDirection: SortDirection;
    if (sortDirection === null) {
      newDirection = 'desc';
    } else if (sortDirection === 'desc') {
      newDirection = 'asc';
    } else {
      newDirection = null;
    }
    setSortDirection(newDirection);
    onSort(columnKey, newDirection);
  };

  const isActive = sortDirection !== null;
  const arrowOpacity = isActive ? 'opacity-100' : isHovered ? 'opacity-30' : 'opacity-0';

  return (
    <th
      className="cursor-pointer select-none text-[12px] font-normal transition-colors hover:text-zinc-200"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className={`inline-flex transition-opacity ${arrowOpacity}`}>
          {sortDirection === 'asc' && <ChevronUpIcon size={14}/>}
          {sortDirection === 'desc' && <ChevronDownIcon size={14}/>}
          {sortDirection === null && <ChevronDown size={14} />}
        </span>
      </div>
    </th>
  );
});

// ============================================================================
// Utility Functions
// ============================================================================

const getProbabilityClass = (value: string) => {
  const numericValue = Number.parseFloat(value);
  if (Number.isNaN(numericValue)) {
    return 'text-trading-negative';
  }
  return numericValue >= 50 ? 'text-trading-positive' : 'text-trading-negative';
};

const getEquityClass = (equity: string) =>
  equity === '$0.00' ? 'text-trading-negative' : 'text-trading-positive';

const getProgressWidth = (progress: string) => {
  const numericValue = Number.parseFloat(progress);
  if (Number.isNaN(numericValue)) {
    return '0%';
  }
  return `${Math.min(Math.max(numericValue, 0), 100)}%`;
};

export default PositionsTable;
