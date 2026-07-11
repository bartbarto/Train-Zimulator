import { clamp } from '@/engine/math'
import type { AudioEngine } from './AudioEngine'

/**
 * Environmental and rolling-stock sound: wind that rises with speed, rolling
 * wheel/rail rumble (amplitude-modulated by speed for rail joints), brake
 * hiss/squeal driven by brake effort, and rain. All synthesised from filtered
 * noise so volume/timbre respond continuously to the simulation.
 */
export class AmbientAudio {
  private readonly audio: AudioEngine
  private readonly bus: GainNode
  private readonly windGain: GainNode
  private readonly windFilter: BiquadFilterNode
  private readonly wheelGain: GainNode
  private readonly wheelFilter: BiquadFilterNode
  private readonly brakeGain: GainNode
  private readonly rainGain: GainNode
  private jointTimer = 0

  constructor(audio: AudioEngine, settingsGain = 0.7) {
    this.audio = audio
    const ctx = audio.ctx
    this.bus = ctx.createGain()
    this.bus.gain.value = settingsGain
    this.bus.connect(audio.master)

    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'lowpass'
    this.windFilter.frequency.value = 600
    this.windGain = this.makeNoiseLayer(this.windFilter, 0)

    this.wheelFilter = ctx.createBiquadFilter()
    this.wheelFilter.type = 'bandpass'
    this.wheelFilter.frequency.value = 120
    this.wheelFilter.Q.value = 1.2
    this.wheelGain = this.makeNoiseLayer(this.wheelFilter, 0)

    const brakeFilter = ctx.createBiquadFilter()
    brakeFilter.type = 'highpass'
    brakeFilter.frequency.value = 2200
    this.brakeGain = this.makeNoiseLayer(brakeFilter, 0)

    const rainFilter = ctx.createBiquadFilter()
    rainFilter.type = 'highpass'
    rainFilter.frequency.value = 1400
    this.rainGain = this.makeNoiseLayer(rainFilter, 0)
  }

  private makeNoiseLayer(filter: BiquadFilterNode, initialGain: number): GainNode {
    const ctx = this.audio.ctx
    const source = ctx.createBufferSource()
    source.buffer = this.audio.createNoiseBuffer()
    source.loop = true
    const gain = ctx.createGain()
    gain.gain.value = initialGain
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.bus)
    source.start()
    return gain
  }

  setVolume(value: number): void {
    this.bus.gain.setTargetAtTime(value, this.audio.ctx.currentTime, 0.1)
  }

  silence(): void {
    const t = this.audio.ctx.currentTime
    this.windGain.gain.setValueAtTime(0, t)
    this.wheelGain.gain.setValueAtTime(0, t)
    this.brakeGain.gain.setValueAtTime(0, t)
    this.rainGain.gain.setValueAtTime(0, t)
    this.jointTimer = 0
  }

  update(dt: number, speedMs: number, brakeEffort: number, rainIntensity: number): void {
    const t = this.audio.ctx.currentTime
    const speed = Math.abs(speedMs)
    const speedN = clamp(speed / 40, 0, 1)

    this.windGain.gain.setTargetAtTime(speedN * speedN * 0.25, t, 0.2)
    this.windFilter.frequency.setTargetAtTime(400 + speedN * 1800, t, 0.2)

    // Rail joints: brief amplitude bumps at a rate proportional to speed.
    this.jointTimer -= dt
    let jointAccent = 0
    if (speed > 1 && this.jointTimer <= 0) {
      this.jointTimer = clamp(18 / Math.max(speed, 1), 0.12, 1.2)
      jointAccent = 0.15
    }
    this.wheelGain.gain.setTargetAtTime(speedN * 0.18 + jointAccent, t, jointAccent > 0 ? 0.01 : 0.1)
    this.wheelFilter.frequency.setTargetAtTime(80 + speedN * 220, t, 0.2)

    this.brakeGain.gain.setTargetAtTime(brakeEffort > 0.05 && speed > 0.5 ? brakeEffort * 0.06 : 0, t, 0.1)
    this.rainGain.gain.setTargetAtTime(rainIntensity * 0.12, t, 0.3)
  }
}
