import { EphemeralOrderbook } from './EphemeralOrderbook';
import { ProductRegistry } from './ProductRegistry';
import { OrderbookConfig, OrderbookId } from './types';

export class OrderbookStore {
  private readonly orderbooks = new Map<OrderbookId, EphemeralOrderbook>();

  constructor(private readonly productRegistry: ProductRegistry) {}

  create(config: OrderbookConfig): EphemeralOrderbook {
    if (this.orderbooks.has(config.orderbookId)) {
      throw new Error(`Orderbook ${config.orderbookId} already exists`);
    }
    const productHooks = this.productRegistry.get(config.productTypeId);
    const orderbook = new EphemeralOrderbook(config, productHooks);
    this.orderbooks.set(config.orderbookId, orderbook);
    return orderbook;
  }

  get(orderbookId: OrderbookId): EphemeralOrderbook {
    const orderbook = this.orderbooks.get(orderbookId);
    if (!orderbook) {
      throw new Error(`Orderbook ${orderbookId} not found`);
    }
    return orderbook;
  }

  list(): EphemeralOrderbook[] {
    return Array.from(this.orderbooks.values());
  }

  withLock<T>(orderbookId: OrderbookId, _clockSeq: number, fn: (orderbook: EphemeralOrderbook) => T): T {
    const orderbook = this.get(orderbookId);
    return fn(orderbook);
  }
}
