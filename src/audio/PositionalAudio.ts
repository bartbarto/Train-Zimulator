import type { AudioEngine } from './AudioEngine'

/**
 * Thin wrapper around a {@link PannerNode} for world-positioned point sources
 * (e.g. lineside sounds, other trains). Provided as a building block for future
 * spatialised audio; the cab-local engine/ambient layers use it indirectly via
 * the shared listener on {@link AudioEngine}.
 */
export class PositionalAudio {
  readonly panner: PannerNode
  readonly gain: GainNode

  constructor(audio: AudioEngine) {
    const ctx = audio.ctx
    this.panner = ctx.createPanner()
    this.panner.panningModel = 'HRTF'
    this.panner.distanceModel = 'inverse'
    this.panner.refDistance = 5
    this.panner.maxDistance = 400
    this.panner.rolloffFactor = 1.2
    this.gain = ctx.createGain()
    this.panner.connect(this.gain)
    this.gain.connect(audio.master)
  }

  setPosition(x: number, y: number, z: number): void {
    const t = this.panner.context.currentTime
    this.panner.positionX.setValueAtTime(x, t)
    this.panner.positionY.setValueAtTime(y, t)
    this.panner.positionZ.setValueAtTime(z, t)
  }

  connectSource(node: AudioNode): void {
    node.connect(this.panner)
  }
}
