import { EventEmitter } from 'events';
import { BalanceService } from './BalanceService';
import {
  AccountId,
  MarginAuthorization,
  MarginViolation,
  Order,
  OrderId,
  Timestamp,
} from './types';

interface OrderCollateralState {
  orderId: OrderId;
  makerId: AccountId;
  locked: number;
  consumed: number;
}

export class MarginService extends EventEmitter {
  private readonly orderState = new Map<OrderId, OrderCollateralState>();
  private readonly violations: MarginViolation[] = [];

  constructor(private readonly balance: BalanceService) {
    super();
  }

  reserveForOrder(order: Order): void {
    const state = this.orderState.get(order.id);
    const required = order.collateralRequired;
    const makerId = order.makerId;

    if (state) {
      const delta = required - state.locked;
      if (delta > 0) {
        this.balance.lock(makerId, delta, `order:${order.id}:increase_collateral`);
      } else if (delta < 0) {
        this.balance.unlock(makerId, Math.abs(delta), `order:${order.id}:decrease_collateral`);
      }
      state.locked = required;
      return;
    }

    this.balance.lock(makerId, required, `order:${order.id}:reserve_collateral`);
    this.orderState.set(order.id, {
      orderId: order.id,
      makerId,
      locked: required,
      consumed: order.collateralFilled,
    });
  }

  releaseOrder(orderId: OrderId): void {
    const state = this.orderState.get(orderId);
    if (!state) {
      return;
    }
    const remaining = state.locked - state.consumed;
    if (remaining > 0) {
      this.balance.unlock(state.makerId, remaining, `order:${orderId}:release_collateral`);
    }
    this.orderState.delete(orderId);
  }

  authorizeFill(
    order: Order,
    requestedSize: number,
    timestamp: Timestamp
  ): MarginAuthorization {
    const state = this.orderState.get(order.id);
    const collateralPerUnit =
      order.sizeTotal > 0 ? order.collateralRequired / order.sizeTotal : 0;

    if (!state || collateralPerUnit <= 0) {
      return { authorizedSize: 0, reason: 'no_collateral_reserved' };
    }

    const collateralRemaining = Math.max(state.locked - state.consumed, 0);
    const maxSizeByCollateral =
      collateralPerUnit > 0 ? collateralRemaining / collateralPerUnit : 0;
    const authorizedSize = Math.min(requestedSize, maxSizeByCollateral, order.sizeRemaining);

    if (authorizedSize <= 0) {
      this.recordViolation({
        entityId: order.makerId,
        requiredMargin: requestedSize * collateralPerUnit,
        availableMargin: collateralRemaining,
        policyAction: 'order_blocked',
        orderId: order.id,
        timestamp,
      });
      return { authorizedSize: 0, reason: 'insufficient_collateral' };
    }

    if (authorizedSize < requestedSize) {
      this.recordViolation({
        entityId: order.makerId,
        requiredMargin: requestedSize * collateralPerUnit,
        availableMargin: collateralRemaining,
        policyAction: 'fill_scaled',
        orderId: order.id,
        timestamp,
      });
    }

    state.consumed += authorizedSize * collateralPerUnit;
    return { authorizedSize };
  }

  reconcileCollateral(order: Order): void {
    this.reserveForOrder(order);
  }

  collectViolations(): MarginViolation[] {
    const copy = [...this.violations];
    this.violations.length = 0;
    return copy;
  }

  available(makerId: AccountId): number {
    return this.balance.available(makerId);
  }

  private recordViolation(violation: MarginViolation): void {
    this.violations.push(violation);
    this.emit('margin_violation', violation);
  }
}
