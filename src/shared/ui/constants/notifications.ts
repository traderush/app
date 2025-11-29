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
  {
    id: 'position-closed',
    title: 'Position Closed',
    message: 'Your position on BTC/USDT has been closed. Final P&L: +$75.50',
    timestamp: '15 minutes ago',
    type: 'success',
  },
  {
    id: 'deposit-received',
    title: 'Deposit Received',
    message: 'Your deposit of $500.00 has been successfully processed and added to your account.',
    timestamp: '1 hour ago',
    type: 'success',
  },
  {
    id: 'price-alert',
    title: 'Price Alert Triggered',
    message: 'BTC/USDT has reached your target price of $65,420.00',
    timestamp: '2 hours ago',
    type: 'info',
  },
  {
    id: 'withdrawal-pending',
    title: 'Withdrawal Pending',
    message: 'Your withdrawal request of $250.00 is being processed. Expected completion: 24 hours.',
    timestamp: '3 hours ago',
    type: 'warning',
  },
  {
    id: 'bonus-claimed',
    title: 'Daily Bonus Claimed',
    message: 'You have successfully claimed your daily bonus of $10.00. Keep trading to earn more!',
    timestamp: '5 hours ago',
    type: 'success',
  },
  {
    id: 'referral-reward',
    title: 'Referral Reward',
    message: 'You earned $25.00 from a successful referral. Your friend made their first deposit!',
    timestamp: '1 day ago',
    type: 'success',
  },
  {
    id: 'system-update',
    title: 'System Update',
    message: 'New features have been added to the platform. Check out the latest updates in Settings.',
    timestamp: '2 days ago',
    type: 'info',
  },
] as const;
