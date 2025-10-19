import type {
  AccountId,
  Timestamp,
  Asset,
} from "../domain/primitives";

export interface BalanceEntry {
  accountId: AccountId;
  Asset: Asset;
  amount: number;
}

export interface CollateralLockChange {
  accountId: AccountId;
  Asset: Asset;
  amount: number;
}

export interface BalanceChanges {
  credits: BalanceEntry[];
  debits: BalanceEntry[];
  locks?: CollateralLockChange[];
  unlocks?: CollateralLockChange[];
}

export interface LedgerRecord {
  id: string;
  ts: Timestamp;
  changes: BalanceChanges;
  metadata?: Record<string, unknown>;
}

export interface BalanceService {
  applyChanges(record: LedgerRecord): void;
  lock(change: CollateralLockChange): void;
  unlock(change: CollateralLockChange): void;
  getBalance(accountId: AccountId, Asset: Asset): number;
  getLocked(accountId: AccountId, Asset: Asset): number;
  history(): readonly LedgerRecord[];
}

export class InMemoryBalanceService implements BalanceService {
  private balances = new Map<string, number>();
  private locked = new Map<string, number>();
  private records: LedgerRecord[] = [];

  applyChanges(record: LedgerRecord): void {
    this.records.push(record);
    for (const debit of record.changes.debits) {
      this.adjust(debit.accountId, debit.Asset, -debit.amount);
    }
    for (const credit of record.changes.credits) {
      this.adjust(credit.accountId, credit.Asset, credit.amount);
    }
    for (const lock of record.changes.locks ?? []) {
      this.lock(lock);
    }
    for (const unlock of record.changes.unlocks ?? []) {
      this.unlock(unlock);
    }
  }

  lock(change: CollateralLockChange): void {
    const key = this.key(change.accountId, change.Asset);
    const current = this.locked.get(key) ?? 0;
    this.locked.set(key, current + change.amount);
    this.adjust(change.accountId, change.Asset, -change.amount);
  }

  unlock(change: CollateralLockChange): void {
    const key = this.key(change.accountId, change.Asset);
    const current = this.locked.get(key) ?? 0;
    this.locked.set(key, Math.max(0, current - change.amount));
    this.adjust(change.accountId, change.Asset, change.amount);
  }

  getBalance(accountId: AccountId, Asset: Asset): number {
    return this.balances.get(this.key(accountId, Asset)) ?? 0;
  }

  getLocked(accountId: AccountId, Asset: Asset): number {
    return this.locked.get(this.key(accountId, Asset)) ?? 0;
  }

  history(): readonly LedgerRecord[] {
    return this.records;
  }

  private adjust(accountId: AccountId, Asset: Asset, delta: number): void {
    const key = this.key(accountId, Asset);
    const next = (this.balances.get(key) ?? 0) + delta;
    this.balances.set(key, next);
  }

  private key(accountId: AccountId, Asset: Asset): string {
    return `${accountId}:${Asset}`;
  }
}
