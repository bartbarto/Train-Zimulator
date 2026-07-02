import { GRAVITY } from '@/engine/constants'
import type { ResistanceSpec } from '@/data/types'

/** Inputs required to integrate one physics step. */
export interface PhysicsInput {
  massKg: number
  reverser: number
  /** Power-limited tractive effort magnitude available at the wheels (N). */
  tractiveEffortN: number
  /** Friction (air) brake retarding force (N). */
  brakeForceN: number
  /** Dynamic brake retarding force (N). */
  dynamicBrakeForceN: number
  /** Track gradient in radians (positive = uphill in travel direction). */
  gradientRad: number
  resistance: ResistanceSpec
  /** Maximum adhesive force the driven wheels can transmit (N). */
  maxAdhesionN: number
  sanding: boolean
}

/** Result of a physics step (read-only snapshot for consumers). */
export interface PhysicsState {
  /** Distance travelled along the track (m). Signed by direction of travel. */
  distance: number
  /** Speed along the track (m/s). Sign indicates forward/reverse. */
  speed: number
  /** Longitudinal acceleration (m/s^2). */
  acceleration: number
  /** True while demanded tractive effort exceeds available adhesion. */
  wheelSlip: boolean
}

/** Slip reduces transmitted force to the kinetic (sliding) coefficient ratio. */
const KINETIC_ADHESION_RATIO = 0.7
/** Speed below which the train is treated as stationary to avoid jitter. */
const STANDSTILL_SPEED = 0.05

/**
 * Longitudinal train dynamics integrator. Models tractive effort limited by
 * wheel/rail adhesion (with sanding and slip), Davis rolling/air resistance,
 * gradient resistance and braking. Deterministic and allocation-free.
 */
export class Physics {
  distance = 0
  speed = 0
  acceleration = 0
  wheelSlip = false

  step(dt: number, input: PhysicsInput): void {
    const dir = input.reverser
    let demandedTe = input.tractiveEffortN * dir

    // Adhesion: sanding raises the usable coefficient; exceeding it slips.
    const adhesionLimit = input.maxAdhesionN * (input.sanding ? 1.15 : 1)
    this.wheelSlip = Math.abs(demandedTe) > adhesionLimit && Math.abs(demandedTe) > 1
    if (this.wheelSlip) {
      demandedTe = Math.sign(demandedTe) * adhesionLimit * KINETIC_ADHESION_RATIO
    }

    const v = this.speed
    const speedSign = Math.abs(v) < STANDSTILL_SPEED ? 0 : Math.sign(v)

    // Davis resistance always opposes motion.
    const r = input.resistance
    const resistanceMag = r.a + r.b * Math.abs(v) + r.c * v * v
    const resistanceForce = -speedSign * resistanceMag

    // Gradient pulls the train downhill regardless of direction.
    const gradientForce = -input.massKg * GRAVITY * Math.sin(input.gradientRad)

    // Friction + dynamic braking oppose current motion (or resist starting).
    const brakeMag = input.brakeForceN + input.dynamicBrakeForceN
    const brakeForce = -speedSign * brakeMag

    const netForce = demandedTe + resistanceForce + gradientForce + brakeForce
    this.acceleration = netForce / input.massKg

    const newSpeed = v + this.acceleration * dt

    // Braking/resistance must not reverse the train through zero.
    if (speedSign !== 0 && Math.sign(newSpeed) !== speedSign && demandedTe * dir <= 0) {
      const heldByBrakes = brakeMag + resistanceMag >= Math.abs(demandedTe + gradientForce)
      this.speed = heldByBrakes ? 0 : newSpeed
    } else {
      this.speed = newSpeed
    }

    this.distance += this.speed * dt
  }

  getState(): PhysicsState {
    return {
      distance: this.distance,
      speed: this.speed,
      acceleration: this.acceleration,
      wheelSlip: this.wheelSlip,
    }
  }

  restore(distance: number, speed: number): void {
    this.distance = distance
    this.speed = speed
    this.acceleration = 0
    this.wheelSlip = false
  }
}
