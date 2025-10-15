# TradeRush

A high-performance, real-time cryptocurrency trading platform with live price data, canvas-based visualizations, and sophisticated trading mechanics.

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.5-black)
![Zustand](https://img.shields.io/badge/Zustand-5.0-orange)

## 🚀 Features

### Real-Time Trading
- **Live Price Data**: Multi-exchange price feeds with weighted averaging
- **Canvas Visualization**: High-performance HTML5 canvas with smooth animations
- **Trading Mechanics**: Box-based selection with hit/miss detection
- **Position Tracking**: Real-time P&L and trade history

### Advanced UI
- **Responsive Design**: Optimized for desktop trading workflows
- **Customizable Theme**: User-configurable color schemes and layouts
- **Player Tracking**: Watchlist and leaderboard functionality
- **Performance Monitoring**: Built-in P&L tracker and statistics

### Technical Excellence
- **TypeScript**: Strict type safety throughout the codebase
- **State Management**: Consolidated Zustand stores with persistence
- **Performance**: 60 FPS canvas rendering with memory management
- **Real-Time**: WebSocket connections with automatic reconnection

## 🏗️ Architecture

### Core Stack
- **Frontend**: Next.js 15 with App Router
- **State**: Zustand with persist middleware
- **Styling**: Tailwind CSS with custom design system
- **Canvas**: Custom HTML5 Canvas engine
- **Backend**: Bun runtime with WebSocket server

### State Management
```typescript
// Consolidated stores for optimal performance
useAppStore()     // User profile, settings, UI state
useTradingStore() // Trades, positions, price data, game stats
useConnectionStore() // WebSocket status and connections
```

## 🎮 Trading Interface

### Box Hit Game
- **Grid Selection**: Click boxes to place trades
- **Multiplier System**: 1.0x - 15.0x multiplier range
- **Hit Detection**: Real-time price line intersection
- **Probability Heatmap**: Visual probability indicators
- **Timeframe Options**: 0.5s - 10s trading intervals

### Live Features
- **Real-Time Prices**: Multi-exchange price aggregation
- **Player Activity**: See other traders' selections
- **Performance Stats**: Win rate, streak tracking, P&L
- **Watchlist**: Track favorite traders and their performance

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- npm/yarn/pnpm

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Optional: Start mock backend
cd backend && bun install && bun run dev
```

### Development
```bash
npm run dev    # Frontend: http://localhost:3000
npm run build  # Production build
npm run start  # Production server
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js pages
│   └── box-hit/           # Main trading interface
├── components/             # React components
│   ├── canvas/            # Canvas trading view
│   ├── AppShell.tsx       # Main layout
│   └── [popups]/          # Modal components
├── stores/                 # Zustand state management
│   ├── appStore.ts        # User & UI state
│   ├── tradingStore.ts    # Trading & game data
│   └── connectionStore.ts # WebSocket connections
├── lib/                    # Core libraries
│   └── canvasLogic/       # Canvas rendering engine
└── types/                  # TypeScript definitions
```

## 🎯 Key Components

### Canvas Engine
- **World Coordinates**: Sophisticated coordinate transformation
- **Performance**: 60 FPS with automatic memory cleanup
- **Rendering**: Multi-layer rendering pipeline
- **Animations**: Smooth state transitions and effects

### State Management
- **Consolidated Stores**: Reduced from 5 to 3 optimized stores
- **Persistence**: Automatic localStorage synchronization
- **Performance**: Selective subscriptions prevent unnecessary re-renders
- **Type Safety**: Full TypeScript coverage

### Trading Logic
- **Price Aggregation**: Binance (60%), Coinbase (25%), Kraken (15%)
- **Hit Detection**: Liang-Barsky line intersection algorithm
- **Position Management**: Real-time trade tracking and settlement
- **Statistics**: Comprehensive win/loss analytics

## 🔧 Configuration

### Environment Variables
```bash
# Optional: WebSocket endpoints
NEXT_PUBLIC_WS_URL=ws://localhost:8080
NEXT_PUBLIC_PRICE_FEEDS=binance,coinbase,kraken
```

### Performance Settings
- **Canvas FPS**: 60 FPS target with frame throttling
- **Memory Limits**: Max 500 boxes, 100 animations
- **Price Updates**: 500ms intervals with smoothing
- **Cleanup**: Automatic every 5 seconds

## 📊 Performance

### Optimizations
- **React.memo**: Expensive component memoization
- **useRef**: High-frequency updates without re-renders
- **Viewport Culling**: Skip off-screen rendering
- **Memory Management**: Bounded data structures

### Metrics
- **FPS**: Stable 60 FPS in production
- **Memory**: Bounded with automatic cleanup
- **Latency**: <100ms price update latency
- **Bundle**: Optimized with tree-shaking

## 🧪 Testing

### Mock Backend
1. Navigate to `/box-hit`
2. Enable "Mock Backend" mode
3. Click "Start Trading"
4. Test all trading features with simulated data

### Performance Testing
- Long-running sessions maintain 60 FPS
- Memory usage remains bounded
- No memory leaks detected

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Auto-Deployment
- **Git**: Auto-push on commit
- **Vercel**: Automatic deployment on main branch
- **Build Status**: ✅ Passing

## 📝 Code Quality

- ✅ **TypeScript**: Strict mode, zero errors
- ✅ **Linting**: ESLint with strict rules
- ✅ **Performance**: Optimized for 60 FPS
- ✅ **Documentation**: Comprehensive inline docs
- ✅ **Testing**: Manual testing procedures

## 🤝 Contributing

### Standards
1. Use TypeScript strict mode
2. Add JSDoc to public APIs
3. Use React.memo for expensive components
4. Prefer useRef for high-frequency updates
5. Clean up effects and subscriptions

### Commit Format
```
type: brief description

- Detailed change 1
- Detailed change 2
```

Types: `feat`, `fix`, `perf`, `docs`, `refactor`, `test`, `chore`

## 📄 License

Proprietary - TradeRush Platform

---

Developed with ❤️ by the TradeRush team