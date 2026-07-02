import { KN_TO_N } from '@/engine/constants'
import { clamp, damp } from '@/engine/math'
import type { BrakeSpec } from '@/data/types'
import type { ControlState } from './Controls'

export interface BrakeTelemetry {
  mainReservoirBar: number
  equalizingReservoirBar: number
  brakePipeBar: number
  brakeCylinderBar: number
}

/** Full-service brake-pipe reduction in bar (from release pressure). */
const FULL_SERVICE_REDUCTION = 1.5

/**
 * Simplified Westinghouse-style automatic air brake. The driver sets the
 * equalising reservoir via the train brake handle; the brake pipe chases it at
 * a finite rate (with a length-dependent propagation lag), and a triple-valve
 * abstraction converts pipe *reductions* into brake-cylinder pressure. The
 * independent brake applies cylinder pressure directly on the locomotive.
 */
export class BrakeSystem {
  private readonly spec: BrakeSpec
  private readonly propagationSeconds: number

  private mainReservoir: number
  private equalizingReservoir: number
  private brakePipe: number
  private brakeCylinder = 0

  constructor(spec: BrakeSpec, trainLengthMetres: number) {
    this.spec = spec
    this.propagationSeconds = Math.max(0.1, spec.propagationSecondsPerMetre * trainLengthMetres)
    this.mainReservoir = spec.mainReservoirBar
    this.equalizingReservoir = spec.brakePipeBar
    this.brakePipe = spec.brakePipeBar
  }

  update(dt: number, controls: ControlState, enforcedTrainBrake = 0): void {
    this.updateMainReservoir(dt, controls)
    this.updateEqualizingReservoir(controls, enforcedTrainBrake)
    this.updateBrakePipe(dt, controls)
    this.updateBrakeCylinder(dt, controls)
  }

  private updateMainReservoir(dt: number, controls: ControlState): void {
    const compressorOnline = controls.masterKey && controls.engineRunning
    const target = compressorOnline ? this.spec.mainReservoirBar : this.mainReservoir * 0.999
    this.mainReservoir = damp(this.mainReservoir, target, 0.2, dt)
  }

  private updateEqualizingReservoir(controls: ControlState, enforcedTrainBrake = 0): void {
    if (controls.emergencyBrake) {
      this.equalizingReservoir = 0
      return
    }
    const trainBrake = Math.max(controls.trainBrake, enforcedTrainBrake)
    this.equalizingReservoir = this.spec.brakePipeBar - trainBrake * FULL_SERVICE_REDUCTION
  }

  private updateBrakePipe(dt: number, controls: ControlState): void {
    if (controls.emergencyBrake) {
      // Emergency vents the pipe to atmosphere rapidly.
      this.brakePipe = damp(this.brakePipe, 0, 6, dt)
      return
    }
    // The pipe chases the equalising reservoir, limited by charge rate and the
    // length-based propagation lag of the train.
    const rate = this.spec.pipeChargeRateBar / this.propagationSeconds
    const target = Math.min(this.equalizingReservoir, this.mainReservoir)
    const maxStep = rate * dt
    const diff = clamp(target - this.brakePipe, -maxStep, maxStep)
    this.brakePipe += diff
  }

  private updateBrakeCylinder(dt: number, controls: ControlState): void {
    const reduction = clamp(this.spec.brakePipeBar - this.brakePipe, 0, this.spec.brakePipeBar)
    const autoCylinder = clamp(
      (reduction / FULL_SERVICE_REDUCTION) * this.spec.maxBrakeCylinderBar,
      0,
      this.spec.maxBrakeCylinderBar,
    )
    const independentCylinder = controls.independentBrake * this.spec.maxBrakeCylinderBar
    const target = controls.emergencyBrake
      ? this.spec.maxBrakeCylinderBar
      : Math.max(autoCylinder, independentCylinder)
    this.brakeCylinder = damp(this.brakeCylinder, target, 5, dt)
  }

  /** Retarding force (N) produced by the friction (air) brakes. */
  getBrakeForce(): number {
    return this.brakeCylinder * this.spec.brakeForcePerBarKN * KN_TO_N
  }

  /** 0..1 measure of pneumatic brake effort, used for audio/effects. */
  get effort(): number {
    return clamp(this.brakeCylinder / this.spec.maxBrakeCylinderBar, 0, 1)
  }

  getTelemetry(): BrakeTelemetry {
    return {
      mainReservoirBar: this.mainReservoir,
      equalizingReservoirBar: this.equalizingReservoir,
      brakePipeBar: this.brakePipe,
      brakeCylinderBar: this.brakeCylinder,
    }
  }

  /** Restore persisted pressures (used by the save system). */
  restore(t: Partial<BrakeTelemetry>): void {
    if (t.mainReservoirBar !== undefined) this.mainReservoir = t.mainReservoirBar
    if (t.equalizingReservoirBar !== undefined) this.equalizingReservoir = t.equalizingReservoirBar
    if (t.brakePipeBar !== undefined) this.brakePipe = t.brakePipeBar
    if (t.brakeCylinderBar !== undefined) this.brakeCylinder = t.brakeCylinderBar
  }
}
