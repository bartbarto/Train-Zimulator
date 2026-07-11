import type { GamepadConfig } from './input/GamepadDevice'
import { DEFAULT_GAMEPAD_CONFIG } from './input/GamepadDevice'
import type { KeyBindings } from './input/KeyboardDevice'
import { DEFAULT_KEY_BINDINGS } from './input/KeyboardDevice'

export interface GraphicsSettings {
  bloom: boolean
  shadows: boolean
  exposure: number
  pixelRatioCap: number
}

export interface CameraSettings {
  fov: number
  lookSensitivity: number
  invertY: boolean
  smoothing: number
}

export interface AudioSettings {
  master: number
  engine: number
  ambient: number
}

export interface Settings {
  graphics: GraphicsSettings
  camera: CameraSettings
  audio: AudioSettings
  keyBindings: KeyBindings
  gamepad: GamepadConfig
  showHud: boolean
}

export function createDefaultSettings(): Settings {
  return {
    graphics: { bloom: true, shadows: true, exposure: 1.0, pixelRatioCap: 2 },
    camera: { fov: 50, lookSensitivity: 1, invertY: false, smoothing: 12 },
    audio: { master: 0.8, engine: 0.9, ambient: 0.7 },
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
    gamepad: { ...DEFAULT_GAMEPAD_CONFIG },
    showHud: true,
  }
}

const STORAGE_KEY = 'trainsim.settings.v1'

/**
 * Loads, persists and broadcasts user settings. Settings are deep-merged with
 * defaults on load so adding new fields never breaks existing saves.
 */
export class SettingsManager {
  readonly settings: Settings
  private readonly listeners = new Set<(s: Settings) => void>()

  constructor() {
    this.settings = this.load()
  }

  private load(): Settings {
    const defaults = createDefaultSettings()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return defaults
      const parsed = JSON.parse(raw) as Partial<Settings>
      return {
        ...defaults,
        ...parsed,
        graphics: { ...defaults.graphics, ...parsed.graphics },
        camera: { ...defaults.camera, ...parsed.camera },
        audio: { ...defaults.audio, ...parsed.audio },
        gamepad: { ...defaults.gamepad, ...parsed.gamepad },
        keyBindings: { ...defaults.keyBindings, ...parsed.keyBindings },
      }
    } catch {
      return defaults
    }
  }

  save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    for (const listener of this.listeners) listener(this.settings)
  }

  /** Apply a partial update and persist. */
  patch(mutator: (s: Settings) => void): void {
    mutator(this.settings)
    this.save()
  }

  onChange(listener: (s: Settings) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
