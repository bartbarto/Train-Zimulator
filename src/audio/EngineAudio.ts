import { remap } from '@/engine/math'
import type { AudioEngine } from './AudioEngine'
import type { PowerTelemetry } from '@/simulation/power/IPowerUnit'

/**
 * Procedurally synthesises the diesel prime mover: stacked detuned oscillators
 * give a low-frequency rumble whose pitch and gain track engine RPM/load, while
 * a band-passed noise layer provides turbo whine. Also produces the two-tone
 * horn and a periodic bell. No samples required.
 */
export class EngineAudio {
  private readonly audio: AudioEngine
  private readonly bus: GainNode
  private readonly rumbleOscA: OscillatorNode
  private readonly rumbleOscB: OscillatorNode
  private readonly rumbleGain: GainNode
  private readonly turboFilter: BiquadFilterNode
  private readonly turboGain: GainNode
  private readonly hornGain: GainNode
  private readonly hornOscA: OscillatorNode
  private readonly hornOscB: OscillatorNode
  private readonly bellGain: GainNode
  private bellTimer = 0
  private bellOn = false

  constructor(audio: AudioEngine, settingsGain = 0.9) {
    this.audio = audio
    const ctx = audio.ctx
    this.bus = ctx.createGain()
    this.bus.gain.value = settingsGain
    this.bus.connect(audio.master)

    // Engine rumble: two saw oscillators slightly detuned, lowpass filtered.
    this.rumbleGain = ctx.createGain()
    this.rumbleGain.gain.value = 0
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 320
    this.rumbleOscA = ctx.createOscillator()
    this.rumbleOscB = ctx.createOscillator()
    this.rumbleOscA.type = 'sawtooth'
    this.rumbleOscB.type = 'square'
    this.rumbleOscB.detune.value = -12
    this.rumbleOscA.connect(this.rumbleGain)
    this.rumbleOscB.connect(this.rumbleGain)
    this.rumbleGain.connect(lp)
    lp.connect(this.bus)
    this.rumbleOscA.start()
    this.rumbleOscB.start()

    // Turbo whine: filtered noise.
    const noise = ctx.createBufferSource()
    noise.buffer = audio.createNoiseBuffer()
    noise.loop = true
    this.turboFilter = ctx.createBiquadFilter()
    this.turboFilter.type = 'bandpass'
    this.turboFilter.frequency.value = 1200
    this.turboFilter.Q.value = 6
    this.turboGain = ctx.createGain()
    this.turboGain.gain.value = 0
    noise.connect(this.turboFilter)
    this.turboFilter.connect(this.turboGain)
    this.turboGain.connect(this.bus)
    noise.start()

    // Horn: two detuned oscillators with a gated gain.
    this.hornGain = ctx.createGain()
    this.hornGain.gain.value = 0
    this.hornOscA = ctx.createOscillator()
    this.hornOscB = ctx.createOscillator()
    this.hornOscA.type = 'sawtooth'
    this.hornOscB.type = 'sawtooth'
    this.hornOscA.frequency.value = 311
    this.hornOscB.frequency.value = 370
    this.hornOscA.connect(this.hornGain)
    this.hornOscB.connect(this.hornGain)
    this.hornGain.connect(audio.master)
    this.hornOscA.start()
    this.hornOscB.start()

    // Bell: single oscillator, struck periodically.
    this.bellGain = ctx.createGain()
    this.bellGain.gain.value = 0
    const bellOsc = ctx.createOscillator()
    bellOsc.type = 'sine'
    bellOsc.frequency.value = 660
    bellOsc.connect(this.bellGain)
    this.bellGain.connect(audio.master)
    bellOsc.start()
  }

  setVolume(value: number): void {
    this.bus.gain.setTargetAtTime(value, this.audio.ctx.currentTime, 0.1)
  }

  silence(): void {
    const t = this.audio.ctx.currentTime
    this.rumbleGain.gain.setValueAtTime(0, t)
    this.turboGain.gain.setValueAtTime(0, t)
    this.hornGain.gain.setValueAtTime(0, t)
    this.bellGain.gain.setValueAtTime(0, t)
    this.bellTimer = 0
    this.bellOn = false
  }

  update(dt: number, power: PowerTelemetry, horn: boolean, bell: boolean): void {
    const ctx = this.audio.ctx
    const t = ctx.currentTime
    const online = power.online

    const fundamental = online ? remap(power.rpm, 200, 1000, 28, 78) : 0
    this.rumbleOscA.frequency.setTargetAtTime(fundamental, t, 0.08)
    this.rumbleOscB.frequency.setTargetAtTime(fundamental * 1.5, t, 0.08)
    this.rumbleGain.gain.setTargetAtTime(online ? 0.18 + power.load * 0.22 : 0, t, 0.1)

    this.turboFilter.frequency.setTargetAtTime(900 + power.load * 2600, t, 0.15)
    this.turboGain.gain.setTargetAtTime(online ? power.load * 0.05 : 0, t, 0.2)

    this.hornGain.gain.setTargetAtTime(horn ? 0.22 : 0, t, 0.02)
    this.updateBell(dt, bell)
  }

  private updateBell(dt: number, bell: boolean): void {
    const t = this.audio.ctx.currentTime
    if (!bell) {
      this.bellGain.gain.setTargetAtTime(0, t, 0.05)
      return
    }
    this.bellTimer -= dt
    if (this.bellTimer <= 0) {
      this.bellTimer = 0.6
      this.bellOn = !this.bellOn
      const peak = this.bellOn ? 0.12 : 0
      this.bellGain.gain.setTargetAtTime(peak, t, 0.02)
    }
  }

  get hornFrequency(): number {
    return this.hornOscA.frequency.value
  }

  setListenerThrottle(_value: number): void {
    // Reserved for future EQ shaping based on driver position.
  }

  dispose(): void {
    this.rumbleOscA.stop()
    this.rumbleOscB.stop()
  }
}
