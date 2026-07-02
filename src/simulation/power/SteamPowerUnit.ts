import { KW_TO_W, KN_TO_N, MS_TO_KMH } from '@/engine/constants'
import { clamp, clamp01, damp, lerp } from '@/engine/math'
import type { LocomotiveSpec, SteamSpec } from '@/data/types'
import type { ControlState } from '../Controls'
import type { IPowerUnit, PowerTelemetry } from './IPowerUnit'

const DEFAULT_STEAM: SteamSpec = {
  boilerPressureBar: 18,
  idlePressureBar: 11,
  criticalSpeedKmh: 48,
  waterCapacityLitres: 10000,
  coalCapacityKg: 10000,
  coalBurnKgPerHourMax: 2800,
  waterUseLitresPerHourMax: 18000,
  steamLagSeconds: 2.2,
  boilerNominalC: 185,
  boilerMaxC: 360,
}

/**
 * Steam locomotive model: boiler pressure, regulator lag, coal and water
 * consumption, and a speed-dependent tractive-effort curve typical of
 * reciprocating steam.
 */
export class SteamPowerUnit implements IPowerUnit {
  readonly type = 'steam'
  private readonly steam: SteamSpec
  private readonly maxPowerW: number
  private readonly maxTeN: number

  private boilerPressure: number
  private regulator = 0
  private temperatureC: number
  private waterLitres: number
  private coalKg: number
  private chuffHz = 0

  constructor(spec: LocomotiveSpec) {
    this.steam = spec.steam ?? DEFAULT_STEAM
    this.maxPowerW = spec.maxPowerKW * KW_TO_W
    this.maxTeN = spec.maxTractiveEffortKN * KN_TO_N
    this.boilerPressure = this.steam.idlePressureBar
    this.temperatureC = this.steam.boilerNominalC
    this.waterLitres = this.steam.waterCapacityLitres
    this.coalKg = this.steam.coalCapacityKg
  }

  update(dt: number, controls: ControlState, speedMs: number): void {
    const fired = controls.engineRunning && controls.masterKey
    if (!fired) {
      this.boilerPressure = damp(this.boilerPressure, 0, 0.35, dt)
      this.regulator = damp(this.regulator, 0, 4, dt)
      this.temperatureC = damp(this.temperatureC, 35, 0.08, dt)
      this.chuffHz = damp(this.chuffHz, 0, 8, dt)
      return
    }

    const demand = clamp01(controls.throttle) * Math.abs(controls.reverser)
    const targetPressure = lerp(
      this.steam.idlePressureBar,
      this.steam.boilerPressureBar,
      0.85 - demand * 0.25,
    )
    this.boilerPressure = damp(this.boilerPressure, targetPressure, 1 / this.steam.steamLagSeconds, dt)
    if (demand > 0.35) {
      this.boilerPressure = Math.max(
        this.steam.idlePressureBar,
        this.boilerPressure - demand * dt * 0.55,
      )
    }

    this.regulator = damp(this.regulator, controls.throttle, 1 / this.steam.steamLagSeconds, dt)

    const load = this.computeLoad(controls)
    if (load > 0 && this.coalKg > 0 && this.waterLitres > 0) {
      const coalBurn = lerp(this.steam.coalBurnKgPerHourMax * 0.12, this.steam.coalBurnKgPerHourMax, load)
      const waterUse = lerp(this.steam.waterUseLitresPerHourMax * 0.1, this.steam.waterUseLitresPerHourMax, load)
      this.coalKg = Math.max(0, this.coalKg - (coalBurn / 3600) * dt)
      this.waterLitres = Math.max(0, this.waterLitres - (waterUse / 3600) * dt)
    }

    const targetTemp = lerp(this.steam.boilerNominalC, this.steam.boilerMaxC, load)
    this.temperatureC = damp(this.temperatureC, targetTemp, 0.06, dt)

    const speed = Math.abs(speedMs)
    const targetChuff = speed > 0.4 ? clamp(speed * 1.8, 0.8, 7) * (0.35 + load * 0.65) : 0
    this.chuffHz = damp(this.chuffHz, targetChuff, 6, dt)
  }

  private computeLoad(controls: ControlState): number {
    if (!controls.engineRunning || !controls.masterKey) return 0
    if (this.coalKg <= 0 || this.waterLitres <= 0) return 0
    const pressureFactor = clamp01(this.boilerPressure / this.steam.boilerPressureBar)
    return clamp01(this.regulator * pressureFactor * Math.abs(controls.reverser))
  }

  getTractiveEffort(controls: ControlState, speedMs: number): number {
    const load = this.computeLoad(controls)
    if (load <= 0) return 0

    const speedKmh = Math.abs(speedMs) * MS_TO_KMH
    const speedFactor = 1 / (1 + Math.pow(speedKmh / this.steam.criticalSpeedKmh, 2))
    const adhesive = this.maxTeN * load * speedFactor

    const speed = Math.max(Math.abs(speedMs), 0.5)
    const powerLimited = (this.maxPowerW * load) / speed
    return Math.min(adhesive, powerLimited)
  }

  getTelemetry(): PowerTelemetry {
    const load = clamp01(this.regulator * (this.boilerPressure / this.steam.boilerPressureBar))
    return {
      rpm: this.chuffHz * 60,
      load,
      temperatureC: this.temperatureC,
      fuelLitres: this.coalKg,
      fuelFraction: this.coalKg / this.steam.coalCapacityKg,
      online: this.boilerPressure > this.steam.idlePressureBar * 0.6 && this.coalKg > 0,
    }
  }
}
