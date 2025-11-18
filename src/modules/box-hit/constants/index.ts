import { TRADING_COLORS as THEME_TRADING_COLORS } from '@/shared/constants/theme';

export const ASSET_DATA = {
  DEMO: {
    name: 'Demo Asset',
    symbol: 'DEMO',
    icon: 'https://framerusercontent.com/images/dWPrOABO15xb2dkrxTZj3Z6cAU.png?width=256&height=256',
    price: 100,
    change24h: 2.5,
    volume24h: '45.20B',
    high24h: 102.5,
    low24h: 97.5,
  },
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/d8/fd/f6/d8fdf69a-e716-1018-1740-b344df03476a/AppIcon-0-0-1x_U007epad-0-11-0-sRGB-85-220.png/460x0w.webp',
    price: 65_000,
    change24h: 2.5,
    volume24h: '45.20B',
    high24h: 66_625,
    low24h: 63_375,
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'https://static1.tokenterminal.com//ethereum/logo.png?logo_hash=fd8f54cab23f8f4980041f4e74607cac0c7ab880',
    price: 3420,
    change24h: 1.8,
    volume24h: '25.30B',
    high24h: 3481.56,
    low24h: 3362.04,
  },
  SOL: {
    name: 'Solana',
    symbol: 'SOL',
    icon: 'https://avatarfiles.alphacoders.com/377/377220.png',
    price: 142.5,
    change24h: -0.5,
    volume24h: '8.45B',
    high24h: 143.21,
    low24h: 141.79,
  },
} as const;

export const ASSETS = ASSET_DATA;
export type AssetKey = keyof typeof ASSET_DATA;
export type AssetInfo = (typeof ASSET_DATA)[AssetKey];

export const TIMEFRAME_OPTIONS = [500, 1000, 2000, 4000, 10_000] as const;

export const DEFAULT_TRADE_AMOUNT = 200;

export const TRADING_COLORS = THEME_TRADING_COLORS;

export const QUICK_TRADE_AMOUNTS = [10, 50, 100, 250, 500] as const;
