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
    bgBlue: '\x1b[44m',
    bgCyan: '\x1b[46m',
};
const moveCursor = (x, y) => `\x1b[${y};${x}H`;
const hideCursor = '\x1b[?25l';
const showCursor = '\x1b[?25h';
const clearScreen = '\x1b[2J';
// Helper functions for colored output
const color = (text, colorCode) => `${colorCode}${text}${colors.reset}`;
const bold = (text) => `${colors.bold}${text}${colors.reset}`;
const dim = (text) => `${colors.dim}${text}${colors.reset}`;
const red = (text) => color(text, colors.red);
const green = (text) => color(text, colors.green);
const yellow = (text) => color(text, colors.yellow);
const blue = (text) => color(text, colors.blue);
const cyan = (text) => color(text, colors.cyan);
const gray = (text) => color(text, colors.gray);
class ClearingHouseDemo {
    constructor() {
        this.currentPrice = 0;
        this.priceHistory = [];
        this.maxHistoryLength = 50;
        this.userBalances = new Map();
        this.selectedView = 'iron_condor';
        this.selectedTimeframe = types_1.TimeFrame.TWO_SECONDS;
        this.service = new ClearingHouseService_1.ClearingHouseService();
        // Access the private orderbooks through reflection (for demo purposes)
        this.ironCondorOrderbooks = this.service.ironCondorOrderbooks;
        this.spreadOrderbooks = this.service.spreadOrderbooks;
        this.setupEventListeners();
        this.initializeUsers();
    }
    initializeUsers() {
        // Initialize demo users
        const users = ['alice', 'bob', 'charlie'];
        users.forEach((userId) => {
            this.service.initializeUser(userId);
            this.userBalances.set(userId, this.service.getUserBalance(userId));
        });
    }
    setupEventListeners() {
        // Price updates
        this.service.on('price_update', (data) => {
            this.currentPrice = data.price;
            this.priceHistory.push(data.price);
            if (this.priceHistory.length > this.maxHistoryLength) {
                this.priceHistory.shift();
            }
            this.updateDisplay();
        });
        // Balance updates
        this.service.on('balance_updated', (data) => {
            this.userBalances.set(data.userId, data.balance);
        });
        // Update display on contract updates
        this.service.on('iron_condor_contracts_updated', () => {
            if (this.selectedView === 'iron_condor') {
                this.updateDisplay();
            }
        });
        this.service.on('contracts_updated', () => {
            if (this.selectedView === 'spread') {
                this.updateDisplay();
            }
        });
        // Listen for keyboard input
        process.stdin.setRawMode(true);
        process.stdin.on('data', (key) => {
            const k = key.toString();
            if (k === '\u0003') {
                // Ctrl+C
                this.shutdown();
            }
            else if (k === '1') {
                this.selectedView = 'iron_condor';
                this.updateDisplay();
            }
            else if (k === '2') {
                this.selectedView = 'spread';
                this.updateDisplay();
            }
            else if (k === 't') {
                this.selectedTimeframe = types_1.TimeFrame.TWO_SECONDS;
                this.updateDisplay();
            }
            else if (k === 's') {
                this.selectedTimeframe = types_1.TimeFrame.TEN_SECONDS;
                this.updateDisplay();
            }
        });
    }
    shutdown() {
        console.log(showCursor);
        console.log(red(bold('\n\nShutting down...')));
        this.service.destroy();
        process.exit(0);
    }
    updateDisplay() {
        // Clear screen and move cursor to top
        process.stdout.write(clearScreen + moveCursor(1, 1));
        // Header
        console.log(cyan('═══════════════════════════════════════════════════════════════════════════════'));
        console.log(cyan('                           CLEARINGHOUSE VISUALIZATION                          '));
        console.log(cyan('═══════════════════════════════════════════════════════════════════════════════'));
        // Price and Controls
        const priceChange = this.priceHistory.length > 1
            ? this.currentPrice - this.priceHistory[this.priceHistory.length - 2]
            : 0;
        const priceDisplay = priceChange >= 0
            ? green(`$${this.currentPrice.toFixed(2)} ↑`)
            : red(`$${this.currentPrice.toFixed(2)} ↓`);
        console.log(`Current Price: ${priceDisplay}  |  View: ${bold(this.selectedView === 'iron_condor' ? 'Iron Condor' : 'Spread')}  |  Timeframe: ${bold(this.selectedTimeframe + 'ms')}`);
        console.log(gray('Controls: [1] Iron Condor  [2] Spread  [t] 2s  [s] 10s  [Ctrl+C] Exit'));
        console.log('───────────────────────────────────────────────────────────────────────────────');
        // Display the appropriate view
        if (this.selectedView === 'iron_condor') {
            this.renderIronCondorTable();
        }
        else {
            this.renderSpreadTable();
        }
        // User Balances at bottom
        console.log('\n' + yellow(bold('User Balances:')));
        let balanceStr = '';
        this.userBalances.forEach((balance, userId) => {
            const profit = balance - 1000;
            const profitDisplay = profit >= 0
                ? green(`+${profit.toFixed(0)}`)
                : red(`${profit.toFixed(0)}`);
            balanceStr += `${userId}: $${balance.toFixed(0)} (${profitDisplay})  `;
        });
        console.log(balanceStr);
    }
    renderIronCondorTable() {
        const orderbook = this.ironCondorOrderbooks.get(this.selectedTimeframe);
        if (!orderbook)
            return;
        // Get the contracts array through reflection
        const contracts = orderbook
            .contracts;
        const currentColumnIndex = orderbook.currentColumnIndex;
        const config = orderbook.config;
        console.log(bold(`\nIron Condor Table (${this.selectedTimeframe}ms timeframe):`));
        console.log(gray('Each cell shows: [multiplier]x $volume (positions)'));
        console.log();
        // Calculate visible columns (show 10 columns)
        const visibleColumns = Math.min(10, contracts.length - currentColumnIndex);
        const startCol = currentColumnIndex;
        // Header row with time offsets
        let header = '     ';
        for (let col = 0; col < visibleColumns; col++) {
            const timeOffset = (col * this.selectedTimeframe) / 1000;
            header += `   +${timeOffset.toFixed(1)}s  `;
        }
        console.log(gray(header));
        console.log('     ' + '─'.repeat(visibleColumns * 9));
        // Contract rows
        const totalRows = config.rowsAbove + config.rowsBelow + 1;
        const centerRow = config.rowsBelow;
        for (let row = totalRows - 1; row >= 0; row--) {
            const rowOffset = row - centerRow;
            const priceLevel = this.currentPrice + rowOffset * 1;
            let line = `${priceLevel.toFixed(0).padStart(4)} │`;
            for (let col = 0; col < visibleColumns; col++) {
                const contract = contracts[startCol + col]?.[row];
                if (!contract) {
                    line += '   ---  ';
                }
                else {
                    const cell = this.formatIronCondorCell(contract);
                    line += cell;
                }
            }
            // Mark current price row
            if (Math.abs(priceLevel - this.currentPrice) < 0.5) {
                console.log(yellow(line) + ' ← current');
            }
            else {
                console.log(line);
            }
        }
    }
    formatIronCondorCell(contract) {
        const multiplier = contract.returnMultiplier.toFixed(1);
        const volume = contract.totalVolume;
        let cellColor = colors.reset;
        if (contract.status === types_1.ContractStatus.EXERCISED) {
            cellColor = colors.bgGreen;
        }
        else if (contract.status === types_1.ContractStatus.EXPIRED) {
            cellColor = colors.bgRed;
        }
        else if (volume > 0) {
            cellColor = colors.cyan;
        }
        const content = `${multiplier}x`;
        if (volume > 0) {
            return color(` ${content.padEnd(4)}`, cellColor) + ' ';
        }
        else {
            return dim(` ${content.padEnd(4)}`) + ' ';
        }
    }
    renderSpreadTable() {
        const orderbook = this.spreadOrderbooks.get(this.selectedTimeframe);
        if (!orderbook) {
            console.log(red('\nSpread orderbook not available for this timeframe'));
            return;
        }
        // Get the contracts array through reflection
        const contracts = orderbook.contracts;
        const currentColumnIndex = orderbook.currentColumnIndex;
        console.log(bold(`\nSpread Table (${this.selectedTimeframe}ms timeframe):`));
        console.log(gray('Each row shows: [type] strike @ multiplierx $volume'));
        console.log();
        // Calculate visible columns (show 10 columns)
        const visibleColumns = Math.min(10, contracts.length - currentColumnIndex);
        const startCol = currentColumnIndex;
        // Header row with time offsets
        let header = '          ';
        for (let col = 0; col < visibleColumns; col++) {
            const timeOffset = (col * this.selectedTimeframe) / 1000;
            header += `  +${timeOffset.toFixed(1)}s  `;
        }
        console.log(gray(header));
        console.log('          ' + '─'.repeat(visibleColumns * 8));
        // Call contracts row
        let callRow = 'CALL  │ ';
        for (let col = 0; col < visibleColumns; col++) {
            const [call] = contracts[startCol + col] || [null, null];
            if (call) {
                callRow += this.formatSpreadCell(call);
            }
            else {
                callRow += '  ---  ';
            }
        }
        console.log(callRow);
        // Current price indicator
        console.log(yellow(`      │ ${'═'.repeat(visibleColumns * 8 - 2)} Price: ${this.currentPrice.toFixed(2)}`));
        // Put contracts row
        let putRow = 'PUT   │ ';
        for (let col = 0; col < visibleColumns; col++) {
            const [, put] = contracts[startCol + col] || [null, null];
            if (put) {
                putRow += this.formatSpreadCell(put);
            }
            else {
                putRow += '  ---  ';
            }
        }
        console.log(putRow);
    }
    formatSpreadCell(contract) {
        const multiplier = contract.returnMultiplier.toFixed(1);
        const volume = contract.totalVolume;
        let cellColor = colors.reset;
        if (contract.status === types_1.ContractStatus.TRIGGERED) {
            cellColor = colors.bgGreen;
        }
        else if (contract.status === types_1.ContractStatus.EXPIRED) {
            cellColor = colors.bgRed;
        }
        else if (volume > 0) {
            cellColor = colors.cyan;
        }
        const content = `${multiplier}x`;
        if (volume > 0) {
            return color(` ${content.padEnd(5)}`, cellColor) + ' ';
        }
        else {
            return dim(` ${content.padEnd(5)}`) + ' ';
        }
    }
    async run() {
        console.log(green(bold('Starting Clearinghouse Demo...')));
        console.log(hideCursor);
        // Start price feed
        this.service.startPriceFeed();
        // Initial display
        this.updateDisplay();
        // Simulate some trading activity
        this.simulateTrading();
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            this.shutdown();
        });
        // Keep the process running
        await new Promise(() => { });
    }
    async simulateTrading() {
        // Simulate random trades every few seconds
        setInterval(() => {
            const users = Array.from(this.userBalances.keys());
            const user = users[Math.floor(Math.random() * users.length)];
            const balance = this.userBalances.get(user) || 0;
            if (balance < 10)
                return; // Skip if low balance
            // Randomly choose contract type
            const contractType = Math.random() > 0.5 ? 'ironCondor' : 'spread';
            if (contractType === 'ironCondor') {
                const timeframes = (0, types_1.getAllTimeframes)();
                const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
                const contracts = this.service.getActiveIronCondorContracts(timeframe);
                if (contracts.length > 0) {
                    const contract = contracts[Math.floor(Math.random() * contracts.length)];
                    const amount = Math.min(10 + Math.floor(Math.random() * 40), balance);
                    try {
                        const success = this.service.placeIronCondorPosition(user, contract.id, amount, timeframe);
                        if (success) {
                            console.log(blue(`\n→ ${user} placed $${amount} on Iron Condor ${contract.returnMultiplier}x`));
                        }
                    }
                    catch (error) {
                        // Position failed, ignore
                    }
                }
            }
            else {
                const timeframes = [types_1.TimeFrame.TWO_SECONDS, types_1.TimeFrame.TEN_SECONDS];
                const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
                const contracts = this.service.getActiveSpreadContracts(timeframe);
                if (contracts.length > 0) {
                    const contract = contracts[Math.floor(Math.random() * contracts.length)];
                    const amount = Math.min(10 + Math.floor(Math.random() * 40), balance);
                    try {
                        const result = this.service.placeSpreadPosition(user, contract.id, amount, timeframe);
                        if (result.success) {
                            console.log(blue(`\n→ ${user} placed $${amount} on ${contract.spreadType} Spread ${contract.returnMultiplier}x`));
                        }
                    }
                    catch (error) {
                        // Position failed, ignore
                    }
                }
            }
        }, 3000); // Every 3 seconds
    }
}
// Run the demo
const demo = new ClearingHouseDemo();
demo.run().catch(console.error);
