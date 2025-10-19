import { EventEmitter } from 'events';
import { AccountId, BalanceChangeset } from './types';

export interface AccountSnapshot {
  accountId: AccountId;
  available: number;
  locked: number;
  version: number;
}

type BalanceEvent =
  | {
      type: 'credit' | 'debit' | 'lock' | 'unlock';
      accountId: AccountId;
      delta: number;
      reason?: string;
      snapshot: AccountSnapshot;
    }
  | {
      type: 'initialize';
      accountId: AccountId;
      snapshot: AccountSnapshot;
    };

interface InternalAccount {
  available: number;
  locked: number;
  version: number;
}

export interface BalanceServiceOptions {
  defaultStartingBalance?: number;
}

export class BalanceService extends EventEmitter {
  private readonly accounts = new Map<AccountId, InternalAccount>();
  private readonly startingBalance: number;

  constructor(options: BalanceServiceOptions = {}) {
    super();
    this.startingBalance = options.defaultStartingBalance ?? 0;
  }

  ensureAccount(accountId: AccountId): AccountSnapshot {
    const existing = this.accounts.get(accountId);
    if (existing) {
      return this.snapshot(accountId, existing);
    }

    const account: InternalAccount = {
      available: this.startingBalance,
      locked: 0,
      version: 1,
    };
    this.accounts.set(accountId, account);
    const snapshot = this.snapshot(accountId, account);
    this.emitEvent({
      type: 'initialize',
      accountId,
      snapshot,
    });
    return snapshot;
  }

  credit(accountId: AccountId, amount: number, reason?: string): AccountSnapshot {
    if (amount <= 0) {
      throw new Error('Credit amount must be positive');
    }
    const account = this.getAccount(accountId);
    account.available += amount;
    account.version += 1;
    const snapshot = this.snapshot(accountId, account);
    this.emitEvent({
      type: 'credit',
      accountId,
      delta: amount,
      reason,
      snapshot,
    });
    return snapshot;
  }

  debit(accountId: AccountId, amount: number, reason?: string): AccountSnapshot {
    if (amount <= 0) {
      throw new Error('Debit amount must be positive');
    }
    const account = this.getAccount(accountId);
    if (account.available < amount) {
      throw new Error(
        `Insufficient available balance for account ${accountId}: required ${amount}, available ${account.available}`
      );
    }
    account.available -= amount;
    account.version += 1;
    const snapshot = this.snapshot(accountId, account);
    this.emitEvent({
      type: 'debit',
      accountId,
      delta: -amount,
      reason,
      snapshot,
    });
    return snapshot;
  }

  lock(accountId: AccountId, amount: number, reason?: string): AccountSnapshot {
    if (amount <= 0) {
      throw new Error('Lock amount must be positive');
    }
    const account = this.getAccount(accountId);
    if (account.available < amount) {
      throw new Error(
        `Insufficient available balance to lock for account ${accountId}: required ${amount}, available ${account.available}`
      );
    }
    account.available -= amount;
    account.locked += amount;
    account.version += 1;
    const snapshot = this.snapshot(accountId, account);
    this.emitEvent({
      type: 'lock',
      accountId,
      delta: -amount,
      reason,
      snapshot,
    });
    return snapshot;
  }

  unlock(accountId: AccountId, amount: number, reason?: string): AccountSnapshot {
    if (amount <= 0) {
      throw new Error('Unlock amount must be positive');
    }
    const account = this.getAccount(accountId);
    if (account.locked < amount) {
      throw new Error(
        `Insufficient locked balance to unlock for account ${accountId}: requested ${amount}, locked ${account.locked}`
      );
    }
    account.locked -= amount;
    account.available += amount;
    account.version += 1;
    const snapshot = this.snapshot(accountId, account);
    this.emitEvent({
      type: 'unlock',
      accountId,
      delta: amount,
      reason,
      snapshot,
    });
    return snapshot;
  }

  applyChangeset(changeset: BalanceChangeset, reasonPrefix?: string): void {
    for (const debit of changeset.debits) {
      this.debit(
        debit.accountId,
        debit.delta,
        reasonPrefix ? `${reasonPrefix}:${debit.reason}` : debit.reason
      );
    }

    for (const credit of changeset.credits) {
      this.credit(
        credit.accountId,
        credit.delta,
        reasonPrefix ? `${reasonPrefix}:${credit.reason}` : credit.reason
      );
    }
  }

  available(accountId: AccountId): number {
    return this.getAccount(accountId).available;
  }

  locked(accountId: AccountId): number {
    return this.getAccount(accountId).locked;
  }

  snapshotFor(accountId: AccountId): AccountSnapshot {
    return this.snapshot(accountId, this.getAccount(accountId));
  }

  private getAccount(accountId: AccountId): InternalAccount {
    let account = this.accounts.get(accountId);
    if (!account) {
      this.ensureAccount(accountId);
      account = this.accounts.get(accountId);
    }
    if (!account) {
      throw new Error(`Failed to initialize account ${accountId}`);
    }
    return account;
  }

  private snapshot(accountId: AccountId, account: InternalAccount): AccountSnapshot {
    return {
      accountId,
      available: account.available,
      locked: account.locked,
      version: account.version,
    };
  }

  private emitEvent(event: BalanceEvent): void {
    this.emit('balance_event', event);
  }
}
