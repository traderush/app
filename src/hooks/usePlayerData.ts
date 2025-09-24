import { useState, useEffect } from 'react';

export interface WatchedPlayer {
  id: string;
  name: string;
  address: string;
  avatar: string;
  game: string;
  isOnline: boolean;
}

export const usePlayerData = () => {
  const [watchedPlayers, setWatchedPlayers] = useState<WatchedPlayer[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Load watched players from localStorage on client side only
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('watchedPlayers');
    if (saved) {
      const parsedData = JSON.parse(saved);
      
      // Fix any broken avatar URLs in cached data
      const updatedData = parsedData.map((player: WatchedPlayer) => {
        if (player.avatar === 'https://pbs.twimg.com/profile_images/1962797155623608320/hOVUVd1G_400x400.jpg') {
          return { ...player, avatar: 'https://pbs.twimg.com/profile_images/1935120379137134592/Khgw5Kfn_400x400.jpg' };
        }
        return player;
      });
      
      // Save the updated data back to localStorage if any changes were made
      if (JSON.stringify(parsedData) !== JSON.stringify(updatedData)) {
        localStorage.setItem('watchedPlayers', JSON.stringify(updatedData));
      }
      
      setWatchedPlayers(updatedData);
    } else {
      // Default watchlist with 4 users
      const defaultWatchlist: WatchedPlayer[] = [
        {
          id: '1',
          name: 'CryptoTrader',
          address: '0x1234...5678',
          avatar: 'https://pbs.twimg.com/profile_images/1944058901713805312/Hl1bsg0D_400x400.jpg',
          game: 'Box Hit',
          isOnline: true
        },
        {
          id: '2',
          name: 'DeFiMaster',
          address: '0x2345...6789',
          avatar: 'https://pbs.twimg.com/profile_images/1785913384590061568/OcNP_wnv_400x400.png',
          game: 'Box Hit',
          isOnline: false
        },
        {
          id: '3',
          name: 'BlockchainPro',
          address: '0x3456...7890',
          avatar: 'https://pbs.twimg.com/profile_images/1760274165070798848/f5V5qbs9_400x400.jpg',
          game: 'Box Hit',
          isOnline: true
        },
        {
          id: '4',
          name: 'TradingGuru',
          address: '0x4567...8901',
          avatar: 'https://pbs.twimg.com/profile_images/1935120379137134592/Khgw5Kfn_400x400.jpg',
          game: 'Box Hit',
          isOnline: false
        }
      ];
      localStorage.setItem('watchedPlayers', JSON.stringify(defaultWatchlist));
      setWatchedPlayers(defaultWatchlist);
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    if (isClient && watchedPlayers.length > 0) {
      localStorage.setItem('watchedPlayers', JSON.stringify(watchedPlayers));
    }
  }, [watchedPlayers, isClient]);

  return {
    watchedPlayers,
    setWatchedPlayers,
    isClient
  };
};
