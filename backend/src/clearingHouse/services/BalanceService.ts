import { EventEmitter } from 'events';
import { CLEARING_HOUSE_CONFIG } from '../config/clearingHouseConfig';

export class BalanceService extends EventEmitter {
  private userBalances: Map<string, number> = new Map();
  private clearingHouseBalance: number = CLEARING_HOUSE_CONFIG.clearingHouseStartingBalance;
  private userStartingBalance: number = CLEARING_HOUSE_CONFIG.userStartingBalance;

  initializeUser(userId: string): number {
    if (this.userBalances.has(userId)) {
      return this.userBalances.get(userId)!;
    }

    this.userBalances.set(userId, this.userStartingBalance);
    
    this.emit('balance_initialized', { userId, balance: this.userStartingBalance });
    
    return this.userStartingBalance;
  }

  credit(userId: string, amount: number): number {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }

    const currentBalance = this.userBalances.get(userId) || 0;
    const newBalance = currentBalance + amount;
    this.userBalances.set(userId, newBalance);

    // Update clearing house balance (opposite direction)
    this.clearingHouseBalance -= amount;

    this.emit('balance_updated', {
      userId,
      previousBalance: currentBalance,
      newBalance,
      change: amount,
      type: 'credit'
    });

    return newBalance;
  }
  
  debit(userId: string, amount: number): number {
    if (amount <= 0) {
      throw new Error('Debit amount must be positive');
    }

    const currentBalance = this.userBalances.get(userId) || 0;
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient balance. Current: ${currentBalance}, Required: ${amount}`);
    }

    const newBalance = currentBalance - amount;
    this.userBalances.set(userId, newBalance);

    this.clearingHouseBalance += amount;

    this.emit('balance_updated', {
      userId,
      previousBalance: currentBalance,
      newBalance,
      change: -amount,
      type: 'debit'
    });

    return newBalance;
  }

  getBalance(userId: string): number {
    return this.userBalances.get(userId) || 0;
  }

  hasBalance(userId: string, amount: number): boolean {
    return this.getBalance(userId) >= amount;
  }

}