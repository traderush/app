import { StateStorage } from 'zustand/middleware';

/**
 * Custom localStorage implementation for Zustand persistence
 * Handles serialization/deserialization and error handling
 */
export const createPersistentStorage = (name: string): StateStorage => ({
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      const value = localStorage.getItem(`${name}_${key}`);
      return value;
    } catch (error) {
      console.warn(`Failed to get item from localStorage: ${key}`, error);
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(`${name}_${key}`, value);
    } catch (error) {
      console.warn(`Failed to set item in localStorage: ${key}`, error);
    }
  },
  
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(`${name}_${key}`);
    } catch (error) {
      console.warn(`Failed to remove item from localStorage: ${key}`, error);
    }
  },
});

/**
 * Custom sessionStorage implementation for temporary data
 */
export const createSessionStorage = (name: string): StateStorage => ({
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      const value = sessionStorage.getItem(`${name}_${key}`);
      return value;
    } catch (error) {
      console.warn(`Failed to get item from sessionStorage: ${key}`, error);
      return null;
    }
  },
  
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem(`${name}_${key}`, value);
    } catch (error) {
      console.warn(`Failed to set item in sessionStorage: ${key}`, error);
    }
  },
  
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.removeItem(`${name}_${key}`);
    } catch (error) {
      console.warn(`Failed to remove item from sessionStorage: ${key}`, error);
    }
  },
});

/**
 * Utility functions for managing persistent data
 */
export const persistenceUtils = {
  /**
   * Clear all persistent data for a specific store
   */
  clearStoreData: (storeName: string): void => {
    try {
      if (typeof window === 'undefined') return;
      
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(`${storeName}_`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn(`Failed to clear store data: ${storeName}`, error);
    }
  },

  /**
   * Get all persistent data for a specific store
   */
  getStoreData: (storeName: string): Record<string, unknown> => {
    try {
      if (typeof window === 'undefined') return {};
      
      const data: Record<string, unknown> = {};
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(`${storeName}_`)) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              data[key.replace(`${storeName}_`, '')] = JSON.parse(value);
            } catch (parseError) {
              console.warn(`Failed to parse stored data: ${key}`, parseError);
            }
          }
        }
      });
      
      return data;
    } catch (error) {
      console.warn(`Failed to get store data: ${storeName}`, error);
      return {};
    }
  },

  /**
   * Export all persistent data as JSON
   */
  exportData: (): string => {
    try {
      if (typeof window === 'undefined') return '{}';
      
      const data: Record<string, unknown> = {};
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch (parseError) {
            console.warn(`Failed to parse stored data for export: ${key}`, parseError);
          }
        }
      });
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.warn('Failed to export data', error);
      return '{}';
    }
  },

  /**
   * Import data from JSON string
   */
  importData: (jsonData: string): boolean => {
    try {
      if (typeof window === 'undefined') return false;
      
      const data = JSON.parse(jsonData);
      
      Object.entries(data).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
      
      return true;
    } catch (error) {
      console.warn('Failed to import data', error);
      return false;
    }
  },

  /**
   * Get storage usage statistics
   */
  getStorageStats: (): { used: number; available: number; total: number } => {
    try {
      if (typeof window === 'undefined') return { used: 0, available: 0, total: 0 };
      
      let used = 0;
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          used += key.length + value.length;
        }
      });
      
      // Estimate available space (5MB is typical limit)
      const total = 5 * 1024 * 1024; // 5MB in bytes
      const available = total - used;
      
      return { used, available, total };
    } catch (error) {
      console.warn('Failed to get storage stats', error);
      return { used: 0, available: 0, total: 0 };
    }
  },
};

/**
 * Migration utilities for handling store schema changes
 */
export const migrationUtils = {
  /**
   * Migrate store data from old schema to new schema
   */
  migrateStoreData: <T>(
    storeName: string,
    currentVersion: string,
    migrations: Record<string, (data: unknown) => unknown>
  ): T | null => {
    try {
      if (typeof window === 'undefined') return null;
      
      const versionKey = `${storeName}_version`;
      const dataKey = `${storeName}_state`;
      
      const storedVersion = localStorage.getItem(versionKey);
      const storedData = localStorage.getItem(dataKey);
      
      if (!storedData) return null;
      
      let data = JSON.parse(storedData);
      
      // Apply migrations if needed
      if (storedVersion && storedVersion !== currentVersion) {
        const versionMigrations = Object.keys(migrations)
          .filter(version => version > storedVersion)
          .sort();
        
        versionMigrations.forEach(version => {
          const migration = migrations[version];
          if (migration) {
            data = migration(data);
          }
        });
      }
      
      // Update version
      localStorage.setItem(versionKey, currentVersion);
      localStorage.setItem(dataKey, JSON.stringify(data));
      
      return data;
    } catch (error) {
      console.warn(`Failed to migrate store data: ${storeName}`, error);
      return null;
    }
  },

  /**
   * Clear all migration data
   */
  clearMigrationData: (): void => {
    try {
      if (typeof window === 'undefined') return;
      
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.endsWith('_version')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear migration data', error);
    }
  },
};
