import { AudioEngine } from './AudioEngine'
import { EngineAudio } from './EngineAudio'
import { AmbientAudio } from './AmbientAudio'
import type { AudioSettings } from '@/core/SettingsManager'
import type { TrainTelemetry } from '@/simulation/Train'
import type { ControlState } from '@/simulation/Controls'

/**
 * High-level audio facade. Wires the engine and ambient layers to the audio
 * context and drives them each frame from the train telemetry and control
 * state, so the soundscape always matches the simulation.
 */
export class SoundController {
  readonly audio = new AudioEngine()
  private readonly engine: EngineAudio
  private readonly ambient: AmbientAudio

  constructor(settings: AudioSettings) {
    this.audio.setMasterVolume(settings.master)
    this.engine = new EngineAudio(this.audio, settings.engine)
    this.ambient = new AmbientAudio(this.audio, settings.ambient)
  }

  resume(): Promise<void> {
    return this.audio.resume()
  }

  applySettings(settings: AudioSettings): void {
    this.audio.setMasterVolume(settings.master)
    this.engine.setVolume(settings.engine)
    this.ambient.setVolume(settings.ambient)
  }

  update(dt: number, telemetry: TrainTelemetry, controls: ControlState, brakeEffort: number, rainIntensity: number): void {
    this.engine.update(dt, telemetry.power, controls.horn, controls.bell)
    this.ambient.update(dt, telemetry.speedMs, brakeEffort, rainIntensity)
  }

  dispose(): void {
    this.audio.dispose()
  }
}
