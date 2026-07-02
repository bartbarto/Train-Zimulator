/** Minimal strongly-typed publish/subscribe bus for cross-subsystem events. */

export type EventHandler<T> = (payload: T) => void

/**
 * Generic event bus. The `EventMap` type parameter maps event names to their
 * payload types, giving full type-safety on emit/on.
 */
export class EventBus<EventMap extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof EventMap, Set<EventHandler<unknown>>>()

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler as EventHandler<unknown>)
    return () => this.off(event, handler)
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>)
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.handlers.get(event)
    if (!set) return
    for (const handler of set) {
      ;(handler as EventHandler<EventMap[K]>)(payload)
    }
  }

  clear(): void {
    this.handlers.clear()
  }
}

/** Application-wide event definitions. */
export interface SimEventMap extends Record<string, unknown> {
  'horn': boolean
  'bell': boolean
  'wheelslip': boolean
  'brakeApplication': number
  'stationArrival': string
  'emergencyBrake': void
  'engineStateChanged': boolean
}
