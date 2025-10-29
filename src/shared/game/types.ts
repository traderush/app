export type PricePoint = { t: number; p: number };
export type PriceSeries = PricePoint[];

export type Trade = {
  id: string;
  game: 'box-hit';
  size: number;             // USDC
  submittedAt: number;      // timestamp
  meta: Record<string, unknown>;// game-specific payload
};
