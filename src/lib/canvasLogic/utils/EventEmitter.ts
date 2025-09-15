export type EventListener<T = any> = (data: T) => void

export class EventEmitter {
  private events: Map<string, EventListener[]> = new Map()

  on<T = any>(event: string, listener: EventListener<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(listener)
  }

  off<T = any>(event: string, listener: EventListener<T>): void {
    const listeners = this.events.get(event)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  emit<T = any>(event: string, data?: T): void {
    const listeners = this.events.get(event)
    if (listeners) {
      listeners.forEach(listener => listener(data))
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event)
    } else {
      this.events.clear()
    }
  }
}