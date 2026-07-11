import { clamp, clamp01 } from '@/engine/math'

export type Reverser = -1 | 0 | 1
export type MultiState = 0 | 1 | 2

/**
 * The complete state of every driver-operable control. This is the single
 * source of truth: the input system, clickable cab interaction and save system
 * all read and write here, and the simulation only ever reads from it.
 */
export interface ControlState {
  /** Throttle 0..1 (continuous; quantised to notches for display). */
  throttle: number
  /** Automatic (train) brake 0..1. */
  trainBrake: number
  /** Independent (locomotive) brake 0..1. */
  independentBrake: number
  /** Dynamic brake 0..1. */
  dynamicBrake: number
  reverser: Reverser
  emergencyBrake: boolean
  horn: boolean
  bell: boolean
  sander: boolean
  headlights: MultiState
  wipers: MultiState
  cabLights: boolean
  masterKey: boolean
  engineRunning: boolean
  pantograph: boolean
  doorsOpen: boolean
}

export function createDefaultControlState(): ControlState {
  return {
    throttle: 0,
    trainBrake: 0,
    independentBrake: 0,
    dynamicBrake: 0,
    reverser: 0,
    emergencyBrake: false,
    horn: false,
    bell: false,
    sander: false,
    headlights: 0,
    wipers: 0,
    cabLights: false,
    masterKey: false,
    engineRunning: false,
    pantograph: false,
    doorsOpen: false,
  }
}

/**
 * Wraps a ControlState with safe mutation helpers (notching, clamping,
 * interlocks). Keeps mutation logic in one place rather than scattered.
 */
export class Controls {
  readonly state: ControlState
  readonly throttleNotches: number

  constructor(throttleNotches: number, initial?: Partial<ControlState>) {
    this.throttleNotches = throttleNotches
    this.state = { ...createDefaultControlState(), ...initial }
  }

  /** Combined lever: +1 = full throttle, −1 = full brake, 0 = idle. */
  get powerLever(): number {
    if (this.state.throttle > 0.01) return this.state.throttle
    if (this.state.trainBrake > 0.01) return -this.state.trainBrake
    return 0
  }

  setPowerLever(value: number): void {
    const v = clamp(value, -1, 1)
    if (v < 0.01 && v > 0) {
      this.state.throttle = 0
      this.state.trainBrake = 0
      return
    }
    if (v > 0) {
      this.state.throttle = v
      this.state.trainBrake = 0
    } else if (v < 0) {
      this.state.trainBrake = -v
      this.state.throttle = 0
    } else {
      this.state.throttle = 0
      this.state.trainBrake = 0
    }
  }

  /** Step the combined lever (positive = more power, negative = more brake). */
  adjustPowerLever(delta: number): void {
    this.setPowerLever(clamp(this.powerLever + delta, -1, 1))
  }

  setThrottle(value: number): void {
    this.state.throttle = clamp01(value)
  }

  /** Step throttle by whole notches (positive = increase). */
  notchThrottle(delta: number): void {
    const current = Math.round(this.state.throttle * this.throttleNotches)
    const next = clamp(current + delta, 0, this.throttleNotches)
    this.state.throttle = next / this.throttleNotches
  }

  /** Quantised notch index for display (0 = idle). */
  get throttleNotch(): number {
    return Math.round(this.state.throttle * this.throttleNotches)
  }

  setTrainBrake(value: number): void {
    this.state.trainBrake = clamp01(value)
  }

  setIndependentBrake(value: number): void {
    this.state.independentBrake = clamp01(value)
  }

  setDynamicBrake(value: number): void {
    this.state.dynamicBrake = clamp01(value)
  }

  /** Reverser only moves when throttle is at idle (realistic interlock). */
  setReverser(value: Reverser): void {
    if (this.state.throttle > 0.02) return
    this.state.reverser = value
  }

  cycleHeadlights(): void {
    this.state.headlights = ((this.state.headlights + 1) % 3) as MultiState
  }

  cycleWipers(): void {
    this.state.wipers = ((this.state.wipers + 1) % 3) as MultiState
  }

  toggleBell(): void {
    this.state.bell = !this.state.bell
  }

  toggleCabLights(): void {
    this.state.cabLights = !this.state.cabLights
  }

  toggleMasterKey(): void {
    this.state.masterKey = !this.state.masterKey
    if (!this.state.masterKey) this.state.engineRunning = false
  }

  toggleDoors(): void {
    this.state.doorsOpen = !this.state.doorsOpen
  }

  togglePantograph(): void {
    this.state.pantograph = !this.state.pantograph
  }

  /** Engine can only start with master key on. */
  startEngine(): boolean {
    if (!this.state.masterKey) return false
    this.state.engineRunning = true
    return true
  }

  stopEngine(): void {
    this.state.engineRunning = false
  }

  triggerEmergency(): void {
    this.state.emergencyBrake = true
    this.state.throttle = 0
  }

  releaseEmergency(): void {
    this.state.emergencyBrake = false
  }
}
