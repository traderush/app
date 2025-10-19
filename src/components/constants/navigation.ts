import type { GameTab } from '@/components/ScrollableGameTabs';

export const GAME_TABS: GameTab[] = [
  { href: '/box-hit', label: 'Box Hit' },
  { href: '/towers', label: 'Towers' },
  { href: '/sketch', label: 'Sketch' },
  { href: '/ahead', label: 'Ahead' },
  { label: 'Soon', locked: true },
  { label: 'Soon', locked: true },
  { label: 'Soon', locked: true },
  { label: 'Soon', locked: true },
];

export type NavigationItem = {
  href: string;
  label: string;
};

export const PRIMARY_NAVIGATION: NavigationItem[] = [
  { href: '/explorer', label: 'Explorer' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/refer', label: 'Refer & Earn' },
];

export const NOTIFICATION_COUNT = 12;
export const PROFILE_AVATAR = 'https://i.imgflip.com/2/1vq853.jpg';
