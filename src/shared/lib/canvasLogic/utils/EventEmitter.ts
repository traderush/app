export type EventListener<T> = (data: T) => void;

type EventMap = Record<string, unknown>;

export class EventEmitter<Events extends EventMap = EventMap> {
  private readonly events = new Map<keyof Events, EventListener<Events[keyof Events]>[]>();

  on<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void {
    const listeners = this.events.get(event) ?? [];
    listeners.push(listener);
    this.events.set(event, listeners);
  }

  off<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void {
    const listeners = this.events.get(event);
    if (!listeners) {
      return;
    }

    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  emit<K extends keyof Events>(
    event: K,
    ...[data]: Events[K] extends void ? [] : [Events[K]]
  ): void {
    const listeners = this.events.get(event);
    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => listener(data as Events[K]));
  }

  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.events.delete(event);
      return;
    }

    this.events.clear();
  }
}
