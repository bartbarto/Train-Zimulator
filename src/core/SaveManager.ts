import type { ControlState } from '@/simulation/Controls'
import type { WeatherKind } from '@/simulation/Environment'

/** Serialisable snapshot of a play session. */
export interface SaveState {
  version: number
  locomotiveId: string
  routeId: string
  distance: number
  speedMs: number
  controls: ControlState
  timeOfDay: number
  weather: WeatherKind
  savedAt: number
}

const STORAGE_PREFIX = 'trainsim.save.'
const SAVE_VERSION = 1

/**
 * Persists and restores play sessions to localStorage under named slots.
 * Captures everything needed to resume: position, speed, every control
 * position, time of day and weather.
 */
export class SaveManager {
  list(): string[] {
    const slots: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) slots.push(key.slice(STORAGE_PREFIX.length))
    }
    return slots
  }

  save(slot: string, state: Omit<SaveState, 'version' | 'savedAt'>): void {
    const full: SaveState = { ...state, version: SAVE_VERSION, savedAt: Date.now() }
    localStorage.setItem(STORAGE_PREFIX + slot, JSON.stringify(full))
  }

  load(slot: string): SaveState | null {
    const raw = localStorage.getItem(STORAGE_PREFIX + slot)
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as SaveState
      if (parsed.version !== SAVE_VERSION) return null
      return parsed
    } catch {
      return null
    }
  }

  delete(slot: string): void {
    localStorage.removeItem(STORAGE_PREFIX + slot)
  }
}
