export type PricePoint = { t: number; p: number };
export type PriceSeries = PricePoint[];

export type Bet = {
  id: string;
  game: 'box-hit' | 'sketch' | 'towers' | 'ahead';
  size: number;             // USDC
  submittedAt: number;      // timestamp
  meta: Record<string, any>;// game-specific payload
};

export type Tower = {
  id: string;
  centerPrice: number; // price level center
  height: number;      // visual height (px) for overlay
  width: number;       // visual width (px)
  multiplier: number;  // e.g., 3.0, 5.2
};


