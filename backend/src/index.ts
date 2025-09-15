import { TradeRushApp } from './app';

// Create and start the application
const port = parseInt(process.env.PORT || '8080');
const host = process.env.HOST || 'localhost';

const app = new TradeRushApp({ port, host });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down server...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down server...');
  await app.stop();
  process.exit(0);
});

// Start the application
app.start().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
