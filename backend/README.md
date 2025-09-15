# TradeRush Backend

A mock WebSocket backend for the TradeRush multiplayer trading games platform.

## Features

- **Real-time WebSocket communication** for all game modes
- **Multiple game types**: Grid, Boxes, Snake, and Sketch
- **Configurable game modes**: Unlimited, Timed, Limited Bets
- **User management** with balance tracking
- **Dynamic price feed** with adjustable volatility
- **Hit detection** and payout calculation
- **Session management** for multiple concurrent games

## Installation

```bash
cd backend
npm install
```

## Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start

# Run test client
npm test
```

## WebSocket API

### Connection

Connect to the WebSocket server:
```
ws://localhost:8080?username=YourUsername
```

### Message Format

All messages follow this structure:
```typescript
{
  type: string
  payload: any
  timestamp: number
}
```

### Client -> Server Messages

#### Join Game
```json
{
  "type": "join_game",
  "payload": {
    "gameType": "grid" | "boxes" | "snake" | "sketch",
    "timeframe": "1m" | "5m" | "15m" | "1h" | "4h" | "1d",
    "mode": "unlimited" | "timed" | "limited_bets",
    "options": {
      "duration": 300,  // seconds (for timed mode)
      "maxBets": 10     // (for limited_bets mode)
    }
  }
}
```

#### Place Trade (Grid/Boxes)
```json
{
  "type": "place_trade",
  "payload": {
    "boxId": "box_123",
    "amount": 10,
    "timeframe": "1m"
  }
}
```

#### Place Square (Snake)
```json
{
  "type": "place_square",
  "payload": {
    "x": 200,
    "y": 150,
    "timestamp": 1234567890
  }
}
```

#### Submit Sketch
```json
{
  "type": "submit_sketch",
  "payload": {
    "points": [
      { "x": 100, "y": 120 },
      { "x": 110, "y": 125 },
      ...
    ],
    "timeframe": "1m",
    "tradeAmount": 50
  }
}
```

#### Get State
```json
{
  "type": "get_state",
  "payload": {}
}
```

#### Leave Game
```json
{
  "type": "leave_game",
  "payload": {}
}
```

### Server -> Client Messages

#### Connected
```json
{
  "type": "connected",
  "payload": {
    "userId": "user_1",
    "username": "YourUsername",
    "balance": 1000
  }
}
```

#### Price Update
```json
{
  "type": "price_update",
  "payload": {
    "price": 105.23,
    "timestamp": 1234567890,
    "timeframe": "1m"
  }
}
```

#### Box Multipliers (Grid/Boxes)
```json
{
  "type": "box_multipliers",
  "payload": {
    "timeframe": "1m",
    "multipliers": [
      {
        "id": "box_1",
        "x": 100,
        "y": 150,
        "multiplier": 2.5,
        "totalTrades": 250,
        "userTrade": 10
      }
    ]
  }
}
```

#### Box Hit (Grid/Boxes)
```json
{
  "type": "box_hit",
  "payload": {
    "boxId": "box_1",
    "multiplier": 2.5,
    "winners": [
      {
        "userId": "user_1",
        "trade": 10,
        "payout": 25
      }
    ]
  }
}
```

#### Snake State
```json
{
  "type": "snake_state",
  "payload": {
    "pricePosition": 450,
    "userScore": 125,
    "activeSquares": [
      {
        "id": "square_1",
        "x": 200,
        "y": 150,
        "hit": false
      }
    ]
  }
}
```

#### Square Hit (Snake)
```json
{
  "type": "square_hit",
  "payload": {
    "squareId": "square_1",
    "points": 15,
    "totalScore": 140
  }
}
```

#### Sketch Result
```json
{
  "type": "sketch_result",
  "payload": {
    "accuracy": 0.85,
    "payout": 150,
    "comparisonPoints": [
      {
        "predicted": { "x": 100, "y": 120 },
        "actual": { "x": 100, "y": 118 },
        "deviation": 2
      }
    ]
  }
}
```

## Game Configuration

Each game engine can be configured with specific parameters:

### Grid/Boxes Config
```typescript
{
  minBet: 1,
  maxBet: 100,
  gridSize: 50,
  multiplierRange: { min: 1.2, max: 50 },
  sparseRatio: 0.1  // For boxes game
}
```

### Snake Config
```typescript
{
  minBet: 1,
  maxBet: 100,
  squareSize: 15,
  minSquareDistance: 20,
  baseMultiplier: 1.5,
  maxRiskMultiplier: 2
}
```

### Sketch Config
```typescript
{
  minBet: 1,
  maxBet: 100,
  drawingAreaPercent: 0.6,
  accuracyThresholds: {
    none: 0.3,
    half: 0.5,
    normal: 0.7,
    good: 0.9,
    excellent: 0.95
  },
  payoutMultipliers: {
    none: 0,
    half: 0.5,
    normal: 1.5,
    good: 3,
    excellent: 5
  }
}
```

## Architecture

The backend is organized into several key services:

1. **PriceFeedService**: Generates simulated price data with configurable volatility
2. **UserService**: Manages user accounts, balances, and active bets
3. **Game Engines**: Separate engines for each game type handling game-specific logic
4. **WebSocketServer**: Orchestrates all services and handles client communication

## Future Enhancements

- Database integration for persistence
- Redis for session caching
- Authentication and authorization
- Real price data integration
- Leaderboards and statistics
- Multi-server scaling with session affinity
- Replay system for game history