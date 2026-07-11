import { GRAVITY, KN_TO_N, MS_TO_KMH, TONNE_TO_KG } from '@/engine/constants'
import { clamp } from '@/engine/math'
import type { LocomotiveSpec, RouteSpec } from '@/data/types'
import { Controls } from './Controls'
import { Physics, type PhysicsInput } from './Physics'
import { BrakeSystem } from './BrakeSystem'
import { DieselPowerUnit } from './power/DieselPowerUnit'
import { ElectricPowerUnit } from './power/ElectricPowerUnit'
import { SteamPowerUnit } from './power/SteamPowerUnit'
import type { IPowerUnit, PowerTelemetry } from './power/IPowerUnit'
import type { BrakeTelemetry } from './BrakeSystem'
import type { AutoBrakeState } from './SpeedGovernor'
import type { ITrackProvider } from './ITrackProvider'

/** Aggregated, render-friendly snapshot of the whole train each frame. */
export interface TrainTelemetry {
  speedKmh: number
  speedMs: number
  distance: number
  acceleration: number
  wheelSlip: boolean
  tractiveEffortKN: number
  gradientPerMille: number
  power: PowerTelemetry
  brakes: BrakeTelemetry
  autoBrake: AutoBrakeState
}

/** Factory selecting the correct power unit for a locomotive's type. */
function createPowerUnit(spec: LocomotiveSpec): IPowerUnit {
  switch (spec.type) {
    case 'diesel':
      return new DieselPowerUnit(spec)
    case 'electric':
      return new ElectricPowerUnit(spec)
    case 'steam':
      return new SteamPowerUnit(spec)
    default:
      return new DieselPowerUnit(spec)
  }
}

/**
 * The train: orchestrates the power unit, brake system and physics integrator
 * against a shared {@link Controls} state. Knows nothing about rendering.
 */
export class Train {
  readonly controls: Controls
  readonly physics = new Physics()
  private readonly spec: LocomotiveSpec
  private readonly track: ITrackProvider
  private readonly powerUnit: IPowerUnit
  private readonly brakes: BrakeSystem
  private readonly totalMassKg: number
  private readonly drivenMassKg: number

  /** Multiplier applied to wheel/rail adhesion (1 = dry, lower = wet/ice). */
  railAdhesionFactor = 1
  /** Passenger/service interlock; false cuts traction but still allows braking. */
  tractionMode: 'full' | 'inch' | 'recover' | 'blocked' = 'full'
  autoBrake: AutoBrakeState = {
    active: false,
    demand: 0,
    reason: null,
    targetSpeedKmh: 0,
    label: '',
  }

  private static readonly INCH_SPEED_CAP_MS = 5.5

  private tractiveEffortN = 0
  private gradientRad = 0

  private readonly physicsInput: PhysicsInput

  constructor(spec: LocomotiveSpec, route: RouteSpec, track: ITrackProvider) {
    this.spec = spec
    this.track = track
    this.controls = new Controls(spec.throttleNotches)
    this.powerUnit = createPowerUnit(spec)
    const trailingMass = spec.trailingMassTonnes ?? route.trailingMassTonnes
    const trailingLength = spec.trailingLengthMetres ?? route.trailingLengthMetres
    const totalLength = spec.lengthMetres + trailingLength
    this.brakes = new BrakeSystem(spec.brakes, totalLength)
    this.totalMassKg = (spec.massTonnes + trailingMass) * TONNE_TO_KG
    this.drivenMassKg = spec.massTonnes * TONNE_TO_KG * spec.adhesion.drivenMassFraction
    this.physicsInput = {
      massKg: this.totalMassKg,
      reverser: 0,
      tractiveEffortN: 0,
      brakeForceN: 0,
      dynamicBrakeForceN: 0,
      gradientRad: 0,
      resistance: spec.resistance,
      maxAdhesionN: 0,
      sanding: false,
    }
  }

  update(dt: number): void {
    const c = this.controls.state
    this.powerUnit.update(dt, c, this.physics.speed)
    this.brakes.update(dt, c, this.autoBrake.demand)

    this.gradientRad = this.track.getGradient(this.physics.distance)
    this.tractiveEffortN = this.computeTractiveEffort(c)

    const input = this.physicsInput
    input.reverser = c.reverser
    input.tractiveEffortN = this.tractiveEffortN
    input.brakeForceN = this.brakes.getBrakeForce()
    input.dynamicBrakeForceN = this.computeDynamicBrakeForce()
    input.gradientRad = this.gradientRad
    input.maxAdhesionN = this.spec.adhesion.baseFriction * this.drivenMassKg * GRAVITY * this.railAdhesionFactor
    input.sanding = c.sander

    this.physics.step(dt, input)
  }

  private computeTractiveEffort(c: Controls['state']): number {
    if (this.tractionMode === 'blocked') return 0

    const effort = this.powerUnit.getTractiveEffort(c, this.physics.speed)
    if (this.tractionMode === 'full') return effort

    // Inch mode: forward creep only, capped to a walking pace.
    if (this.tractionMode === 'inch') {
      if (c.reverser <= 0 || c.throttle <= 0) return 0
      if (this.physics.speed >= Train.INCH_SPEED_CAP_MS) return 0
      return effort
    }

    // Recover mode: reverse creep back into the stop zone after an overshoot.
    if (this.tractionMode === 'recover') {
      if (c.reverser >= 0 || c.throttle <= 0) return 0
      if (this.physics.speed <= -Train.INCH_SPEED_CAP_MS) return 0
      return effort
    }

    return 0
  }

  private computeDynamicBrakeForce(): number {
    const c = this.controls.state
    // EMUs use the brake lever for blended rheostatic/regenerative braking.
    let handle = c.dynamicBrake
    if (this.spec.type === 'electric' && c.trainBrake > 0) {
      handle = Math.max(handle, c.trainBrake)
    }
    if (handle <= 0) return 0
    const fade = clamp(Math.abs(this.physics.speed) / 2, 0, 1)
    return this.spec.dynamicBrakeEffortKN * KN_TO_N * handle * fade
  }

  getTelemetry(): TrainTelemetry {
    return {
      speedKmh: this.physics.speed * MS_TO_KMH,
      speedMs: this.physics.speed,
      distance: this.physics.distance,
      acceleration: this.physics.acceleration,
      wheelSlip: this.physics.wheelSlip,
      tractiveEffortKN: (this.tractiveEffortN / KN_TO_N) * this.controls.state.reverser,
      gradientPerMille: Math.sin(this.gradientRad) * 1000,
      power: this.powerUnit.getTelemetry(),
      brakes: this.brakes.getTelemetry(),
      autoBrake: this.autoBrake,
    }
  }

  get brakeEffort(): number {
    return this.brakes.effort
  }

  get locomotiveLengthMetres(): number {
    return this.spec.lengthMetres
  }

  restore(distance: number, speedMs: number): void {
    this.physics.restore(distance, speedMs)
  }
}
