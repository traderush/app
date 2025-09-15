#!/usr/bin/env bun
/**
 * Script to run the TradeRush app
 */

import { TradeRushApp } from './src/app';

const port = parseInt(process.env.PORT || '8080');
const host = process.env.HOST || 'localhost';

console.log(`Starting TradeRush app on ${host}:${port}...`);

const app = new TradeRushApp({ port, host });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

// Start the app
app.start().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});