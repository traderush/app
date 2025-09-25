'use client';

import React, { useCallback, useEffect } from 'react';
import { useGameStore } from '@/stores';
import { playSelectionSound, playHitSound, cleanupSoundManager } from '@/lib/sound/SoundManager';

interface SoundManagerProps {
  onSoundEnabledChange: (enabled: boolean) => void;
}

const SoundManager = React.memo<SoundManagerProps>(({ onSoundEnabledChange }) => {
  const { gameSettings } = useGameStore();

  // Memoized sound callbacks
  const handleSelectionSound = useCallback(() => {
    if (gameSettings.soundEnabled) {
      playSelectionSound();
    }
  }, [gameSettings.soundEnabled]);

  const handleHitSound = useCallback(() => {
    if (gameSettings.soundEnabled) {
      playHitSound();
    }
  }, [gameSettings.soundEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSoundManager();
    };
  }, []);

  // Expose sound functions to parent component
  useEffect(() => {
    // This would typically be done through a context or ref
    // For now, we'll just ensure the sound manager is properly initialized
    if (gameSettings.soundEnabled) {
      // Initialize sound manager if needed
    }
  }, [gameSettings.soundEnabled]);

  return null; // This component doesn't render anything
});

SoundManager.displayName = 'SoundManager';

export default SoundManager;
