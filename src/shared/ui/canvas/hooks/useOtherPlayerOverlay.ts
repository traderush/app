import { useEffect, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { GridGame } from '@/shared/lib/canvasLogic/games/grid/GridGame';

type PlayerType = 'leaderboard' | 'watchlist';

interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  type: PlayerType;
}

export interface UseOtherPlayerOverlayResult {
  randomPlayerCounts: Record<string, number>;
  trackedPlayerSelections: Record<string, PlayerProfile[]>;
  loadedImages: Record<string, HTMLImageElement>;
}

const PLAYER_PROFILES: PlayerProfile[] = [
  { id: 'leaderboard1', name: 'CryptoWhale', avatar: 'https://i.ibb.co/cXskDgbs/gasg.png', type: 'leaderboard' },
  { id: 'leaderboard2', name: 'TradingPro', avatar: 'https://pbs.twimg.com/profile_images/1848910264051052546/Mu18BSYv_400x400.jpg', type: 'leaderboard' },
  { id: 'leaderboard3', name: 'DeFiMaster', avatar: 'https://i.ibb.co/cXskDgbs/gasg.png', type: 'leaderboard' },
  { id: 'watchlist1', name: 'MoonTrader', avatar: 'https://pbs.twimg.com/profile_images/1944058901713805312/Hl1bsg0D_400x400.jpg', type: 'watchlist' },
  { id: 'watchlist2', name: 'DiamondHands', avatar: 'https://pbs.twimg.com/profile_images/1785913384590061568/OcNP_wnv_400x400.png', type: 'watchlist' },
  { id: 'watchlist3', name: 'BullRun', avatar: 'https://pbs.twimg.com/profile_images/1760274165070798848/f5V5qbs9_400x400.jpg', type: 'watchlist' },
  { id: 'watchlist4', name: 'HODLer', avatar: 'https://pbs.twimg.com/profile_images/1935120379137134592/Khgw5Kfn_400x400.jpg', type: 'watchlist' },
  { id: 'watchlist5', name: 'CryptoKing', avatar: 'https://i.ibb.co/cXskDgbs/gasg.png', type: 'watchlist' },
];

const RECENTER_DISTANCE = 400;

function createTrackedSelections(): PlayerProfile[][] {
  const selections: PlayerProfile[][] = [];
  const leaderboard = PLAYER_PROFILES.filter((profile) => profile.type === 'leaderboard');
  const watchlist = PLAYER_PROFILES.filter((profile) => profile.type === 'watchlist');

  for (let i = 0; i < 5; i++) {
    const size = Math.floor(Math.random() * 3) + 1; // 1-3 players
    const pool: PlayerProfile[] = [];

    for (let j = 0; j < size; j++) {
      const useWatchlist = Math.random() < 0.6;
      const source = useWatchlist ? watchlist : leaderboard;
      if (!source.length) continue;

      const candidate = source[Math.floor(Math.random() * source.length)];
      if (!pool.some((player) => player.id === candidate.id)) {
        pool.push(candidate);
      }
    }

    if (pool.length) {
      selections.push(pool);
    }
  }

  return selections;
}

function preloadImages(
  existing: Record<string, HTMLImageElement>,
  setLoaded: Dispatch<SetStateAction<Record<string, HTMLImageElement>>>,
) {
  PLAYER_PROFILES.forEach((player) => {
    if (existing[player.id]) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setLoaded((prev) => ({ ...prev, [player.id]: img }));
    };
    img.src = player.avatar;
  });
}

export function useOtherPlayerOverlay(
  showOtherPlayers: boolean,
  gameRef: MutableRefObject<GridGame | null>,
): UseOtherPlayerOverlayResult {
  const [randomPlayerCounts, setRandomPlayerCounts] = useState<Record<string, number>>({});
  const [trackedPlayerSelections, setTrackedPlayerSelections] = useState<Record<string, PlayerProfile[]>>({});
  const [availablePlayerCounts, setAvailablePlayerCounts] = useState<number[]>([]);
  const [availableTrackedSelections, setAvailableTrackedSelections] = useState<PlayerProfile[][]>([]);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    if (!showOtherPlayers) return;

    setAvailablePlayerCounts([1, 2, 3, 4, 5]);
    setAvailableTrackedSelections(createTrackedSelections());
    preloadImages(loadedImages, setLoadedImages);
  }, [showOtherPlayers, loadedImages]);

  useEffect(() => {
    if (!showOtherPlayers || !gameRef.current) {
      return;
    }

    const assignPlayerCounts = () => {
      setRandomPlayerCounts((prev) => {
        const counts = { ...prev };
        const game = gameRef.current;
        if (!game) return counts;

        const boxes = game.getBackendMultipliers() ?? {};
        const currentWorldX = game.getCurrentWorldX?.() ?? 0;

        Object.keys(counts).forEach((boxId) => {
          const box = boxes[boxId];
          if (!box || box.worldX + box.width < currentWorldX) {
            const count = counts[boxId];
            setAvailablePlayerCounts((pool) => [...pool, count]);
            delete counts[boxId];
          }
        });

        const candidates = Object.keys(boxes).filter((boxId) => {
          if (counts[boxId]) return false;
          const box = boxes[boxId];
          if (!box) return false;
          const distance = box.worldX - currentWorldX;
          return distance > 0 && distance < RECENTER_DISTANCE;
        });

        candidates.forEach((boxId) => {
          if (!availablePlayerCounts.length) return;
          if (Math.random() >= 0.03) return;
          const index = Math.floor(Math.random() * availablePlayerCounts.length);
          const count = availablePlayerCounts[index];
          counts[boxId] = count;
          setAvailablePlayerCounts((pool) => pool.filter((_, idx) => idx !== index));
        });

        return counts;
      });
    };

    const assignTrackedSelections = () => {
      setTrackedPlayerSelections((prev) => {
        const selections = { ...prev };
        const game = gameRef.current;
        if (!game) return selections;

        const boxes = game.getBackendMultipliers() ?? {};
        const currentWorldX = game.getCurrentWorldX?.() ?? 0;

        Object.keys(selections).forEach((boxId) => {
          const box = boxes[boxId];
          if (!box || box.worldX + box.width < currentWorldX) {
            const selection = selections[boxId];
            setAvailableTrackedSelections((pool) => [...pool, selection]);
            delete selections[boxId];
          }
        });

        Object.keys(randomPlayerCounts).forEach((boxId) => {
          if (selections[boxId] || !availableTrackedSelections.length) return;
          const randomSelection = availableTrackedSelections[Math.floor(Math.random() * availableTrackedSelections.length)];
          selections[boxId] = randomSelection.slice(0, Math.min(3, randomSelection.length));
          setAvailableTrackedSelections((pool) => pool.filter((selection) => selection !== randomSelection));
        });

        const candidates = Object.keys(boxes).filter((boxId) => {
          if (selections[boxId]) return false;
          const box = boxes[boxId];
          if (!box) return false;
          const distance = box.worldX - currentWorldX;
          return distance > 0 && distance < RECENTER_DISTANCE;
        });

        candidates.forEach((boxId) => {
          if (!availableTrackedSelections.length) return;
          if (Math.random() >= 0.08) return;
          const randomSelection = availableTrackedSelections[Math.floor(Math.random() * availableTrackedSelections.length)];
          selections[boxId] = randomSelection.slice(0, Math.min(3, randomSelection.length));
          setAvailableTrackedSelections((pool) => pool.filter((selection) => selection !== randomSelection));
        });

        return selections;
      });
    };

    const interval = setInterval(() => {
      assignPlayerCounts();
      assignTrackedSelections();
    }, 200);

    return () => clearInterval(interval);
  }, [showOtherPlayers, availablePlayerCounts, availableTrackedSelections, randomPlayerCounts, gameRef]);

  return {
    randomPlayerCounts,
    trackedPlayerSelections,
    loadedImages,
  };
}
