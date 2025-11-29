import type { GameTab } from '@/shared/ui/ScrollableGameTabs';

export const GAME_TABS: GameTab[] = [
  { href: '/box-hit', label: 'Box Hit' },
  { label: 'Soon', locked: true },
  { label: 'Soon', locked: true },
  { label: 'Soon', locked: true },
  { label: 'Soon', locked: true },
];

import React from 'react';
import { LayoutDashboard, Compass, Trophy, Gift } from 'lucide-react';

export type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color?: string;
  badge?: string | number;
};

export const PRIMARY_NAVIGATION: NavigationItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/explorer', label: 'Explorer', icon: Compass },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, badge: 34 },
  { href: '/refer', label: 'Refer & Earn', icon: Gift },
];

export const NOTIFICATION_COUNT = 12;
export const PROFILE_AVATAR = 'https://i.imgflip.com/2/1vq853.jpg';
