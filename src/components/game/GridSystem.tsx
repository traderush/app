import React, { useState, useCallback, useEffect } from 'react';

export type BoxState = 'idle' | 'selected' | 'hit' | 'missed';

export interface GridCell {
  row: number;
  col: number;
  mult: number;
  state: BoxState;
  crossedTime?: number;
  selectionTime?: number;
}

export interface GridPosition {
  offsetX: number;
  offsetY: number;
}

interface GridSystemProps {
  rows: number;
  cols: number;
  onSelectionChange?: (count: number, best: number, multipliers: number[], averagePrice?: number | null) => void;
  isTradingMode?: boolean;
  onCellClick?: (row: number, col: number) => void;
}

export const GridSystem: React.FC<GridSystemProps> = ({
  rows,
  cols,
  onSelectionChange,
  isTradingMode = false,
  onCellClick
}) => {
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [gridPosition, setGridPosition] = useState<GridPosition>({ offsetX: 0, offsetY: 0 });

  // Initialize grid cells
  useEffect(() => {
    const cells: GridCell[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Generate multiplier based on position (example logic)
        const baseMultiplier = 1.0 + (row * 0.5) + (col * 0.3);
        cells.push({
          row,
          col,
          mult: Math.round(baseMultiplier * 10) / 10, // Round to 1 decimal
          state: 'idle'
        });
      }
    }
    setGridCells(cells);
  }, [rows, cols]);

  // Watch for selection changes and notify parent component
  useEffect(() => {
    const activeSelectedCells = gridCells.filter(cell => 
      cell.state === 'selected' && !cell.crossedTime
    );
    const count = activeSelectedCells.length;
    const best = activeSelectedCells.length > 0 ? Math.max(...activeSelectedCells.map(cell => cell.mult)) : 0;
    const multipliers = activeSelectedCells.map(cell => cell.mult);
    
    onSelectionChange?.(count, best, multipliers, undefined);
  }, [gridCells, onSelectionChange]);

  const toggleCell = useCallback((row: number, col: number) => {
    if (!isTradingMode) return;
    
    setGridCells(prev => {
      const updated = prev.map(cell => {
        if (cell.row !== row || cell.col !== col) return cell;
        if (cell.state === 'hit' || cell.state === 'missed') return cell;
        
        const newState: BoxState = cell.state === 'selected' ? 'idle' : 'selected';
        
        return { 
          ...cell, 
          state: newState,
          selectionTime: newState === 'selected' ? Date.now() : undefined
        };
      });
      
      return updated;
    });
    
    onCellClick?.(row, col);
  }, [isTradingMode, onCellClick]);

  return {
    gridCells,
    setGridCells,
    gridPosition,
    setGridPosition,
    toggleCell
  };
};

export default GridSystem;
