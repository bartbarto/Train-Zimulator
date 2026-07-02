import { FIXED_TIMESTEP, MAX_STEPS_PER_FRAME } from '@/engine/constants'

export interface LoopCallbacks {
  /** Deterministic simulation tick at a fixed timestep. */
  fixedUpdate: (dt: number) => void
  /** Per-frame update for rendering/interpolation. `alpha` is the blend factor. */
  render: (frameDt: number, alpha: number) => void
}

/**
 * Fixed-timestep game loop. Simulation runs at {@link FIXED_TIMESTEP} for
 * determinism and stability; rendering happens once per animation frame with an
 * interpolation factor. Clamps the number of catch-up steps to avoid the
 * "spiral of death" after a stall (e.g. tab backgrounded).
 */
export class GameLoop {
  private callbacks: LoopCallbacks
  private running = false
  private rafId = 0
  private lastTime = 0
  private accumulator = 0

  private frameCount = 0
  private fpsTimer = 0
  private currentFps = 0

  constructor(callbacks: LoopCallbacks) {
    this.callbacks = callbacks
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  get fps(): number {
    return this.currentFps
  }

  private readonly tick = (now: number): void => {
    if (!this.running) return
    this.rafId = requestAnimationFrame(this.tick)

    let frameDt = (now - this.lastTime) / 1000
    this.lastTime = now
    if (frameDt > 0.25) frameDt = 0.25 // clamp after long pauses

    this.accumulator += frameDt
    let steps = 0
    while (this.accumulator >= FIXED_TIMESTEP && steps < MAX_STEPS_PER_FRAME) {
      this.callbacks.fixedUpdate(FIXED_TIMESTEP)
      this.accumulator -= FIXED_TIMESTEP
      steps++
    }
    if (steps === MAX_STEPS_PER_FRAME) this.accumulator = 0

    const alpha = this.accumulator / FIXED_TIMESTEP
    this.callbacks.render(frameDt, alpha)
    this.updateFps(frameDt)
  }

  private updateFps(frameDt: number): void {
    this.frameCount++
    this.fpsTimer += frameDt
    if (this.fpsTimer >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTimer)
      this.frameCount = 0
      this.fpsTimer = 0
    }
  }
}
