"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ClearingHouseService_1 = require("../services/ClearingHouseService");
const types_1 = require("../types");
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
};
const clearScreen = '\x1b[2J';
const moveCursor = (x, y) => `\x1b[${y};${x}H`;
const hideCursor = '\x1b[?25l';
const showCursor = '\x1b[?25h';
// Helper functions for colored output
const color = (text, colorCode) => `${colorCode}${text}${colors.reset}`;
const bold = (text) => `${colors.bold}${text}${colors.reset}`;
const dim = (text) => `${colors.dim}${text}${colors.reset}`;
const red = (text) => color(text, colors.red);
const green = (text) => color(text, colors.green);
const yellow = (text) => color(text, colors.yellow);
const cyan = (text) => color(text, colors.cyan);
const gray = (text) => color(text, colors.gray);
class IronCondorDemo {
    constructor(timeframe) {
        this.currentPrice = 0;
        this.userBalances = new Map();
        this.updateInterval = null;
        // Parse timeframe parameter
        switch (timeframe) {
            case '2s':
            case '2000':
                this.timeframe = types_1.TimeFrame.TWO_SECONDS;
                break;
            case '10s':
            case '10000':
                this.timeframe = types_1.TimeFrame.TEN_SECONDS;
                break;
            default:
                console.error('Invalid timeframe. Use: 2s or 10s');
                process.exit(1);
        }
        this.service = new ClearingHouseService_1.ClearingHouseService();
        // Access the orderbook through reflection
        const orderbooks = this.service.ironCondorOrderbooks;
        this.orderbook = orderbooks.get(this.timeframe);
        this.setupEventListeners();
        this.initializeUsers();
    }
    initializeUsers() {
        const users = ['alice', 'bob', 'charlie', 'david'];
        users.forEach((userId) => {
            this.service.initializeUser(userId);
            this.userBalances.set(userId, this.service.getUserBalance(userId));
        });
    }
    setupEventListeners() {
        // Price updates
        this.service.on('price_update', (data) => {
            this.currentPrice = data.price;
        });
        // Balance updates
        this.service.on('balance_updated', (data) => {
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
    updateDisplay() {
        // Clear screen and move cursor to top
        process.stdout.write(clearScreen + moveCursor(1, 1));
        // Header
        console.log(cyan('════════════════════════════════════════════════════════════════════════════════'));
        console.log(cyan(`                     IRON CONDOR ORDERBOOK - ${this.timeframe}ms                     `));
        console.log(cyan('════════════════════════════════════════════════════════════════════════════════'));
        // Current price
        console.log(`Current Price: ${bold(green(`$${this.currentPrice.toFixed(2)}`))}  |  Time: ${new Date().toLocaleTimeString()}`);
        console.log(gray('Each cell shows: [multiplier]x | $volume | positions | status'));
        console.log('────────────────────────────────────────────────────────────────────────────────');
        this.renderIronCondorTable();
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
    renderIronCondorTable() {
        // Get the contracts array through reflection
        const contracts = this.orderbook
            .contracts;
        const currentColumnIndex = this.orderbook
            .currentColumnIndex;
        const config = this.orderbook.config;
        const priceSpread = this.orderbook.priceSpread;
        // Calculate visible columns (show 15 columns)
        const visibleColumns = Math.min(15, contracts.length - currentColumnIndex);
        const startCol = currentColumnIndex;
        // Header row with time offsets
        let header = '     ';
        for (let col = 0; col < visibleColumns; col++) {
            const timeOffset = (col * this.timeframe) / 1000;
            header +=
                col === 0
                    ? cyan(`[NOW]`.padEnd(12))
                    : `+${timeOffset.toFixed(1)}s`.padEnd(12);
        }
        console.log(bold(header));
        console.log('     ' + '─'.repeat(visibleColumns * 12));
        // Contract rows
        const totalRows = config.rowsAbove + config.rowsBelow + 1;
        const centerRow = config.rowsBelow;
        for (let row = totalRows - 1; row >= 0; row--) {
            const rowOffset = row - centerRow;
            const priceLevel = this.currentPrice + rowOffset * priceSpread;
            const isCurrentPriceRow = Math.abs(priceLevel - this.currentPrice) < priceSpread / 2;
            let line = `${priceLevel.toFixed(0).padStart(4)} │`;
            for (let col = 0; col < visibleColumns; col++) {
                const contract = contracts[startCol + col]?.[row];
                if (!contract) {
                    line += gray('    ---    ');
                }
                else {
                    line += this.formatIronCondorCell(contract, col === 0);
                }
                line += ' ';
            }
            // Mark current price row
            if (isCurrentPriceRow) {
                console.log(yellow(bold(line)) + cyan(' ← current'));
            }
            else {
                console.log(line);
            }
        }
        // Show column shift info
        if (currentColumnIndex > 0) {
            console.log(`\n${gray(`Columns shifted: ${currentColumnIndex} | Time elapsed: ${((currentColumnIndex * this.timeframe) / 1000).toFixed(1)}s`)}`);
        }
    }
    formatIronCondorCell(contract, isCurrentColumn) {
        const multiplier = contract.returnMultiplier.toFixed(1);
        const volume = contract.totalVolume;
        let cellContent = `${multiplier}x`;
        if (contract.status === types_1.ContractStatus.EXERCISED) {
            return color(` ✓${cellContent}`.padEnd(10), colors.bgGreen);
        }
        else if (contract.status === types_1.ContractStatus.EXPIRED) {
            return color(` ✗${cellContent}`.padEnd(10), colors.bgRed);
        }
        else if (volume > 0) {
            const volStr = volume >= 1000 ? `${(volume / 1000).toFixed(0)}k` : volume.toString();
            cellContent = `${multiplier}x $${volStr}`;
            if (isCurrentColumn) {
                return color(cellContent.padEnd(10), colors.bgYellow);
            }
            else {
                return cyan(cellContent.padEnd(10));
            }
        }
        else {
            return dim(cellContent.padEnd(10));
        }
    }
    simulateTrading() {
        setInterval(() => {
            const users = Array.from(this.userBalances.keys());
            const user = users[Math.floor(Math.random() * users.length)];
            const balance = this.userBalances.get(user) || 0;
            if (balance < 10)
                return;
            const contracts = this.service.getActiveIronCondorContracts(this.timeframe);
            if (contracts.length > 0) {
                // Pick a random contract, preferring ones closer to current time
                const weights = contracts.map((_, i) => Math.exp(-i * 0.1));
                const totalWeight = weights.reduce((a, b) => a + b, 0);
                let random = Math.random() * totalWeight;
                let selectedIndex = 0;
                for (let i = 0; i < weights.length; i++) {
                    random -= weights[i];
                    if (random <= 0) {
                        selectedIndex = i;
                        break;
                    }
                }
                const contract = contracts[selectedIndex];
                const amount = Math.min(10 + Math.floor(Math.random() * 90), balance * 0.1);
                try {
                    const success = this.service.placeIronCondorPosition(user, contract.id, amount, this.timeframe);
                    if (success) {
                        // Position placed - will be shown in table
                    }
                }
                catch (error) {
                    // Position failed
                }
            }
        }, 1000); // Every second
    }
    shutdown() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        console.log(showCursor);
        console.log(red(bold('\n\nShutting down...')));
        this.service.destroy();
        process.exit(0);
    }
    async run() {
        console.log(green(bold(`Starting Iron Condor Demo (${this.timeframe}ms)...`)));
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
        await new Promise(() => { });
    }
}
// Get timeframe from command line argument
const timeframe = process.argv[2] || '2s';
const demo = new IronCondorDemo(timeframe);
demo.run().catch(console.error);
