/**
 * Owns the Web Audio context, master bus and 3D listener. The context starts
 * suspended (browser autoplay policy) and is resumed on the first user gesture.
 * Sub-systems (engine, ambient) attach to {@link master}.
 */
export class AudioEngine {
  readonly ctx: AudioContext
  readonly master: GainNode
  private started = false

  constructor() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.8
    this.master.connect(this.ctx.destination)
  }

  /** Resume the context; call from a user gesture handler. */
  async resume(): Promise<void> {
    if (this.started) return
    await this.ctx.resume()
    this.started = true
  }

  setMasterVolume(value: number): void {
    this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05)
  }

  /** Update the listener orientation so positional sources pan correctly. */
  setListenerOrientation(forwardX: number, forwardY: number, forwardZ: number): void {
    const l = this.ctx.listener
    if (l.forwardX) {
      l.forwardX.value = forwardX
      l.forwardY.value = forwardY
      l.forwardZ.value = forwardZ
      l.upX.value = 0
      l.upY.value = 1
      l.upZ.value = 0
    }
  }

  /** Create a buffer of white noise, reused by procedural sound sources. */
  createNoiseBuffer(seconds = 2): AudioBuffer {
    const length = this.ctx.sampleRate * seconds
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  dispose(): void {
    void this.ctx.close()
  }
}
