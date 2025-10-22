import type { GameTab } from '@/shared/ui/ScrollableGameTabs';

export const GAME_TABS: GameTab[] = [
  { href: '/box-hit', label: 'Box Hit' },
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
