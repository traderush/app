type EventMap = Record<string, unknown>;
type EventArgs<T> = [T] extends [void] ? [] : [T];

export type EventListener<T> = (...args: EventArgs<T>) => void;

export class EventEmitter<Events extends EventMap = EventMap> {
  private readonly events: { [K in keyof Events]?: Set<EventListener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void {
    const listeners = this.events[event] ?? new Set<EventListener<Events[K]>>();
    listeners.add(listener);
    this.events[event] = listeners;
  }

  off<K extends keyof Events>(event: K, listener: EventListener<Events[K]>): void {
    const listeners = this.events[event];
    if (!listeners) {
      return;
    }

    listeners.delete(listener);

    if (listeners.size === 0) {
      delete this.events[event];
    }
  }

  emit<K extends keyof Events>(event: K, ...args: EventArgs<Events[K]>): void {
    const listeners = this.events[event];
    if (!listeners) {
      return;
    }

    listeners.forEach((listener) => {
      listener(...args);
    });
  }

  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.events[event]?.clear();
      delete this.events[event];
      return;
    }

    (Object.keys(this.events) as Array<keyof Events>).forEach((key) => {
      this.events[key]?.clear();
      delete this.events[key];
    });
  }
}
