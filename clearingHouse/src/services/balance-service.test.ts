import { describe, expect, it } from "bun:test";
import { Asset, type Timestamp } from "../domain/primitives";
import { InMemoryBalanceService } from "./balance-service";

describe("InMemoryBalanceService", () => {
  it("tracks credits, debits, locks, and unlocks while recording history", () => {
    const service = new InMemoryBalanceService();
    const accountId = "acct_1";
    const ts = 1 as Timestamp;

    service.applyChanges({
      id: "entry_1",
      ts,
      changes: {
        credits: [
          {
            accountId,
            Asset: Asset.USD,
            amount: 75,
          },
        ],
        debits: [
          {
            accountId,
            Asset: Asset.USD,
            amount: 25,
          },
        ],
      },
    });

    expect(service.getBalance(accountId, Asset.USD)).toBe(50);
    expect(service.getLocked(accountId, Asset.USD)).toBe(0);
    expect(service.history()).toHaveLength(1);
    expect(service.history()[0]?.changes.credits[0]?.amount).toBe(75);

    service.applyChanges({
      id: "entry_2",
      ts: (ts + 1) as Timestamp,
      changes: {
        credits: [],
        debits: [],
        locks: [
          {
            accountId,
            Asset: Asset.USD,
            amount: 20,
          },
        ],
      },
    });

    expect(service.getBalance(accountId, Asset.USD)).toBe(30);
    expect(service.getLocked(accountId, Asset.USD)).toBe(20);

    service.applyChanges({
      id: "entry_3",
      ts: (ts + 2) as Timestamp,
      changes: {
        credits: [],
        debits: [],
        unlocks: [
          {
            accountId,
            Asset: Asset.USD,
            amount: 15,
          },
        ],
      },
    });

    expect(service.getBalance(accountId, Asset.USD)).toBe(45);
    expect(service.getLocked(accountId, Asset.USD)).toBe(5);

    service.applyChanges({
      id: "entry_4",
      ts: (ts + 3) as Timestamp,
      changes: {
        credits: [],
        debits: [],
        unlocks: [
          {
            accountId,
            Asset: Asset.USD,
            amount: 10,
          },
        ],
      },
    });

    expect(service.getBalance(accountId, Asset.USD)).toBe(55);
    expect(service.getLocked(accountId, Asset.USD)).toBe(0);
  });

  it("returns zero for unknown accounts", () => {
    const service = new InMemoryBalanceService();
    expect(service.getBalance("unknown", Asset.USD)).toBe(0);
    expect(service.getLocked("unknown", Asset.USD)).toBe(0);
  });
});
