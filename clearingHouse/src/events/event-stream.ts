import type { ClearingHouseEvent } from "./types";

type Resolver<T> = (result: IteratorResult<T>) => void;

/**
 * EventStream implements an AsyncIterable that consumers can iterate over to
 * receive events as they are broadcast. The queue buffers events until a
 * consumer pulls them, and closing the stream releases any pending waiters.
 */
export class EventStream<TEvent = ClearingHouseEvent> implements AsyncIterableIterator<TEvent> {
  private readonly queue: TEvent[] = [];
  private readonly waiting: Resolver<TEvent>[] = [];
  private closed = false;

  constructor(private readonly onClose?: () => void) {}

  push(event: TEvent): void {
    if (this.closed) {
      return;
    }

    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      resolve?.({ value: event, done: false });
      return;
    }

    this.queue.push(event);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    while (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      resolve?.({ value: undefined as unknown as TEvent, done: true });
    }

    this.onClose?.();
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<TEvent> {
    return this;
  }

  async next(): Promise<IteratorResult<TEvent>> {
    if (this.queue.length > 0) {
      const value = this.queue.shift() as TEvent;
      return { value, done: false };
    }

    if (this.closed) {
      return { value: undefined as unknown as TEvent, done: true };
    }

    return new Promise<IteratorResult<TEvent>>((resolve) => {
      this.waiting.push(resolve);
    });
  }

  async return(): Promise<IteratorResult<TEvent>> {
    this.close();
    return { value: undefined as unknown as TEvent, done: true };
  }
}
