// Games - These are the only exports actually used by frontend components
export { GridGame } from './games/grid/GridGame';

// Configuration
export { defaultTheme } from './config/theme';

// Utilities - EventEmitter is used by WebSocketClient (though that file is being deleted)
export { EventEmitter } from './utils/EventEmitter';