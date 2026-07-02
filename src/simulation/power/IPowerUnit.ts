import type { ControlState } from '../Controls'

/** Telemetry exposed by any power unit for gauges, audio and debug. */
export interface PowerTelemetry {
  /** Engine speed (RPM) — meaningful for diesel/steam; 0 for pure electric. */
  rpm: number
  /** Normalised current load 0..1. */
  load: number
  /** Coolant / component temperature in degrees Celsius. */
  temperatureC: number
  /** Remaining fuel in litres (NaN if not applicable). */
  fuelLitres: number
  /** Remaining fuel as a fraction 0..1 (NaN if not applicable). */
  fuelFraction: number
  /** Whether the prime mover is actually producing power. */
  online: boolean
}

/**
 * Common contract for diesel, electric and steam power units. The simulation
 * only depends on this interface, so power types are fully interchangeable and
 * new ones can be added without touching the physics or train code.
 */
export interface IPowerUnit {
  readonly type: string
  /** Advance internal state (RPM, temperature, fuel, spool-up, etc.). */
  update(dt: number, controls: ControlState, speedMs: number): void
  /**
   * Maximum tractive effort (N) currently available at the wheels given the
   * throttle setting and speed. Sign/direction is applied by the caller.
   */
  getTractiveEffort(controls: ControlState, speedMs: number): number
  getTelemetry(): PowerTelemetry
}
