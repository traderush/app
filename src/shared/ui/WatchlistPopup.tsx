'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Search, Trash2 } from 'lucide-react';
import { DEMO_PLAYERS, RANDOM_NAMES } from '@/shared/ui/constants/watchlist';
import type { WatchedPlayer } from '@/shared/state';

interface WatchlistPopupProps {
  isOpen: boolean;
  onClose: () => void;
  watchedPlayers: WatchedPlayer[];
  setWatchedPlayers: React.Dispatch<React.SetStateAction<WatchedPlayer[]>>;
}

const WatchlistPopup: React.FC<WatchlistPopupProps> = ({
  isOpen,
  onClose,
  watchedPlayers,
  setWatchedPlayers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

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
  
  const suggestions = useMemo(() => {
    const addedNames = new Set(watchedPlayers.map((player) => player.name));
    const availableDemo = DEMO_PLAYERS.filter((player) => !addedNames.has(player.name));

    if (availableDemo.length >= 4) {
      return availableDemo.slice(0, 4);
    }

    const generated: WatchedPlayer[] = [];
    const usedNames = new Set([...addedNames, ...availableDemo.map((player) => player.name)]);

    for (const randomName of RANDOM_NAMES) {
      if (generated.length >= 4 - availableDemo.length) break;
      if (usedNames.has(randomName)) continue;

      usedNames.add(randomName);
      generated.push({
        id: `random_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`,
        name: randomName,
        address: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
        avatar: 'https://i.ibb.co/cXskDgbs/gasg.png',
        game: 'Box Hit',
        isOnline: Math.random() > 0.5,
      });
    }

    return [...availableDemo, ...generated].slice(0, 4);
  }, [watchedPlayers]);

  const handleRemovePlayer = (playerId: string) => {
    setWatchedPlayers(prev => prev.filter(player => player.id !== playerId));
  };

  const handleAddWallet = () => {
    if (searchQuery.trim() && watchedPlayers.length < 5) {
      // Mock adding new wallet
      const newPlayer: WatchedPlayer = {
        id: Date.now().toString(),
        name: searchQuery.trim(),
        address: '0x' + Math.random().toString(16).substr(2, 8) + '...' + Math.random().toString(16).substr(2, 4),
        avatar: 'https://i.ibb.co/cXskDgbs/gasg.png', // Default avatar
        game: 'Box Hit',
        isOnline: Math.random() > 0.5
      };
      setWatchedPlayers(prev => [...prev, newPlayer]);
      setSearchQuery('');
    }
  };

  const handleAddDemoPlayer = (demoPlayer: WatchedPlayer) => {
    if (watchedPlayers.length < 5) {
      const newPlayer: WatchedPlayer = {
        ...demoPlayer,
        id: Date.now().toString() + Math.random().toString(16).substr(2, 4)
      };
      setWatchedPlayers(prev => [...prev, newPlayer]);
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
              <div className="col-span-2">Game</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Actions</div>
            </div>

            {/* Players List */}
            <div className="space-y-2 mt-3">
              {watchedPlayers.map((player) => (
                <div key={player.id} className="grid grid-cols-12 gap-3 items-center py-2 hover:bg-zinc-900/30 rounded px-1 transition-colors">
                  {/* Player Info */}
                  <div className="col-span-4 flex items-center gap-2">
                    <div className="relative">
                      <Image
                        src={player.avatar}
                        alt={player.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded object-cover"
                        style={{ borderRadius: '4px' }}
                        loading="lazy"
                      />
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0E0E0E] ${
                          player.isOnline ? 'bg-green-500' : 'bg-zinc-500'
                        }`}
                      />
                    </div>
                    <div>
                      <div className="text-white font-medium text-xs">{player.name}</div>
                      <div className="text-zinc-400 text-xs">{player.name}...</div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="col-span-2 text-zinc-300 text-xs font-mono">
                    {player.address}
                  </div>

                  {/* Game */}
                  <div className="col-span-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300">
                      {player.game}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                      player.isOnline
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {player.isOnline ? 'Online' : 'Offline'}
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
              {suggestions.map((player) => (
                <div key={player.id} className="flex items-center gap-1.5 p-1.5 bg-zinc-900/30 rounded hover:bg-zinc-900/50 transition-colors">
                  <Image
                    src={player.avatar}
                    alt={player.name}
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded object-cover"
                    style={{ borderRadius: '4px' }}
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium truncate">{player.name}</div>
                    <div className="text-zinc-400 text-xs truncate">{player.address}</div>
                  </div>
                  <button
                    onClick={() => handleAddDemoPlayer(player)}
                    disabled={watchedPlayers.length >= 5 || watchedPlayers.some(p => p.name === player.name)}
                    className="text-zinc-400 hover:text-white disabled:text-zinc-600 disabled:cursor-not-allowed transition-colors"
                    title={watchedPlayers.some(p => p.name === player.name) ? "Already added" : "Add to watchlist"}
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
