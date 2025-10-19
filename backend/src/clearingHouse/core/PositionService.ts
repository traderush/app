import { EventEmitter } from 'events';
import {
  OrderId,
  Position,
  PositionId,
  PositionStatus,
  TimeWindow,
  AccountId,
  Timestamp,
  OrderbookId,
  ProductTypeId,
} from './types';

interface OpenPositionParams {
  orderId: OrderId;
  orderbookId: OrderbookId;
  productTypeId: ProductTypeId;
  userId: AccountId;
  makerId: AccountId;
  size: number;
  collateralLocked: number;
  triggerWindow: TimeWindow;
  timestamp: Timestamp;
}

export class PositionService extends EventEmitter {
  private readonly positions = new Map<PositionId, Position>();
  private readonly positionsByOrder = new Map<OrderId, Set<PositionId>>();
  private readonly positionsByUser = new Map<AccountId, Set<PositionId>>();

  open(params: OpenPositionParams): Position {
    const id = this.nextId(params.orderId, params.userId);
    const position: Position = {
      id,
      orderId: params.orderId,
      orderbookId: params.orderbookId,
      productTypeId: params.productTypeId,
      userId: params.userId,
      makerId: params.makerId,
      size: params.size,
      collateralLocked: params.collateralLocked,
      timeCreated: params.timestamp,
      triggerWindow: params.triggerWindow,
      status: PositionStatus.OPEN,
    };
    this.positions.set(id, position);
    this.indexPosition(position);
    this.emit('position_opened', position);
    return position;
  }

  markHit(positionId: PositionId, price: number, timestamp: Timestamp): Position | undefined {
    const position = this.positions.get(positionId);
    if (!position || position.status !== PositionStatus.OPEN) {
      return position;
    }
    position.status = PositionStatus.HIT;
    position.priceAtHit = price;
    position.timeHit = timestamp;
    this.positions.set(positionId, position);
    this.emit('position_hit', position);
    return position;
  }

  settle(positionId: PositionId, timestamp: Timestamp): Position | undefined {
    const position = this.positions.get(positionId);
    if (!position) {
      return undefined;
    }
    position.status = PositionStatus.SETTLED;
    position.timeSettled = timestamp;
    this.positions.set(positionId, position);
    this.emit('position_settled', position);
    return position;
  }

  expire(positionId: PositionId, timestamp: Timestamp): Position | undefined {
    const position = this.positions.get(positionId);
    if (!position) {
      return undefined;
    }
    position.status = PositionStatus.EXPIRED;
    position.timeSettled = timestamp;
    this.positions.set(positionId, position);
    this.emit('position_expired', position);
    return position;
  }

  get(positionId: PositionId): Position | undefined {
    const position = this.positions.get(positionId);
    return position ? { ...position } : undefined;
  }

  listByOrder(orderId: OrderId): Position[] {
    const ids = this.positionsByOrder.get(orderId);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.positions.get(id))
      .filter((p): p is Position => Boolean(p));
  }

  listByUser(userId: AccountId): Position[] {
    const ids = this.positionsByUser.get(userId);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.positions.get(id))
      .filter((p): p is Position => Boolean(p));
  }

  private nextId(orderId: OrderId, userId: AccountId): PositionId {
    return `${orderId}:${userId}:${Date.now().toString(36)}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }

  private indexPosition(position: Position): void {
    if (!this.positionsByOrder.has(position.orderId)) {
      this.positionsByOrder.set(position.orderId, new Set());
    }
    this.positionsByOrder.get(position.orderId)!.add(position.id);

    if (!this.positionsByUser.has(position.userId)) {
      this.positionsByUser.set(position.userId, new Set());
    }
    this.positionsByUser.get(position.userId)!.add(position.id);
  }
}
