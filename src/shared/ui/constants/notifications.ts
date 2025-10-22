export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'success' | 'info' | 'warning';
};

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'trade-executed',
    title: 'Trade Executed Successfully',
    message: 'Your trade for 2.5x multiplier has been executed. Profit: +$150.00',
    timestamp: '2 minutes ago',
    type: 'success',
  },
] as const;
