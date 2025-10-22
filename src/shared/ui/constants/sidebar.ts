import type { WatchedPlayer } from '@/shared/state';

export const TOP_PLAYERS: Array<WatchedPlayer & { rank: number; accent: string }> = [
  {
    rank: 1,
    id: 'top1',
    name: 'Top Player 1',
    address: '0x1234...5678',
    avatar: 'https://i.ibb.co/cXskDgbs/gasg.png',
    game: 'Box Hit',
    isOnline: true,
    accent: '#FFD700',
  },
  {
    rank: 2,
    id: 'top2',
    name: 'Top Player 2',
    address: '0x2345...6789',
    avatar: 'https://pbs.twimg.com/profile_images/1848910264051052546/Mu18BSYv_400x400.jpg',
    game: 'Box Hit',
    isOnline: true,
    accent: '#C0C0C0',
  },
  {
    rank: 3,
    id: 'top3',
    name: 'Top Player 3',
    address: '0x3456...7890',
    avatar: 'https://i.ibb.co/cXskDgbs/gasg.png',
    game: 'Box Hit',
    isOnline: true,
    accent: '#CD7F32',
  },
];

export const SIDEBAR_ACTIONS = [
  { icon: 'Play', title: 'How to Play', key: 'howToPlay' },
  { icon: 'Globe', title: 'News & Updates', key: 'newsUpdates' },
  { icon: 'Gift', title: 'Rewards', key: 'rewards' },
] as const;

export const SOUND_TOGGLE = {
  on: { icon: 'Volume2', label: 'Sound On' },
  off: { icon: 'VolumeX', label: 'Sound Off' },
} as const;
