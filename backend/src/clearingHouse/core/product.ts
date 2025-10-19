import {
  BalanceChangeset,
  Order,
  Position,
  ProductTypeId,
} from './types';

export interface ProductTypeHooks {
  id: ProductTypeId;
  orderComparator?: (a: Order, b: Order) => number;
  verifyHit(order: Order, position: Position, priceAtTick: number): boolean;
  payout(
    order: Order,
    position: Position,
    priceAtHit: number
  ): BalanceChangeset;
  init?(data?: unknown): void;
}

export class NullProductType implements ProductTypeHooks {
  readonly id: ProductTypeId;

  constructor(id: ProductTypeId = 'null_product') {
    this.id = id;
  }

  orderComparator = () => 0;

  verifyHit(): boolean {
    return false;
  }

  payout(): BalanceChangeset {
    return {
      credits: [],
      debits: [],
    };
  }
}
