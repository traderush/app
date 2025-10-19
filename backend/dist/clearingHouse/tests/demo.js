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
        this.service = new ClearingHouseService_1.ClearingHouseService();
        this.currentPrice = 0;
        this.priceHistory = [];
        this.maxHistoryLength = 50;
        this.userBalances = new Map();
        this.selectedView = 'iron_condor';
        this.selectedTimeframe = types_1.TimeFrame.TWO_SECONDS;
        this.setupEventListeners();
        this.initializeUsers();
    }
    initializeUsers() {
        const users = ['alice', 'bob', 'charlie'];
        users.forEach((userId) => {
            this.service.initializeUser(userId);
            this.userBalances.set(userId, this.service.getUserBalance(userId));
        });
    }
    setupEventListeners() {
        this.service.on('price_update', (data) => {
            this.currentPrice = data.price;
            this.priceHistory.push(data.price);
            if (this.priceHistory.length > this.maxHistoryLength) {
                this.priceHistory.shift();
            }
            this.updateDisplay();
        });
        this.service.on('balance_updated', (data) => {
            this.userBalances.set(data.userId, data.balance);
        });
        this.service.on('contracts_updated', (payload) => {
            if ((payload.product === 'iron_condor' && this.selectedView === 'iron_condor') ||
                (payload.product === 'spread' && this.selectedView === 'spread')) {
                this.updateDisplay();
            }
        });
        process.stdin.setRawMode(true);
        process.stdin.on('data', (key) => {
            const k = key.toString();
            if (k === '\u0003') {
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
        process.stdout.write(clearScreen + moveCursor(1, 1));
        console.log(cyan('═══════════════════════════════════════════════════════════════════════════════'));
        console.log(cyan('                           CLEARINGHOUSE VISUALIZATION                          '));
        console.log(cyan('═══════════════════════════════════════════════════════════════════════════════'));
        const priceChange = this.priceHistory.length > 1
            ? this.currentPrice - this.priceHistory[this.priceHistory.length - 2]
            : 0;
        const priceDisplay = priceChange >= 0
            ? green(`$${this.currentPrice.toFixed(2)} ↑`)
            : red(`$${this.currentPrice.toFixed(2)} ↓`);
        console.log(`Current Price: ${priceDisplay}  |  View: ${bold(this.selectedView === 'iron_condor' ? 'Iron Condor' : 'Spread')}  |  Timeframe: ${bold(this.selectedTimeframe + 'ms')}`);
        console.log(gray('Controls: [1] Iron Condor  [2] Spread  [t] 2s  [s] 10s  [Ctrl+C] Exit'));
        console.log('───────────────────────────────────────────────────────────────────────────────');
        if (this.selectedView === 'iron_condor') {
            this.renderIronCondorTable();
        }
        else {
            this.renderSpreadTable();
        }
        console.log('\n' + yellow(bold('User Balances:')));
        let balanceStr = '';
        this.userBalances.forEach((balance, userId) => {
            const profit = balance - 1000;
            const profitDisplay = profit >= 0 ? green(`+${profit.toFixed(0)}`) : red(`${profit.toFixed(0)}`);
            balanceStr += `${userId}: $${balance.toFixed(0)} (${profitDisplay})  `;
        });
        console.log(balanceStr);
    }
    renderIronCondorTable() {
        const contracts = this.service.getActiveIronCondorContracts(this.selectedTimeframe);
        if (contracts.length === 0) {
            console.log(red('\nNo active iron condor contracts'));
            return;
        }
        const grouped = this.groupContractsByWindow(contracts, (c) => c.exerciseWindow.start);
        const sortedStarts = Array.from(grouped.keys()).sort((a, b) => a - b);
        const visibleStarts = sortedStarts.slice(0, 10);
        const strikeLevels = Array.from(new Set(contracts.map((c) => c.strikeRange.lower))).sort((a, b) => b - a);
        console.log(bold(`\nIron Condor Table (${this.selectedTimeframe}ms timeframe):`));
        console.log(gray('Each cell shows: [multiplier]x $volume (positions)'));
        console.log();
        let header = '     ';
        const now = Date.now();
        visibleStarts.forEach((start) => {
            const seconds = Math.max(0, (start - now) / 1000);
            header += `   +${seconds.toFixed(1)}s  `;
        });
        console.log(gray(header));
        console.log('     ' + '─'.repeat(visibleStarts.length * 9));
        const centerPrice = this.currentPrice;
        strikeLevels.forEach((strike) => {
            const midPrice = strike + (contracts[0].strikeRange.upper - contracts[0].strikeRange.lower) / 2;
            let line = `${strike.toFixed(0).padStart(4)} │`;
            visibleStarts.forEach((start) => {
                const column = grouped.get(start) ?? [];
                const contract = column.find((c) => c.strikeRange.lower === strike);
                if (!contract) {
                    line += '   ---  ';
                }
                else {
                    line += this.formatIronCondorCell(contract);
                }
            });
            if (Math.abs(midPrice - centerPrice) < 0.5) {
                console.log(yellow(line) + ' ← current');
            }
            else {
                console.log(line);
            }
        });
    }
    renderSpreadTable() {
        const contracts = this.service.getActiveSpreadContracts(this.selectedTimeframe);
        if (contracts.length === 0) {
            console.log(red('\nNo active spread contracts'));
            return;
        }
        const grouped = this.groupContractsByWindow(contracts, (c) => c.exerciseWindow.start);
        const sortedStarts = Array.from(grouped.keys()).sort((a, b) => a - b);
        const visibleStarts = sortedStarts.slice(0, 10);
        const now = Date.now();
        console.log(bold(`\nSpread Table (${this.selectedTimeframe}ms timeframe):`));
        console.log(gray('Each row shows: [type] strike @ multiplierx $volume'));
        console.log();
        let header = '          ';
        visibleStarts.forEach((start) => {
            const seconds = Math.max(0, (start - now) / 1000);
            header += `  +${seconds.toFixed(1)}s  `;
        });
        console.log(gray(header));
        console.log('          ' + '─'.repeat(visibleStarts.length * 8));
        let callRow = 'CALL  │ ';
        visibleStarts.forEach((start) => {
            const column = grouped.get(start) ?? [];
            const call = column.find((c) => c.spreadType === types_1.SpreadType.CALL);
            callRow += call ? this.formatSpreadCell(call) : '  ---  ';
        });
        console.log(callRow);
        console.log(yellow(`      │ ${'═'.repeat(Math.max(2, visibleStarts.length * 8 - 2))} Price: ${this.currentPrice.toFixed(2)}`));
        let putRow = 'PUT   │ ';
        visibleStarts.forEach((start) => {
            const column = grouped.get(start) ?? [];
            const put = column.find((c) => c.spreadType === types_1.SpreadType.PUT);
            putRow += put ? this.formatSpreadCell(put) : '  ---  ';
        });
        console.log(putRow);
    }
    groupContractsByWindow(contracts, keyFn) {
        const grouped = new Map();
        contracts.forEach((contract) => {
            const key = keyFn(contract);
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(contract);
        });
        return grouped;
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
        return dim(` ${content.padEnd(4)}`) + ' ';
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
        return dim(` ${content.padEnd(5)}`) + ' ';
    }
    async run() {
        console.log(green(bold('Starting Clearinghouse Demo...')));
        console.log(hideCursor);
        this.service.startPriceFeed();
        this.updateDisplay();
        this.simulateTrading();
        process.on('SIGINT', () => this.shutdown());
        await new Promise(() => { });
    }
    simulateTrading() {
        setInterval(() => {
            const users = Array.from(this.userBalances.keys());
            const user = users[Math.floor(Math.random() * users.length)];
            const balance = this.userBalances.get(user) || 0;
            if (balance < 10)
                return;
            if (Math.random() > 0.5) {
                const timeframes = (0, types_1.getAllTimeframes)();
                const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
                const contracts = this.service.getActiveIronCondorContracts(timeframe);
                if (!contracts.length)
                    return;
                const contract = contracts[Math.floor(Math.random() * contracts.length)];
                const amount = Math.min(10 + Math.floor(Math.random() * 40), balance);
                const success = this.service.placeIronCondorPosition(user, contract.id, amount, timeframe);
                if (success) {
                    console.log(blue(`\n→ ${user} placed $${amount} on Iron Condor ${contract.returnMultiplier}x (${timeframe}ms)`));
                }
            }
            else {
                const timeframeOptions = [types_1.TimeFrame.TWO_SECONDS, types_1.TimeFrame.TEN_SECONDS];
                const timeframe = timeframeOptions[Math.floor(Math.random() * timeframeOptions.length)];
                const contracts = this.service.getActiveSpreadContracts(timeframe);
                if (!contracts.length)
                    return;
                const contract = contracts[Math.floor(Math.random() * contracts.length)];
                const amount = Math.min(10 + Math.floor(Math.random() * 40), balance);
                const result = this.service.placeSpreadPosition(user, contract.id, amount, timeframe);
                if (result.success) {
                    console.log(blue(`\n→ ${user} placed $${amount} on ${contract.spreadType} Spread ${contract.returnMultiplier}x (${timeframe}ms)`));
                }
            }
        }, 3000);
    }
}
const demo = new ClearingHouseDemo();
demo.run().catch(console.error);
