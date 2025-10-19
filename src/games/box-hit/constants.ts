import type { AssetKey } from '@/app/box-hit/constants';
import { TRADING_COLORS } from '@/constants/theme';

export const QUICK_BET_AMOUNTS = [10, 50, 100, 250] as const;

export const VOLATILITY_STATES = ['Low', 'Normal', 'High'] as const;

export const MOCK_LEADERBOARD = [
  { rank: 1, player: 'Dc4q...5X4i', pnl: '+$12,512.51', isPositive: true },
  { rank: 2, player: 'Kj8m...9Y2p', pnl: '+$8,743.29', isPositive: true },
  { rank: 3, player: 'Xw2n...7H6q', pnl: '+$6,891.45', isPositive: true },
  { rank: 4, player: 'Lp5v...3M8r', pnl: '+$4,567.12', isPositive: true },
  { rank: 5, player: 'Qr9t...1B4s', pnl: '+$3,234.78', isPositive: true },
  { rank: 6, player: 'Fh6u...8C2w', pnl: '+$2,156.34', isPositive: true },
  { rank: 7, player: 'Gm7i...5E9x', pnl: '+$1,789.56', isPositive: true },
  { rank: 8, player: 'Vk4o...2A7z', pnl: '+$1,234.89', isPositive: true },
  { rank: 9, player: 'Bw3l...6N1y', pnl: '+$987.43', isPositive: true },
  { rank: 10, player: 'Hj8p...4Q5t', pnl: '+$654.21', isPositive: true },
] as const;

export const PANEL_COLORS = TRADING_COLORS;

export type FavoriteAssetSet = Set<AssetKey>;
