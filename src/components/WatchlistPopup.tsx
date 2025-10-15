'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Search, Trash2 } from 'lucide-react';
import { useTradingStore } from '@/stores';
import type { WatchedPlayer } from '@/stores/tradingStore';
import { useShallow } from 'zustand/react/shallow';

interface WatchlistPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const WatchlistPopup: React.FC<WatchlistPopupProps> = ({
  isOpen,
  onClose
}) => {
  // Optimized: Batch player-related subscriptions to prevent unnecessary re-renders during frequent updates
  const { watchedPlayers } = useTradingStore(
    useShallow((state) => ({
      watchedPlayers: state.watchedPlayers,
    }))
  );
  const addWatchedPlayer = useTradingStore((state) => state.addWatchedPlayer);
  const removeWatchedPlayer = useTradingStore((state) => state.removeWatchedPlayer);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);
  
  // Demo players for suggestions
  const allDemoPlayers = [
    {
      id: 'demo_crypto_trader',
      username: 'CryptoTrader',
      profit: 1250,
      trades: 45,
      winRate: 67,
      avatar: 'https://pbs.twimg.com/profile_images/1944058901713805312/Hl1bsg0D_400x400.jpg',
      level: 15,
      address: '0x1234...5678'
    },
    {
      id: 'demo_defi_master',
      username: 'DeFiMaster',
      profit: 890,
      trades: 32,
      winRate: 59,
      avatar: 'https://pbs.twimg.com/profile_images/1785913384590061568/OcNP_wnv_400x400.png',
      level: 12,
      address: '0x2345...6789'
    },
    {
      id: 'demo_blockchain_pro',
      username: 'BlockchainPro',
      profit: 2100,
      trades: 78,
      winRate: 72,
      avatar: 'https://pbs.twimg.com/profile_images/1760274165070798848/f5V5qbs9_400x400.jpg',
      level: 18,
      address: '0x3456...7890'
    },
    {
      id: 'demo_trading_guru',
      username: 'TradingGuru',
      profit: -150,
      trades: 12,
      winRate: 25,
      avatar: 'https://pbs.twimg.com/profile_images/1935120379137134592/Khgw5Kfn_400x400.jpg',
      level: 8,
      address: '0x4567...8901'
    }
  ];

  // Random player names for suggestions
  const randomNames = [
    'BitcoinBull', 'EthereumEagle', 'SolanaShark', 'CardanoKing', 'PolygonPro',
    'AvalancheAce', 'ChainlinkChamp', 'UniswapUnicorn', 'PancakeSwapPro', 'SushiSwapStar',
    'CompoundCrypto', 'AaveAce', 'YearnYield', 'CurveCrusher', 'BalancerBoss',
    'MakerMaster', 'SynthetixStar', 'RenRenegade', 'KyberKnight', 'BancorBaron'
  ];

  // Generate random suggestions (exclude already added players)
  const getRandomSuggestions = () => {
    const addedNames = watchedPlayers.map(p => p.username);
    const availablePlayers = allDemoPlayers.filter(p => !addedNames.includes(p.username));
    
    // If we have fewer than 4 available demo players, generate random ones
    if (availablePlayers.length < 4) {
      const randomPlayers = [];
      const usedNames = new Set([...addedNames, ...availablePlayers.map(p => p.username)]);
      
      while (randomPlayers.length < 4 && randomPlayers.length < randomNames.length) {
        const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
        if (!usedNames.has(randomName)) {
          usedNames.add(randomName);
          randomPlayers.push({
            id: 'random_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            username: randomName,
            profit: Math.floor(Math.random() * 2000) - 500,
            trades: Math.floor(Math.random() * 100) + 1,
            winRate: Math.floor(Math.random() * 80) + 20,
            avatar: 'https://i.ibb.co/cXskDgbs/gasg.png',
            level: Math.floor(Math.random() * 25) + 1,
            address: '0x' + Math.random().toString(16).substr(2, 8) + '...' + Math.random().toString(16).substr(2, 4)
          });
        }
      }
      
      return [...availablePlayers, ...randomPlayers].slice(0, 4);
    }
    
    return availablePlayers.slice(0, 4);
  };

  const demoPlayers = getRandomSuggestions();

  const handleRemovePlayer = (playerId: string) => {
    removeWatchedPlayer(playerId);
  };

  const handleAddWallet = () => {
    if (searchQuery.trim() && watchedPlayers.length < 5) {
      // Mock adding new wallet
      const newPlayer = {
        id: 'wallet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        username: searchQuery.trim(),
        profit: Math.floor(Math.random() * 2000) - 500,
        trades: Math.floor(Math.random() * 100) + 1,
        winRate: Math.floor(Math.random() * 80) + 20,
        avatar: 'https://i.ibb.co/cXskDgbs/gasg.png',
        level: Math.floor(Math.random() * 25) + 1,
        address: '0x' + Math.random().toString(16).substr(2, 8) + '...' + Math.random().toString(16).substr(2, 4)
      };
      addWatchedPlayer(newPlayer);
      setSearchQuery('');
    }
  };

  const handleAddDemoPlayer = (demoPlayer: WatchedPlayer) => {
    if (watchedPlayers.length < 5) {
      addWatchedPlayer(demoPlayer);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddWallet();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[1000] transition-all duration-300 ease-out opacity-60"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[1001] flex items-center justify-center pointer-events-none p-4">
        <div 
          ref={popupRef}
          className="w-full max-w-2xl border border-zinc-800/70 rounded-lg shadow-2xl pointer-events-auto transition-all duration-300 ease-out opacity-100 scale-100 overflow-hidden"
          style={{ backgroundColor: '#0E0E0E' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/70">
            <h2 className="text-white text-sm font-medium">Watchlist</h2>
            <button
              onClick={onClose}
              className="grid place-items-center w-6 h-6 rounded hover:bg-white/5 transition-colors"
            >
              <X size={14} className="text-white" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-zinc-800/70">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search
                  size={14}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Search by name or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-8 pr-3 py-2 bg-zinc-900/50 border border-zinc-700/50 rounded text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-600 transition-colors text-xs"
                />
              </div>
              <button
                onClick={handleAddWallet}
                disabled={!searchQuery.trim() || watchedPlayers.length >= 5}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-500 text-white rounded transition-colors disabled:cursor-not-allowed text-xs"
              >
                Import
              </button>
            </div>

            {/* Warning message when limit reached */}
            {watchedPlayers.length >= 5 && (
              <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded text-xs text-yellow-400">
                ⚠️ Watchlist limit reached (5 players max). Remove a player to add new ones.
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 pb-3 border-b border-zinc-800/70 text-zinc-400 text-xs font-medium">
              <div className="col-span-4">Player</div>
              <div className="col-span-2">Address</div>
              <div className="col-span-2">Profit</div>
              <div className="col-span-2">Level</div>
              <div className="col-span-2">Actions</div>
            </div>

            {/* Players List */}
            <div className="space-y-2 mt-3">
              {watchedPlayers.map((player) => (
                <div key={player.id} className="grid grid-cols-12 gap-3 items-center py-2 hover:bg-zinc-900/30 rounded px-1 transition-colors">
                  {/* Player Info */}
                  <div className="col-span-4 flex items-center gap-2">
                    <div className="relative">
                      <img
                        src={player.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.username)}&background=random`}
                        alt={player.username}
                        className="w-8 h-8 rounded object-cover"
                        style={{ borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <div className="text-white font-medium text-xs">{player.username}</div>
                      <div className="text-zinc-400 text-xs">{player.address}</div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="col-span-2 text-zinc-300 text-xs font-mono">
                    {player.address}
                  </div>

                  {/* Profit */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      player.profit > 0
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-red-900/30 text-red-400'
                    }`}>
                      {player.profit > 0 ? '+' : ''}${player.profit.toFixed(2)}
                    </span>
                  </div>

                  {/* Level */}
                  <div className="col-span-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300">
                      Level {player.level || 1}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2">
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="text-red-400 hover:text-red-300 transition-colors p-0.5"
                      title="Remove from watchlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {watchedPlayers.length === 0 && (
              <div className="text-center py-12 text-zinc-400">
                <p className="text-xs">No players in your watchlist</p>
                <p className="text-xs mt-1">Use the search bar above to add players</p>
              </div>
            )}
          </div>

          {/* Suggestion Panel */}
          <div className="p-3 border-t border-zinc-800/70">
            <h3 className="text-white text-xs font-medium mb-2">Suggested Players</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {demoPlayers.map((player, index) => (
                <div key={index} className="flex items-center gap-1.5 p-1.5 bg-zinc-900/30 rounded hover:bg-zinc-900/50 transition-colors">
                  <img
                    src={player.avatar}
                    alt={player.username}
                    className="w-5 h-5 rounded object-cover"
                    style={{ borderRadius: '4px' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium truncate">{player.username}</div>
                    <div className="text-zinc-400 text-xs truncate">{player.address}</div>
                  </div>
                  <button
                    onClick={() => handleAddDemoPlayer(player)}
                    disabled={watchedPlayers.length >= 5 || watchedPlayers.some(p => p.username === player.username)}
                    className="text-zinc-400 hover:text-white disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors"
                    title={watchedPlayers.some(p => p.username === player.username) ? "Already added" : "Add to watchlist"}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WatchlistPopup;