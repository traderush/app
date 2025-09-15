import { TimeFrame, getTimeframeConfig } from '../../config/timeframeConfig';
import {
  CLEARING_HOUSE_CONFIG,
  getIronCondorConfig,
} from '../config/clearingHouseConfig';
import { ContractStatus, IronCondorContract } from '../types';
import { BaseOrderbook } from './BaseOrderbook';

/**
 * IronCondorOrderbook manages iron condor option contracts for a specific timeframe
 * Maintains a 2D array of contracts: [columns/time periods][rows/strike levels]
 */
export class IronCondorOrderbook extends BaseOrderbook<
  IronCondorContract,
  TimeFrame
> {
  private contracts: (IronCondorContract | null)[][] = [];
  private config = getIronCondorConfig(this.timeframe);
  private totalRows: number;
  private totalColumns: number;
  private currentColumnIndex = 0;
  private priceSpread: number = getTimeframeConfig(this.timeframe).boxHeight;
  private nextContractId = 0;
  private startTime: number;

  constructor(timeframe: TimeFrame) {
    super(timeframe);
    this.totalRows = this.config.rowsAbove + this.config.rowsBelow + 1;
    this.totalColumns = this.config.numColumns;
    this.startTime = Date.now();
    console.log(
      `[IronCondorOrderbook] CONSTRUCTOR called for timeframe ${timeframe}ms at ${new Date(this.startTime).toISOString()}`
    );
    console.log(
      `[IronCondorOrderbook] Config for ${timeframe}ms: numColumns=${this.config.numColumns}, totalColumns=${this.totalColumns}, timeRange=${(this.totalColumns * timeframe) / 1000}s`
    );
    this.generateFullTable();
    // Emit initial contracts after generation
    this.emitInitialContracts();
  }

  // Reset method removed - we now generate columns endlessly without resets

  /**
   * Generate the entire contract table upfront
   */
  private generateFullTable(): void {
    const currentTime = Date.now();

    console.log(
      `[IronCondorOrderbook] Generating contract table for timeframe ${this.timeframe}: columns=${this.totalColumns}, rows=${this.totalRows}`
    );
    console.log(
      `[IronCondorOrderbook] First contract will start at: ${new Date(currentTime).toISOString()}`
    );

    // Generate all columns starting from current time
    for (let col = 0; col < this.totalColumns; col++) {
      const column: (IronCondorContract | null)[] = [];
      // Align with frontend expectations: column 0 starts at currentTime
      const exerciseStart = currentTime + col * this.timeframe;
      const exerciseEnd = exerciseStart + this.timeframe;

      // Generate all rows (strike levels)
      for (let row = 0; row < this.totalRows; row++) {
        const levelOffset = row - this.config.rowsBelow; // Convert to price level offset

        const contract: IronCondorContract = {
          id: `IC_${this.timeframe}_${this.nextContractId++}`,
          returnMultiplier: this.generateReturnMultiplier(),
          timeframe: this.timeframe,
          totalVolume: 0,
          positions: new Map(),
          status: ContractStatus.ACTIVE,
          strikeRange: {
            lower: Number(
              (
                this.getGridAlignedBasePrice() +
                levelOffset * this.priceSpread
              ).toFixed(2)
            ),
            upper: Number(
              (
                this.getGridAlignedBasePrice() +
                (levelOffset + 1) * this.priceSpread
              ).toFixed(2)
            ),
          },
          exerciseWindow: {
            start: exerciseStart,
            end: exerciseEnd,
          },
        };

        column.push(contract);
      }

      this.contracts.push(column);
    }

    console.log(
      `[IronCondorOrderbook] Generated ${this.contracts.length} columns with ${this.contracts[0]?.length || 0} contracts each`
    );

    // Log column time boundaries for debugging
    console.log('[IronCondorOrderbook] Column time boundaries:');
    for (let col = 0; col < Math.min(5, this.contracts.length); col++) {
      const firstContract = this.contracts[col][0];
      if (firstContract) {
        console.log(
          `  Column ${col}: ${new Date(firstContract.exerciseWindow.start).toISOString()} to ${new Date(firstContract.exerciseWindow.end).toISOString()}`
        );
      }
    }
  }

  /**
   * Get contract at specific position
   */
  getContractAt(col: number, row: number): IronCondorContract | null {
    if (
      col < 0 ||
      col >= this.totalColumns ||
      row < 0 ||
      row >= this.totalRows
    ) {
      return null;
    }
    return this.contracts[col][row];
  }

  /**
   * Get contract by ID
   */
  getContractById(id: string): IronCondorContract | null {
    for (const column of this.contracts) {
      for (const contract of column) {
        if (contract && contract.id === id) {
          return contract;
        }
      }
    }
    return null;
  }

  /**
   * Place a position on a contract
   */
  placePosition(contractId: string, userId: string, amount: number): boolean {
    const contract = this.getContractById(contractId);
    if (!contract || contract.status !== ContractStatus.ACTIVE) {
      console.log(`[IronCondorOrderbook] Contract not found or not active:`, {
        contractId,
        found: !!contract,
        status: contract?.status,
        timeframe: this.timeframe,
      });
      return false;
    }

    // Verify contract hasn't started yet (must be in the future)
    const currentTime = Date.now();
    const contractCol = this.getContractColumn(contract);
    const contractRow = this.getContractRow(contract);

    console.log(`[IronCondorOrderbook] Contract position details:`, {
      contractId,
      contractCol,
      contractRow,
      currentColumnIndex: this.currentColumnIndex,
      startTime: new Date(contract.exerciseWindow.start).toISOString(),
      endTime: new Date(contract.exerciseWindow.end).toISOString(),
      currentTime: new Date(currentTime).toISOString(),
      timeUntilStart: contract.exerciseWindow.start - currentTime,
      strikes: contract.strikeRange,
      timeframe: this.timeframe,
    });

    // Contract must not have started yet
    if (contract.exerciseWindow.start <= currentTime) {
      console.log(`[IronCondorOrderbook] Contract has already started:`, {
        contractId,
        startTime: new Date(contract.exerciseWindow.start).toISOString(),
        currentTime: new Date(currentTime).toISOString(),
      });
      return false;
    }

    // Add position
    if (!contract.positions.has(userId)) {
      contract.positions.set(userId, []);
    }

    contract.positions.get(userId)!.push({
      userId,
      amount,
      timestamp: Date.now(),
      contractId,
    });

    contract.totalVolume += amount;

    console.log(`[IronCondorOrderbook] Position placed:`, {
      contractId,
      userId,
      amount,
      totalVolume: contract.totalVolume,
      strikes: `${contract.strikeRange.lower}-${contract.strikeRange.upper}`,
      exerciseWindow: `${new Date(contract.exerciseWindow.start).toISOString()} to ${new Date(contract.exerciseWindow.end).toISOString()}`,
    });

    return true;
  }

  /**
   * Get which column a contract is in
   */
  private getContractColumn(contract: IronCondorContract): number {
    for (let col = 0; col < this.contracts.length; col++) {
      if (this.contracts[col].includes(contract)) {
        return col;
      }
    }
    return -1;
  }

  /**
   * Get which row a contract is in within its column
   */
  private getContractRow(contract: IronCondorContract): number {
    const col = this.getContractColumn(contract);
    if (col === -1) return -1;

    const column = this.contracts[col];
    for (let row = 0; row < column.length; row++) {
      if (column[row] === contract) {
        return row;
      }
    }
    return -1;
  }

  /**
   * Handle price update
   */
  onPriceUpdate(price: number, timestamp: number): void {
    this.currentPrice = price;
    this.lastUpdateTime = timestamp;

    // Calculate if we need to shift columns
    const timeSinceLastShift =
      timestamp - (this.startTime + this.currentColumnIndex * this.timeframe);

    if (timeSinceLastShift >= this.timeframe) {
      // Time to shift to next column
      const columnsToShift = Math.floor(timeSinceLastShift / this.timeframe);

      let contractsChanged = false;
      for (let i = 0; i < columnsToShift; i++) {
        this.shiftColumns(timestamp);
        this.currentColumnIndex++;
        contractsChanged = true;

        // Ensure we always maintain at least totalColumns ahead
        while (this.contracts.length < this.totalColumns) {
          this.addNewColumn();
          contractsChanged = true;
        }
      }

      // Only emit if contracts actually changed
      if (contractsChanged) {
        this.emitActiveContracts();
      }
    }

    // Check for contract exercises in active column
    this.checkActiveColumnForExercises(price, timestamp);
  }

  // /**
  //  * Process outcomes for the current column
  //  */
  // private processCurrentColumn(currentPrice: number, timestamp: number): void {
  //   if (this.currentColumnIndex >= this.contracts.length) return;

  //   const column = this.contracts[this.currentColumnIndex];

  //   for (let i = 0; i < column.length; i++) {
  //     const contract = column[i];
  //     if (!contract || contract.totalVolume === 0) continue;

  //     // Check if price is within strike range
  //     const inRange =
  //       currentPrice >= contract.strikeRange.lower &&
  //       currentPrice <= contract.strikeRange.upper;

  //     if (inRange && contract.status === ContractStatus.ACTIVE) {
  //       this.exerciseContract(contract, timestamp);
  //       // Remove the contract entirely after processing
  //       column[i] = null;
  //     } else if (contract.status === ContractStatus.ACTIVE) {
  //       this.expireContract(contract, timestamp);
  //       // Remove the contract entirely after processing
  //       column[i] = null;
  //     }
  //   }
  // }

  /**
   * Check active column for immediate exercises
   */
  private checkActiveColumnForExercises(
    currentPrice: number,
    timestamp: number
  ): void {
    // Check ALL columns, not just the next one
    let contractsChecked = 0;
    let contractsInWindow = 0;
    let contractsExercised = 0;

    for (let colIndex = 0; colIndex < this.contracts.length; colIndex++) {
      const column = this.contracts[colIndex];

      for (let i = 0; i < column.length; i++) {
        const contract = column[i];
        if (!contract) continue;

        contractsChecked++;

        // Skip contracts with no positions
        if (contract.totalVolume === 0) continue;

        // Check if we're in the exercise window
        if (
          timestamp >= contract.exerciseWindow.start &&
          timestamp <= contract.exerciseWindow.end
        ) {
          contractsInWindow++;

          const inRange =
            currentPrice >= contract.strikeRange.lower &&
            currentPrice <= contract.strikeRange.upper;

          if (inRange && contract.status === ContractStatus.ACTIVE) {
            console.log(`[IronCondorOrderbook] Exercising contract:`, {
              contractId: contract.id,
              price: currentPrice.toFixed(2),
              strikes: `${contract.strikeRange.lower}-${contract.strikeRange.upper}`,
              totalVolume: contract.totalVolume,
              positions: contract.positions.size,
            });

            this.exerciseContract(contract, timestamp);
            contractsExercised++;
            // Remove the contract entirely after processing
            column[i] = null;
          }
        } else if (
          timestamp > contract.exerciseWindow.end &&
          contract.status === ContractStatus.ACTIVE &&
          contract.totalVolume > 0
        ) {
          // Contract has expired with positions (losses)
          console.log(
            `[IronCondorOrderbook] Expiring contract with positions:`,
            {
              contractId: contract.id,
              endTime: new Date(contract.exerciseWindow.end).toISOString(),
              currentTime: new Date(timestamp).toISOString(),
              totalVolume: contract.totalVolume,
              positions: contract.positions.size,
            }
          );

          this.expireContract(contract, timestamp);
          column[i] = null;
        }
      }
    }
  }

  /**
   * Shift columns by removing first and adding new one at the end
   */
  private shiftColumns(timestamp: number): void {
    // Remove first column
    const removedColumn = this.contracts.shift();

    // Process any remaining active contracts in removed column
    if (removedColumn) {
      for (let i = 0; i < removedColumn.length; i++) {
        const contract = removedColumn[i];
        if (
          contract &&
          contract.status === ContractStatus.ACTIVE &&
          contract.totalVolume > 0
        ) {
          this.expireContract(contract, timestamp);
        }
        // Clear the reference to allow garbage collection
        removedColumn[i] = null;
      }
    }
  }

  /**
   * Add a new column of contracts at the end
   */
  private addNewColumn(): void {
    const newColumn: IronCondorContract[] = [];

    // Calculate the start time for the new column based on the last column
    let newExerciseStart: number;
    let newExerciseEnd: number;

    if (this.contracts.length > 0) {
      // Get the last column's end time
      const lastColumn = this.contracts[this.contracts.length - 1];
      const lastContract = lastColumn[0];
      if (lastContract) {
        newExerciseStart = lastContract.exerciseWindow.end;
        newExerciseEnd = newExerciseStart + this.timeframe;
      } else {
        // Fallback if somehow the last column is empty
        const currentTime = Date.now();
        newExerciseStart = currentTime + this.contracts.length * this.timeframe;
        newExerciseEnd = newExerciseStart + this.timeframe;
      }
    } else {
      // First column - this shouldn't happen in normal operation
      const currentTime = Date.now();
      newExerciseStart = currentTime;
      newExerciseEnd = newExerciseStart + this.timeframe;
    }

    for (let row = 0; row < this.totalRows; row++) {
      const levelOffset = row - this.config.rowsBelow;

      const contract: IronCondorContract = {
        id: `IC_${this.timeframe}_${this.nextContractId++}`,
        returnMultiplier: this.generateReturnMultiplier(),
        timeframe: this.timeframe,
        totalVolume: 0,
        positions: new Map(),
        status: ContractStatus.ACTIVE,
        strikeRange: {
          lower: Number(
            (
              this.getGridAlignedBasePrice() +
              levelOffset * this.priceSpread
            ).toFixed(2)
          ),
          upper: Number(
            (
              this.getGridAlignedBasePrice() +
              (levelOffset + 1) * this.priceSpread
            ).toFixed(2)
          ),
        },
        exerciseWindow: {
          start: newExerciseStart,
          end: newExerciseEnd,
        },
      };

      newColumn.push(contract);
    }

    this.contracts.push(newColumn);

    this.emit('contracts_generated', {
      contracts: newColumn,
      timeframe: this.timeframe,
      timestamp: Date.now(),
    });
  }

  /**
   * Exercise a contract
   */
  private exerciseContract(
    contract: IronCondorContract,
    timestamp: number
  ): void {
    contract.status = ContractStatus.EXERCISED;
    const settlements: Array<{
      userId: string;
      position: number;
      payout: number;
    }> = [];

    for (const [userId, positions] of contract.positions) {
      for (const position of positions) {
        const payout = position.amount * contract.returnMultiplier;

        if (this.balanceService) {
          this.balanceService.credit(userId, payout);
        }

        settlements.push({ userId, position: position.amount, payout });
      }
    }

    this.emit('contract_exercised', {
      contractId: contract.id,
      returnMultiplier: contract.returnMultiplier,
      settlements,
      timestamp,
    });
  }

  /**
   * Expire a contract
   */
  private expireContract(
    contract: IronCondorContract,
    timestamp: number
  ): void {
    contract.status = ContractStatus.EXPIRED;

    const expiredPositions: Array<{ userId: string; position: number }> = [];

    for (const [userId, positions] of contract.positions) {
      for (const position of positions) {
        expiredPositions.push({ userId, position: position.amount });
      }
    }

    this.emit('contract_expired', {
      contractId: contract.id,
      expiredPositions,
      timestamp,
    });
  }

  /**
   * Generate return multiplier
   */
  private generateReturnMultiplier(): number {
    const min = CLEARING_HOUSE_CONFIG.constants.multiplierRange.min;
    const max = CLEARING_HOUSE_CONFIG.constants.multiplierRange.max;
    return Number((min + Math.random() * (max - min)).toFixed(1));
  }

  /**
   * Emit current active contracts
   */
  private emitActiveContracts(): void {
    const activeContracts: IronCondorContract[] = [];
    const currentTime = Date.now();

    // Emit contracts that are active and haven't ended yet
    for (const column of this.contracts) {
      for (const contract of column) {
        if (
          contract &&
          contract.status === ContractStatus.ACTIVE &&
          contract.exerciseWindow.end > currentTime
        ) {
          activeContracts.push(contract);
        }
      }
    }

    this.emit('contracts_updated', {
      contracts: activeContracts,
      timestamp: this.lastUpdateTime,
    });
  }

  private emitInitialContracts(): void {
    const activeContracts: IronCondorContract[] = [];

    // Emit all active contracts
    for (const column of this.contracts) {
      for (const contract of column) {
        if (contract && contract.status === ContractStatus.ACTIVE) {
          activeContracts.push(contract);
        }
      }
    }

    this.emit('contracts_generated', {
      contracts: activeContracts,
      timeframe: this.timeframe,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all active contracts
   */
  getActiveContracts(): Map<string, IronCondorContract> {
    const activeContracts = new Map<string, IronCondorContract>();

    // Return all active contracts
    for (let col = 0; col < this.contracts.length; col++) {
      for (const contract of this.contracts[col]) {
        if (contract && contract.status === ContractStatus.ACTIVE) {
          activeContracts.set(contract.id, contract);
        }
      }
    }

    return activeContracts;
  }

  /**
   * Get current base price from price feed service
   */
  private getCurrentBasePrice(): number {
    if (this.priceFeedService) {
      return this.priceFeedService.getCurrentPrice();
    }
    return CLEARING_HOUSE_CONFIG.constants.initialPrice;
  }

  /**
   * Get grid-aligned base price for strike calculation
   * This ensures strikes are always on fixed grid levels (e.g., 100.00, 100.10, 100.20)
   */
  private getGridAlignedBasePrice(): number {
    const currentPrice = this.getCurrentBasePrice();
    // Find the nearest grid level that would contain the current price
    // For example, if priceSpread is 0.10 and price is 100.07, we want 100.00 (so the grid is 100.00-100.10, 100.10-100.20, etc)
    const gridIndex = Math.floor(currentPrice / this.priceSpread);
    const gridLevel = gridIndex * this.priceSpread;

    return Number(gridLevel.toFixed(2));
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.contracts = [];
    this.currentColumnIndex = 0;
    this.nextContractId = 0;
    this.generateFullTable();
  }
}
