import { KW_TO_W, KN_TO_N } from '@/engine/constants'
import { clamp01, damp, lerp } from '@/engine/math'
import type { ElectricSpec, LocomotiveSpec } from '@/data/types'
import type { ControlState } from '../Controls'
import type { IPowerUnit, PowerTelemetry } from './IPowerUnit'

const DEFAULT_ELECTRIC: ElectricSpec = {
  lineVoltageKV: 3,
  requiresPantograph: true,
}

/**
 * AC/DC electric traction model. Power responds quickly (no spool-up lag);
 * tractive effort is limited by both adhesive maximum and the P/v hyperbola.
 * Motor speed telemetry is derived from road speed for cab gauges/audio.
 */
export class ElectricPowerUnit implements IPowerUnit {
  readonly type = 'electric'
  private readonly electric: ElectricSpec
  private readonly maxPowerW: number
  private readonly maxTeN: number
  private readonly maxSpeedMs: number

  private load = 0
  private motorHz = 0

  constructor(spec: LocomotiveSpec) {
    this.electric = spec.electric ?? DEFAULT_ELECTRIC
    this.maxPowerW = spec.maxPowerKW * KW_TO_W
    this.maxTeN = spec.maxTractiveEffortKN * KN_TO_N
    this.maxSpeedMs = (spec.maxSpeedKmh / 3.6)
  }

  private isEnergized(controls: ControlState): boolean {
    if (!controls.masterKey || !controls.engineRunning) return false
    if (this.electric.requiresPantograph && !controls.pantograph) return false
    return true
  }

  update(dt: number, controls: ControlState, speedMs: number): void {
    const online = this.isEnergized(controls)
    const targetLoad = online ? controls.throttle : 0
    this.load = damp(this.load, targetLoad, 8, dt)

    const speed = Math.abs(speedMs)
    const targetHz = online ? lerp(0, 90, speed / this.maxSpeedMs) * (0.3 + this.load * 0.7) : 0
    this.motorHz = damp(this.motorHz, targetHz, 6, dt)
  }

  getTractiveEffort(controls: ControlState, speedMs: number): number {
    if (!this.isEnergized(controls)) return 0
    const load = clamp01(this.load)
    const availablePower = this.maxPowerW * load
    const speed = Math.max(Math.abs(speedMs), 0.5)
    const powerLimited = availablePower / speed
    return Math.min(this.maxTeN * load, powerLimited)
  }

  getTelemetry(): PowerTelemetry {
    return {
      rpm: this.motorHz * 40,
      load: this.load,
      temperatureC: 35 + this.load * 25,
      fuelLitres: NaN,
      fuelFraction: NaN,
      online: this.load > 0.02,
    }
  }
}
