'use client';

import { ComponentType } from 'react';

// Dynamic import utility with retry logic
export async function dynamicImport<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  retries = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const importedModule = await importFunc();
      return importedModule.default;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Dynamic import attempt ${i + 1} failed:`, error);
      
      // Wait before retrying (exponential backoff)
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw new Error(`Failed to load component after ${retries} attempts: ${lastError?.message}`);
}

// Preload components for better UX
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  // Start loading immediately but don't await
  importFunc().catch(error => {
    console.warn('Preload failed:', error);
  });
}

// Bundle analyzer utility (development only)
export function analyzeBundle() {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Log loaded chunks for analysis
    const chunks = (window as any).__webpack_chunks__ || [];
    console.log('Loaded chunks:', chunks);
  }
}
