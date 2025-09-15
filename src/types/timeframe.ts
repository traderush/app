// Re-export everything from the centralized timeframe config
export * from '../../backend/src/config/timeframeConfig';

// Additional legacy exports for backward compatibility
export {
  isValidTimeframe as isValidTimeFrame,
  timeframeToDisplayString as timeframeToBackendString,
} from '../../backend/src/config/timeframeConfig';
