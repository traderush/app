import { ClearingHouseService } from '../services/ClearingHouseService';
import { SpreadOrderbook } from '../services/SpreadOrderbook';
import {
  ContractStatus,
  SpreadContract,
  SpreadType,
  TimeFrame,
} from '../types';

// ANSI escape codes for colors and cursor manipulation
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

const clearScreen = '\x1b[2J';
const moveCursor = (x: number, y: number) => `\x1b[${y};${x}H`;
const hideCursor = '\x1b[?25l';
const showCursor = '\x1b[?25h';

// Helper functions for colored output
const color = (text: string, colorCode: string) =>
  `${colorCode}${text}${colors.reset}`;
const bold = (text: string) => `${colors.bold}${text}${colors.reset}`;
const dim = (text: string) => `${colors.dim}${text}${colors.reset}`;
const red = (text: string) => color(text, colors.red);
const green = (text: string) => color(text, colors.green);
const yellow = (text: string) => color(text, colors.yellow);
const cyan = (text: string) => color(text, colors.cyan);
const gray = (text: string) => color(text, colors.gray);

class SpreadDemo {
  private service: ClearingHouseService;
  private currentPrice: number = 0;
  private priceHistory: number[] = [];
  private timeframe: TimeFrame;
  private orderbook: SpreadOrderbook;
  private userBalances: Map<string, number> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(timeframe: string) {
    // Parse timeframe parameter
    switch (timeframe) {
      case '2s':
      case '2000':
        this.timeframe = TimeFrame.TWO_SECONDS;
        break;
      case '10s':
      case '10000':
        this.timeframe = TimeFrame.TEN_SECONDS;
        break;
      default:
        console.error('Invalid timeframe. Use: 2s or 10s');
        process.exit(1);
    }

    this.service = new ClearingHouseService();
    // Access the orderbook through reflection
    const orderbooks = (this.service as any).spreadOrderbooks as Map<
      TimeFrame,
      SpreadOrderbook
    >;
    this.orderbook = orderbooks.get(this.timeframe)!;

    this.setupEventListeners();
    this.initializeUsers();
  }

  private initializeUsers(): void {
    const users = ['alice', 'bob', 'charlie', 'david'];
    users.forEach((userId) => {
      this.service.initializeUser(userId);
      this.userBalances.set(userId, this.service.getUserBalance(userId));
    });
  }

  private setupEventListeners(): void {
    // Price updates
    this.service.on('price_update', (data: any) => {
      this.currentPrice = data.price;
      this.priceHistory.push(data.price);
      if (this.priceHistory.length > 20) {
        this.priceHistory.shift();
      }
    });

    // Balance updates
    this.service.on('balance_updated', (data: any) => {
      this.userBalances.set(data.userId, data.balance);
    });

    // Handle keyboard input
    process.stdin.setRawMode(true);
    process.stdin.on('data', (key) => {
      if (key.toString() === '\u0003') {
        // Ctrl+C
        this.shutdown();
      }
    });
  }

  private updateDisplay(): void {
    // Clear screen and move cursor to top
    process.stdout.write(clearScreen + moveCursor(1, 1));

    // Header
    console.log(
      cyan(
        '════════════════════════════════════════════════════════════════════════════════'
      )
    );
    console.log(
      cyan(
        `                        SPREAD ORDERBOOK - ${this.timeframe}ms                        `
      )
    );
    console.log(
      cyan(
        '════════════════════════════════════════════════════════════════════════════════'
      )
    );

    // Current price with mini chart
    const priceChange =
      this.priceHistory.length > 1
        ? this.currentPrice - this.priceHistory[this.priceHistory.length - 2]
        : 0;
    const priceColor = priceChange >= 0 ? green : red;
    console.log(
      `Current Price: ${bold(priceColor(`$${this.currentPrice.toFixed(2)} ${priceChange >= 0 ? '↑' : '↓'}`))}  |  Time: ${new Date().toLocaleTimeString()}`
    );

    // Mini price chart
    this.renderMiniChart();

    console.log(gray('\nEach cell shows: [multiplier]x | $volume | status'));
    console.log(
      '────────────────────────────────────────────────────────────────────────────────'
    );

    this.renderSpreadTable();

    // User balances
    console.log('\n' + yellow(bold('User Balances:')));
    let balanceStr = '';
    this.userBalances.forEach((balance, userId) => {
      const profit = balance - 1000;
      const profitColor = profit >= 0 ? green : red;
      balanceStr += `${userId}: $${balance.toFixed(0)} (${profitColor(`${profit >= 0 ? '+' : ''}${profit.toFixed(0)}`)})  `;
    });
    console.log(balanceStr);

    console.log('\n' + gray('Press Ctrl+C to exit'));
  }

  private renderMiniChart(): void {
    if (this.priceHistory.length < 2) return;

    const height = 5;
    const width = Math.min(this.priceHistory.length, 20);
    const min = Math.min(...this.priceHistory);
    const max = Math.max(...this.priceHistory);
    const range = max - min || 1;

    for (let y = height - 1; y >= 0; y--) {
      let line = '';
      for (let x = 0; x < width; x++) {
        const price = this.priceHistory[x];
        const normalized = (price - min) / range;
        const chartY = Math.round(normalized * (height - 1));

        if (chartY === y) {
          line += green('█');
        } else if (chartY > y) {
          line += dim('░');
        } else {
          line += ' ';
        }
      }
      console.log('  ' + line);
    }
  }

  private renderSpreadTable(): void {
    // Get the contracts array through reflection
    const contracts = (this.orderbook as any).contracts as [
      SpreadContract | null,
      SpreadContract | null,
    ][];
    const currentColumnIndex = (this.orderbook as any)
      .currentColumnIndex as number;

    // Calculate visible columns (show 20 columns)
    const visibleColumns = Math.min(20, contracts.length - currentColumnIndex);
    const startCol = currentColumnIndex;

    // Header row with time offsets
    let header = '         ';
    for (let col = 0; col < visibleColumns; col++) {
      const timeOffset = (col * this.timeframe) / 1000;
      if (col === 0) {
        header += cyan(`[NOW]`.padEnd(9));
      } else {
        header += `+${timeOffset.toFixed(0)}s`.padEnd(9);
      }
    }
    console.log(bold(header));
    console.log('         ' + '─'.repeat(visibleColumns * 9));

    // CALL contracts row
    let callRow = green('CALL  │ ');
    for (let col = 0; col < visibleColumns; col++) {
      const [call] = contracts[startCol + col] || [null, null];
      if (call) {
        callRow += this.formatSpreadCell(call, col === 0, true);
      } else {
        callRow += gray('  ---   ');
      }
    }
    console.log(callRow);

    // Strike prices row
    let strikeRow = '      │ ';
    for (let col = 0; col < visibleColumns; col++) {
      const [call] = contracts[startCol + col] || [null, null];
      if (call) {
        const strike = call.strikePrice;
        const isAbovePrice = strike > this.currentPrice;
        strikeRow += isAbovePrice
          ? dim(`${strike.toFixed(0)}`.padEnd(8))
          : gray(`${strike.toFixed(0)}`.padEnd(8));
      } else {
        strikeRow += '        ';
      }
    }
    console.log(gray(strikeRow));

    // Current price line
    console.log(
      yellow(
        `══════╪${'═'.repeat(visibleColumns * 9 - 1)} Price: ${this.currentPrice.toFixed(2)}`
      )
    );

    // PUT strike prices row
    strikeRow = '      │ ';
    for (let col = 0; col < visibleColumns; col++) {
      const [, put] = contracts[startCol + col] || [null, null];
      if (put) {
        const strike = put.strikePrice;
        const isBelowPrice = strike < this.currentPrice;
        strikeRow += isBelowPrice
          ? dim(`${strike.toFixed(0)}`.padEnd(8))
          : gray(`${strike.toFixed(0)}`.padEnd(8));
      } else {
        strikeRow += '        ';
      }
    }
    console.log(gray(strikeRow));

    // PUT contracts row
    let putRow = red('PUT   │ ');
    for (let col = 0; col < visibleColumns; col++) {
      const [, put] = contracts[startCol + col] || [null, null];
      if (put) {
        putRow += this.formatSpreadCell(put, col === 0, false);
      } else {
        putRow += gray('  ---   ');
      }
    }
    console.log(putRow);

    // Show column shift info
    if (currentColumnIndex > 0) {
      console.log(
        `\n${gray(`Columns shifted: ${currentColumnIndex} | Time elapsed: ${((currentColumnIndex * this.timeframe) / 1000).toFixed(1)}s`)}`
      );
    }
  }

  private formatSpreadCell(
    contract: SpreadContract,
    isCurrentColumn: boolean,
    isCall: boolean
  ): string {
    const multiplier = contract.returnMultiplier.toFixed(1);
    const volume = contract.totalVolume;

    let cellContent = `${multiplier}x`;

    if (contract.status === ContractStatus.TRIGGERED) {
      return color(` ✓${cellContent}`.padEnd(8), colors.bgGreen);
    } else if (contract.status === ContractStatus.EXPIRED) {
      return color(` ✗${cellContent}`.padEnd(8), colors.bgRed);
    } else if (volume > 0) {
      const volStr =
        volume >= 1000 ? `${(volume / 1000).toFixed(0)}k` : volume.toString();
      cellContent = `${multiplier}x$${volStr}`;

      // Check if in the money
      const inTheMoney = isCall
        ? contract.strikePrice < this.currentPrice
        : contract.strikePrice > this.currentPrice;

      if (isCurrentColumn && inTheMoney) {
        return color(cellContent.padEnd(8), colors.bgYellow);
      } else if (inTheMoney) {
        return bold(cyan(cellContent.padEnd(8)));
      } else {
        return cyan(cellContent.padEnd(8));
      }
    } else {
      return dim(cellContent.padEnd(8));
    }
  }

  private simulateTrading(): void {
    setInterval(() => {
      const users = Array.from(this.userBalances.keys());
      const user = users[Math.floor(Math.random() * users.length)];
      const balance = this.userBalances.get(user) || 0;

      if (balance < 10) return;

      const contracts = this.service.getActiveSpreadContracts(this.timeframe);
      if (contracts.length > 0) {
        // Pick contracts based on price direction
        const priceDirection =
          this.priceHistory.length > 1
            ? this.currentPrice -
              this.priceHistory[this.priceHistory.length - 2]
            : 0;

        // Filter contracts based on sentiment
        const filteredContracts = contracts.filter((c) => {
          if (Math.random() < 0.3) return true; // 30% random
          if (priceDirection > 0 && c.spreadType === SpreadType.CALL)
            return true;
          if (priceDirection < 0 && c.spreadType === SpreadType.PUT)
            return true;
          return false;
        });

        if (filteredContracts.length > 0) {
          const contract =
            filteredContracts[
              Math.floor(Math.random() * filteredContracts.length)
            ];
          const amount = Math.min(
            10 + Math.floor(Math.random() * 90),
            balance * 0.15
          );

          try {
            const result = this.service.placeSpreadPosition(
              user,
              contract.id,
              amount,
              this.timeframe
            );
            if (result.success) {
              // Position placed - will be shown in table
            }
          } catch (error) {
            // Position failed
          }
        }
      }
    }, 1500); // Every 1.5 seconds
  }

  private shutdown(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    console.log(showCursor);
    console.log(red(bold('\n\nShutting down...')));
    this.service.destroy();
    process.exit(0);
  }

  async run(): Promise<void> {
    console.log(green(bold(`Starting Spread Demo (${this.timeframe}ms)...`)));
    console.log(hideCursor);

    // Start price feed
    this.service.startPriceFeed();

    // Start display updates
    this.updateInterval = setInterval(() => this.updateDisplay(), 100);

    // Simulate trading activity
    this.simulateTrading();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.shutdown();
    });

    // Keep the process running
    await new Promise(() => {});
  }
}

// Get timeframe from command line argument
const timeframe = process.argv[2] || '2s';
const demo = new SpreadDemo(timeframe);
demo.run().catch(console.error);
