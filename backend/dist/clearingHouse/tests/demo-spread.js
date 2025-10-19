"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ClearingHouseService_1 = require("../services/ClearingHouseService");
const types_1 = require("../types");
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    bgGreen: '\x1b[42m',
    bgRed: '\x1b[41m',
};
const clearScreen = '\x1b[2J';
const moveCursor = (x, y) => `\x1b[${y};${x}H`;
const hideCursor = '\x1b[?25l';
const showCursor = '\x1b[?25h';
const color = (text, code) => `${code}${text}${colors.reset}`;
const bold = (text) => `${colors.bold}${text}${colors.reset}`;
const dim = (text) => `${colors.dim}${text}${colors.reset}`;
const cyan = (text) => color(text, colors.cyan);
const yellow = (text) => color(text, colors.yellow);
const green = (text) => color(text, colors.green);
const red = (text) => color(text, colors.red);
const gray = (text) => color(text, colors.gray);
class SpreadDemo {
    constructor(timeframe) {
        this.service = new ClearingHouseService_1.ClearingHouseService();
        this.currentPrice = 0;
        this.userBalances = new Map();
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
                console.error('Invalid timeframe. Use 2s or 10s');
                process.exit(1);
        }
        this.setupListeners();
        this.initializeUsers();
    }
    setupListeners() {
        this.service.on('price_update', (payload) => {
            this.currentPrice = payload.price;
        });
        this.service.on('balance_updated', (payload) => {
            this.userBalances.set(payload.userId, payload.balance);
        });
        process.stdin.setRawMode(true);
        process.stdin.on('data', (key) => {
            if (key.toString() === '\u0003') {
                this.shutdown();
            }
        });
    }
    initializeUsers() {
        ['alice', 'bob', 'charlie', 'david'].forEach((user) => {
            this.service.initializeUser(user);
            this.userBalances.set(user, this.service.getUserBalance(user));
        });
    }
    render() {
        process.stdout.write(clearScreen + moveCursor(1, 1));
        console.log(cyan('════════════════════════════════ SPREAD ORDERBOOK ════════════════════════════════'));
        console.log(cyan(`Timeframe: ${this.timeframe}ms  |  Price: ${this.currentPrice.toFixed(4)}  |  ${new Date().toLocaleTimeString()}`));
        console.log(gray('Cells show: multiplier × | strike | $volume | positions | status'));
        console.log('────────────────────────────────────────────────────────────────────────────────────');
        const contracts = this.service.getActiveSpreadContracts(this.timeframe);
        if (!contracts.length) {
            console.log(red('\nNo active contracts'));
            return;
        }
        const grouped = this.groupByWindow(contracts);
        const starts = Array.from(grouped.keys()).sort((a, b) => a - b).slice(0, 12);
        const now = Date.now();
        let header = '          ';
        starts.forEach((start, idx) => {
            const seconds = Math.max(0, (start - now) / 1000);
            header += idx === 0 ? cyan('[NOW]'.padEnd(12)) : `+${seconds.toFixed(1)}s`.padEnd(12);
        });
        console.log(bold(header));
        console.log('          ' + '─'.repeat(starts.length * 12));
        const renderRow = (label, type) => {
            let row = `${label.padEnd(6)}│ `;
            starts.forEach((start) => {
                const column = grouped.get(start) ?? [];
                const contract = column.find((c) => c.spreadType === type);
                row += contract ? this.formatCell(contract) : gray('   ---    ');
                row += ' ';
            });
            return row;
        };
        console.log(renderRow('CALL', types_1.SpreadType.CALL));
        console.log(yellow(`      │ ${'═'.repeat(Math.max(2, starts.length * 12 - 2))} Price: ${this.currentPrice.toFixed(4)}`));
        console.log(renderRow('PUT', types_1.SpreadType.PUT));
        console.log('\n' + yellow(bold('User Balances')));
        let balances = '';
        this.userBalances.forEach((balance, user) => {
            const profit = balance - 1000;
            const profitText = profit >= 0 ? green(`+${profit.toFixed(0)}`) : red(`${profit.toFixed(0)}`);
            balances += `${user}: $${balance.toFixed(0)} (${profitText})  `;
        });
        console.log(balances);
        console.log('\n' + gray('Press Ctrl+C to exit'));
    }
    groupByWindow(contracts) {
        const grouped = new Map();
        contracts.forEach((contract) => {
            const key = contract.exerciseWindow.start;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(contract);
        });
        return grouped;
    }
    formatCell(contract) {
        const multiplier = contract.returnMultiplier.toFixed(1).padEnd(4);
        const strike = contract.strikePrice.toFixed(4).slice(-6);
        const volume = contract.totalVolume.toFixed(0).padStart(3);
        const positions = `${contract.positions.size}`.padStart(2);
        let background = colors.reset;
        if (contract.status === types_1.ContractStatus.TRIGGERED) {
            background = colors.bgGreen;
        }
        else if (contract.status === types_1.ContractStatus.EXPIRED) {
            background = colors.bgRed;
        }
        else if (contract.totalVolume > 0) {
            background = colors.cyan;
        }
        const status = contract.status === types_1.ContractStatus.ACTIVE ? 'A' : contract.status[0];
        const payload = `${multiplier}|${strike}|${volume}|${positions}|${status}`;
        if (background !== colors.reset) {
            return color(` ${payload} `, background);
        }
        return dim(` ${payload} `);
    }
    async run() {
        console.log(hideCursor);
        this.service.startPriceFeed();
        this.tickLoop();
        setInterval(() => this.simulateTrades(), 2500);
        process.on('SIGINT', () => this.shutdown());
        await new Promise(() => { });
    }
    tickLoop() {
        this.render();
        setTimeout(() => this.tickLoop(), 1000);
    }
    simulateTrades() {
        const users = Array.from(this.userBalances.keys());
        const user = users[Math.floor(Math.random() * users.length)];
        const balance = this.userBalances.get(user) ?? 0;
        if (balance < 10)
            return;
        const contracts = this.service.getActiveSpreadContracts(this.timeframe);
        if (!contracts.length)
            return;
        const contract = contracts[Math.floor(Math.random() * contracts.length)];
        const amount = Math.min(10 + Math.floor(Math.random() * 40), balance);
        this.service.placeSpreadPosition(user, contract.id, amount, this.timeframe);
    }
    shutdown() {
        console.log(showCursor);
        this.service.destroy();
        process.exit(0);
    }
}
const timeframeArg = process.argv[2] ?? '2s';
const demo = new SpreadDemo(timeframeArg);
demo.run().catch(console.error);
