import { KW_TO_W, KN_TO_N } from '@/engine/constants'
import { clamp01, damp, lerp, remap } from '@/engine/math'
import type { DieselSpec, LocomotiveSpec } from '@/data/types'
import type { ControlState } from '../Controls'
import type { IPowerUnit, PowerTelemetry } from './IPowerUnit'

const DEFAULT_DIESEL: DieselSpec = {
  idleRpm: 320,
  maxRpm: 900,
  turboLagSeconds: 1.8,
  fuelCapacityLitres: 4000,
  fuelBurnLitresPerHourMax: 220,
  coolingNominalC: 75,
  coolingMaxC: 110,
}

/**
 * Diesel-electric prime mover model: engine RPM tracks the throttle through a
 * turbo-lag time constant, fuel burns with load, and coolant temperature rises
 * under sustained power. Tractive effort is the lesser of the adhesive maximum
 * and the power-limited hyperbola P/v.
 */
export class DieselPowerUnit implements IPowerUnit {
  readonly type = 'diesel'
  private readonly diesel: DieselSpec
  private readonly maxPowerW: number
  private readonly maxTeN: number

  private rpm: number
  private turbo = 0
  private temperatureC: number
  private fuelLitres: number

  constructor(spec: LocomotiveSpec) {
    this.diesel = spec.diesel ?? DEFAULT_DIESEL
    this.maxPowerW = spec.maxPowerKW * KW_TO_W
    this.maxTeN = spec.maxTractiveEffortKN * KN_TO_N
    this.rpm = this.diesel.idleRpm
    this.temperatureC = this.diesel.coolingNominalC
    this.fuelLitres = this.diesel.fuelCapacityLitres
  }

  update(dt: number, controls: ControlState, _speedMs: number): void {
    const online = controls.engineRunning && controls.masterKey
    const targetRpm = online
      ? lerp(this.diesel.idleRpm, this.diesel.maxRpm, controls.throttle)
      : 0

    // RPM responds quickly; turbo boost lags behind, modelling spool-up.
    this.rpm = damp(this.rpm, targetRpm, 3.5, dt)
    const targetTurbo = online ? controls.throttle : 0
    this.turbo = damp(this.turbo, targetTurbo, 1 / this.diesel.turboLagSeconds, dt)

    const load = online ? this.computeLoad(controls) : 0

    // Fuel burn scales with idle baseline + load.
    if (online) {
      const burnPerHour = lerp(this.diesel.fuelBurnLitresPerHourMax * 0.08, this.diesel.fuelBurnLitresPerHourMax, load)
      this.fuelLitres = Math.max(0, this.fuelLitres - (burnPerHour / 3600) * dt)
    }

    // Temperature drifts toward an equilibrium set by current load.
    const targetTemp = online
      ? remap(load, 0, 1, this.diesel.coolingNominalC, this.diesel.coolingMaxC)
      : 20
    this.temperatureC = damp(this.temperatureC, targetTemp, 0.05, dt)
  }

  private computeLoad(controls: ControlState): number {
    if (this.fuelLitres <= 0) return 0
    // Available power is gated by turbo spool, so it ramps in over the lag time.
    return clamp01(controls.throttle * lerp(0.4, 1, this.turbo))
  }

  getTractiveEffort(controls: ControlState, speedMs: number): number {
    if (!controls.engineRunning || !controls.masterKey || this.fuelLitres <= 0) return 0
    const load = this.computeLoad(controls)
    const availablePower = this.maxPowerW * load
    const speed = Math.max(Math.abs(speedMs), 0.5)
    const powerLimited = availablePower / speed
    return Math.min(this.maxTeN * load, powerLimited)
  }

  getTelemetry(): PowerTelemetry {
    return {
      rpm: this.rpm,
      load: this.turbo,
      temperatureC: this.temperatureC,
      fuelLitres: this.fuelLitres,
      fuelFraction: this.fuelLitres / this.diesel.fuelCapacityLitres,
      online: this.rpm > this.diesel.idleRpm * 0.5,
    }
  }
}
