import { randomUUID } from "crypto";
import type {
  ClearingHouseEvent,
  EventName,
  OrderEventPayloads,
} from "./types";
import type { EventId, OrderbookId, Timestamp } from "../domain/primitives";
import { EventStream } from "./event-stream";

export type EventListener<TName extends EventName = EventName> = (
  event: ClearingHouseEvent<TName>,
) => void | Promise<void>;

export class EventBus {
  private listeners: Map<EventName, Set<EventListener>> = new Map();
  private backlog: ClearingHouseEvent[] = [];
  private streams: Set<EventStream<ClearingHouseEvent>> = new Set();

  publish(event: ClearingHouseEvent): void {
    this.backlog.push(event);
    this.broadcast(event);
  }

  on<TName extends EventName>(name: TName, listener: EventListener<TName>): () => void {
    const listeners = this.listeners.get(name) ?? new Set<EventListener>();
    listeners.add(listener as EventListener);
    this.listeners.set(name, listeners);
    return () => listeners.delete(listener as EventListener);
  }

  async dispatchAll(): Promise<void> {
    const queue = this.backlog.splice(0, this.backlog.length);
    for (const event of queue) {
      const listeners = this.listeners.get(event.name);
      if (!listeners) continue;
      for (const listener of [...listeners]) {
        await listener(event);
      }
    }
  }

  broadcast(event: ClearingHouseEvent): void {
    if (this.streams.size === 0) {
      return;
    }

    for (const stream of this.streams) {
      stream.push(event);
    }
  }

  events(): EventStream<ClearingHouseEvent> {
    const stream = new EventStream<ClearingHouseEvent>(() => this.streams.delete(stream));
    this.streams.add(stream);
    return stream;
  }
}

export interface EventEnvelopeInput<TName extends EventName> {
  name: TName;
  orderbookId: OrderbookId;
  ts: Timestamp;
  clockSeq: number;
  version?: number;
  sourceTs?: Timestamp;
  payload: OrderEventPayloads[TName];
}

export class EventFactory {
  constructor(private readonly orderbookId: OrderbookId) {}

  create<TName extends EventName>(
    input: Omit<EventEnvelopeInput<TName>, "orderbookId">,
  ): ClearingHouseEvent<TName> {
    return {
      eventId: randomUUID() as EventId,
      orderbookId: this.orderbookId,
      ...input,
    } as ClearingHouseEvent<TName>;
  }
}
