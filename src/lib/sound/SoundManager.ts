// Global audio context management
let globalAudioContext: AudioContext | null = null;

const getAudioContext = async (): Promise<AudioContext | null> => {
  try {
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    
    // Resume audio context if it's suspended (common after user interaction timeout)
    if (globalAudioContext.state === 'suspended') {
      await globalAudioContext.resume();
    }
    
    return globalAudioContext;
  } catch (error) {
    console.warn('Failed to get audio context:', error);
    return null;
  }
};

const createSound = async (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) => {
  try {
    const audioContext = await getAudioContext();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.warn('Error creating sound:', error);
  }
};

// Global sound state
let soundEnabled = true;

// Sound effect functions
export const playSelectionSound = async () => {
  if (!soundEnabled) return;
  await createSound(800, 0.1, 'sine', 0.15);
};

export const playHitSound = async () => {
  if (!soundEnabled) return;
  await createSound(600, 0.15, 'sine', 0.2);
  setTimeout(async () => await createSound(800, 0.2, 'sine', 0.15), 50);
};

// Sound toggle function
export const toggleSound = () => {
  soundEnabled = !soundEnabled;
  console.log('Sound toggled:', soundEnabled ? 'ON' : 'OFF');
};

// Get sound enabled state
export const getSoundEnabled = () => {
  return soundEnabled;
};

// Initialize global sound functions on client side
if (typeof window !== 'undefined') {
  (window as unknown as { toggleSound: typeof toggleSound; getSoundEnabled: typeof getSoundEnabled }).toggleSound = toggleSound;
  (window as unknown as { toggleSound: typeof toggleSound; getSoundEnabled: typeof getSoundEnabled }).getSoundEnabled = getSoundEnabled;
}

// Cleanup function for when component unmounts
export const cleanupSoundManager = () => {
  if (globalAudioContext && globalAudioContext.state !== 'closed') {
    globalAudioContext.close();
    globalAudioContext = null;
  }
};
