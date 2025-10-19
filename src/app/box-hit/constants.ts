export { TRADING_COLORS } from '@/constants/theme';

export type AssetKey = 'DEMO' | 'BTC' | 'ETH' | 'SOL';

export interface AssetInfo {
  name: string;
  symbol: string;
  icon: string;
  price: number;
  change24h: number;
  volume24h: string;
}

export const ASSETS: Record<AssetKey, AssetInfo> = {
  DEMO: {
    name: 'Demo Asset',
    symbol: 'DEMO',
    icon: 'https://framerusercontent.com/images/dWPrOABO15xb2dkrxTZj3Z6cAU.png?width=256&height=256',
    price: 100,
    change24h: 2.5,
    volume24h: '45.20B',
  },
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/d8/fd/f6/d8fdf69a-e716-1018-1740-b344df03476a/AppIcon-0-0-1x_U007epad-0-11-0-sRGB-85-220.png/460x0w.webp',
    price: 65_000,
    change24h: 2.5,
    volume24h: '45.20B',
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'https://static1.tokenterminal.com//ethereum/logo.png?logo_hash=fd8f54cab23f8f4980041f4e74607cac0c7ab880',
    price: 3420,
    change24h: 1.8,
    volume24h: '25.30B',
  },
  SOL: {
    name: 'Solana',
    symbol: 'SOL',
    icon: 'https://avatarfiles.alphacoders.com/377/377220.png',
    price: 142.5,
    change24h: -0.5,
    volume24h: '8.45B',
  },
};

export const DEFAULT_BET_AMOUNT = 200;
