import type { WatchedPlayer } from '@/shared/state';

export const DEMO_PLAYERS: WatchedPlayer[] = [
  {
    id: 'demo1',
    name: 'CryptoTrader',
    address: '0x1234...5678',
    avatar: 'https://pbs.twimg.com/profile_images/1944058901713805312/Hl1bsg0D_400x400.jpg',
    game: 'Box Hit',
    isOnline: true,
  },
  {
    id: 'demo2',
    name: 'DeFiMaster',
    address: '0x2345...6789',
    avatar: 'https://pbs.twimg.com/profile_images/1785913384590061568/OcNP_wnv_400x400.png',
    game: 'Box Hit',
    isOnline: false,
  },
  {
    id: 'demo3',
    name: 'BlockchainPro',
    address: '0x3456...7890',
    avatar: 'https://pbs.twimg.com/profile_images/1760274165070798848/f5V5qbs9_400x400.jpg',
    game: 'Box Hit',
    isOnline: true,
  },
  {
    id: 'demo4',
    name: 'TradingGuru',
    address: '0x4567...8901',
    avatar: 'https://pbs.twimg.com/profile_images/1935120379137134592/Khgw5Kfn_400x400.jpg',
    game: 'Box Hit',
    isOnline: false,
  },
];

export const RANDOM_NAMES = [
  'BitcoinBull',
  'EthereumEagle',
  'SolanaShark',
  'CardanoKing',
  'PolygonPro',
  'AvalancheAce',
  'ChainlinkChamp',
  'UniswapUnicorn',
  'PancakeSwapPro',
  'SushiSwapStar',
  'CompoundCrypto',
  'AaveAce',
  'YearnYield',
  'CurveCrusher',
  'BalancerBoss',
  'MakerMaster',
  'SynthetixStar',
  'RenRenegade',
  'KyberKnight',
  'BancorBaron',
] as const;
