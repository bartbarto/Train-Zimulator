import type { SignalSpec } from '@/data/types'

/** Four-aspect signalling, ordered from most to least restrictive. */
export type SignalAspect = 'danger' | 'caution' | 'preliminaryCaution' | 'clear'

export interface SignalState {
  id: string
  distance: number
  aspect: SignalAspect
}

/** An occupied span of track (e.g. a train), in metres along the route. */
export interface Occupancy {
  start: number
  end: number
}

const ASPECT_BY_CLEAR_BLOCKS: SignalAspect[] = ['danger', 'caution', 'preliminaryCaution', 'clear']

/**
 * Block signalling. The route is divided into blocks delimited by signals; a
 * signal shows an aspect based on how many consecutive blocks ahead are clear.
 * AI trains and the HUD both consume aspects through {@link getNextSignal}.
 */
export class SignalSystem {
  private readonly signals: SignalState[]
  /** Block i spans [signals[i].distance, signals[i+1].distance). */
  private readonly blockOccupied: boolean[]

  constructor(specs: SignalSpec[], routeLength: number) {
    const sorted = [...specs].sort((a, b) => a.distance - b.distance)
    this.signals = sorted.map((s) => ({ id: s.id, distance: s.distance, aspect: 'clear' }))
    this.blockOccupied = new Array(this.signals.length).fill(false)
    // Sentinel end-of-route used for the final block extent.
    this.routeLength = routeLength
  }

  private readonly routeLength: number

  private blockEnd(index: number): number {
    return index + 1 < this.signals.length ? this.signals[index + 1].distance : this.routeLength
  }

  /** Recompute block occupancy and signal aspects from current train spans. */
  update(occupancies: readonly Occupancy[]): void {
    for (let i = 0; i < this.signals.length; i++) {
      const start = this.signals[i].distance
      const end = this.blockEnd(i)
      this.blockOccupied[i] = occupancies.some((o) => o.end >= start && o.start < end)
    }

    for (let i = 0; i < this.signals.length; i++) {
      let clearBlocks = 0
      for (let j = i; j < this.signals.length && clearBlocks < 3; j++) {
        if (this.blockOccupied[j]) break
        clearBlocks++
      }
      this.signals[i].aspect = ASPECT_BY_CLEAR_BLOCKS[Math.min(clearBlocks, 3)]
    }
  }

  /** The first signal at or ahead of `distance`, or null past the last one. */
  getNextSignal(distance: number): SignalState | null {
    for (const signal of this.signals) {
      if (signal.distance >= distance) return signal
    }
    return null
  }

  get all(): readonly SignalState[] {
    return this.signals
  }
}
